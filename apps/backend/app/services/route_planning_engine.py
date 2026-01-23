"""Route Planning Engine - Main orchestration for route optimization.

Coordinates TSP optimization, HOS simulation, rest stop insertion, and fuel stop optimization.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import List

from app.services.fuel_stop_optimizer import FuelStopOptimizer
from app.services.hos_rule_engine import HOSRuleEngine, HOSState
from app.services.prediction_engine import PredictionEngine
from app.services.rest_optimization import RestOptimizationEngine
from app.services.rest_stop_finder import RestStopFinder
from app.services.tsp_optimizer import Stop as TSPStop
from app.services.tsp_optimizer import TSPOptimizer
from app.utils.distance_calculator import calculate_distance_matrix, estimate_drive_time

logger = logging.getLogger(__name__)


@dataclass
class RouteSegment:
    """Represents a segment in the route plan."""

    sequence_order: int
    segment_type: str  # drive, rest, fuel, dock
    from_location: str | None
    to_location: str | None
    from_lat: float | None
    from_lon: float | None
    to_lat: float | None
    to_lon: float | None
    distance_miles: float | None
    drive_time_hours: float | None
    rest_type: str | None  # full_rest, partial_rest, break
    rest_duration_hours: float | None
    rest_reason: str | None
    fuel_gallons: float | None
    fuel_cost_estimate: float | None
    fuel_station_name: str | None
    dock_duration_hours: float | None
    customer_name: str | None
    hos_state_after: dict | None
    estimated_arrival: datetime | None
    estimated_departure: datetime | None


@dataclass
class RouteOptimizationResult:
    """Result of route optimization."""

    optimized_sequence: List[str]  # Stop IDs in order
    segments: List[RouteSegment]
    total_distance_miles: float
    total_drive_time_hours: float
    total_on_duty_time_hours: float
    total_cost_estimate: float
    rest_stops: List[dict]
    fuel_stops: List[dict]
    is_feasible: bool
    feasibility_issues: List[str]
    compliance_report: dict


@dataclass
class RoutePlanInput:
    """Input for route planning."""

    driver_state: dict  # HOS state
    vehicle_state: dict  # Fuel capacity, current fuel, MPG
    stops: List[dict]  # Stop details
    optimization_priority: str = "minimize_time"


class RoutePlanningEngine:
    """
    Main Route Planning Engine.

    Orchestrates:
    1. TSP optimization (stop sequencing)
    2. HOS simulation and compliance checking
    3. Rest stop insertion when needed
    4. Fuel stop insertion when needed
    5. Feasibility validation
    """

    def __init__(self):
        """Initialize route planning engine with sub-services."""
        self.hos_engine = HOSRuleEngine()
        self.prediction_engine = PredictionEngine()
        self.rest_optimization = RestOptimizationEngine()
        self.rest_stop_finder = RestStopFinder()
        self.fuel_optimizer = FuelStopOptimizer()

    def plan_route(self, input_data: RoutePlanInput) -> RouteOptimizationResult:
        """
        Generate optimized route plan.

        Steps:
        1. Calculate distance matrix
        2. Optimize stop sequence (TSP)
        3. Simulate route segment-by-segment:
           - Track HOS consumption
           - Insert rest stops where needed
           - Insert fuel stops when low
        4. Validate feasibility
        5. Return complete route plan

        Args:
            input_data: RoutePlanInput with driver, vehicle, stops

        Returns:
            RouteOptimizationResult
        """
        logger.info(f"Starting route planning for {len(input_data.stops)} stops")

        # Step 1: Calculate distance matrix
        distance_matrix = calculate_distance_matrix(input_data.stops)

        # Step 2: Optimize stop sequence with TSP
        tsp_stops = self._convert_to_tsp_stops(input_data.stops)
        tsp_optimizer = TSPOptimizer(distance_matrix)
        tsp_result = tsp_optimizer.optimize(tsp_stops, input_data.optimization_priority)

        logger.info(
            f"TSP optimization complete: {tsp_result.total_distance:.1f} miles, "
            f"sequence: {tsp_result.optimized_sequence}"
        )

        # Step 3: Simulate route segment-by-segment
        simulation_result = self._simulate_route_execution(
            tsp_result, input_data, distance_matrix
        )

        # Step 4: Build final result
        result = RouteOptimizationResult(
            optimized_sequence=simulation_result["sequence"],
            segments=simulation_result["segments"],
            total_distance_miles=simulation_result["total_distance"],
            total_drive_time_hours=simulation_result["total_drive_time"],
            total_on_duty_time_hours=simulation_result["total_on_duty_time"],
            total_cost_estimate=simulation_result["total_cost"],
            rest_stops=simulation_result["rest_stops"],
            fuel_stops=simulation_result["fuel_stops"],
            is_feasible=simulation_result["is_feasible"],
            feasibility_issues=simulation_result["feasibility_issues"],
            compliance_report=simulation_result["compliance_report"],
        )

        logger.info(
            f"Route planning complete: "
            f"Feasible={result.is_feasible}, "
            f"Total time={result.total_drive_time_hours:.1f}h, "
            f"Rest stops={len(result.rest_stops)}, "
            f"Fuel stops={len(result.fuel_stops)}"
        )

        return result

    def _convert_to_tsp_stops(self, stops: List[dict]) -> List[TSPStop]:
        """Convert input stops to TSP Stop objects."""
        tsp_stops = []
        for stop in stops:
            tsp_stops.append(
                TSPStop(
                    stop_id=stop["stop_id"],
                    name=stop["name"],
                    lat=stop["lat"],
                    lon=stop["lon"],
                    is_origin=stop.get("is_origin", False),
                    is_destination=stop.get("is_destination", False),
                    earliest_arrival=stop.get("earliest_arrival"),
                    latest_arrival=stop.get("latest_arrival"),
                    estimated_dock_hours=stop.get("estimated_dock_hours", 0.0),
                )
            )
        return tsp_stops

    def _simulate_route_execution(
        self, tsp_result, input_data: RoutePlanInput, distance_matrix: dict
    ) -> dict:
        """
        Simulate route execution segment by segment.

        Tracks HOS consumption, inserts rest/fuel stops as needed.
        """
        segments = []
        rest_stops = []
        fuel_stops = []
        feasibility_issues = []

        # Initialize state
        current_hos = HOSState(
            hours_driven=input_data.driver_state["hours_driven"],
            on_duty_time=input_data.driver_state["on_duty_time"],
            hours_since_break=input_data.driver_state["hours_since_break"],
        )

        current_fuel = input_data.vehicle_state["current_fuel_gallons"]
        fuel_capacity = input_data.vehicle_state["fuel_capacity_gallons"]
        mpg = input_data.vehicle_state["mpg"]

        current_time = datetime.now(timezone.utc)
        sequence_order = 1

        # Totals
        total_distance = 0.0
        total_drive_time = 0.0
        total_on_duty_time = current_hos.on_duty_time
        total_cost = 0.0

        # Create stop lookup
        stop_lookup = {s["stop_id"]: s for s in input_data.stops}

        # Simulate each segment
        for i in range(len(tsp_result.optimized_sequence) - 1):
            from_stop_id = tsp_result.optimized_sequence[i]
            to_stop_id = tsp_result.optimized_sequence[i + 1]

            from_stop = stop_lookup[from_stop_id]
            to_stop = stop_lookup[to_stop_id]

            # Get segment distance and time
            distance = distance_matrix.get((from_stop_id, to_stop_id), 0.0)
            drive_time = estimate_drive_time(distance, "highway")

            # Check if HOS allows this segment
            if current_hos.hours_driven + drive_time > 11:
                # HOS violation: Need rest stop
                logger.info(
                    f"HOS limit reached before {to_stop_id}. Inserting rest stop."
                )

                # Find rest stop
                rest_location = self.rest_stop_finder.find_rest_stop_along_route(
                    from_stop["lat"],
                    from_stop["lon"],
                    to_stop["lat"],
                    to_stop["lon"],
                )

                if rest_location:
                    # Insert rest stop segment
                    rest_segment = RouteSegment(
                        sequence_order=sequence_order,
                        segment_type="rest",
                        from_location=None,
                        to_location=rest_location.name,
                        from_lat=from_stop["lat"],
                        from_lon=from_stop["lon"],
                        to_lat=rest_location.lat,
                        to_lon=rest_location.lon,
                        distance_miles=None,
                        drive_time_hours=None,
                        rest_type="full_rest",
                        rest_duration_hours=10.0,
                        rest_reason="HOS 11h drive limit reached",
                        fuel_gallons=None,
                        fuel_cost_estimate=None,
                        fuel_station_name=None,
                        dock_duration_hours=None,
                        customer_name=None,
                        hos_state_after={
                            "hours_driven": 0.0,
                            "on_duty_time": 0.0,
                            "hours_since_break": 0.0,
                        },
                        estimated_arrival=current_time,
                        estimated_departure=current_time + timedelta(hours=10),
                    )

                    segments.append(rest_segment)
                    rest_stops.append(
                        {
                            "location": rest_location.name,
                            "type": "full_rest",
                            "duration_hours": 10.0,
                            "reason": "HOS 11h drive limit reached",
                        }
                    )

                    # Reset HOS after rest
                    current_hos = HOSState(
                        hours_driven=0.0, on_duty_time=0.0, hours_since_break=0.0
                    )
                    current_time += timedelta(hours=10)
                    sequence_order += 1
                else:
                    logger.warning("No rest stop found, route may be infeasible")
                    feasibility_issues.append(
                        "HOS limit reached but no rest stop found"
                    )

            # Check fuel level
            fuel_needed = distance / mpg
            if current_fuel < fuel_needed * 1.2:  # 20% buffer
                # Need fuel stop
                logger.info(f"Fuel low before {to_stop_id}. Inserting fuel stop.")

                fuel_recommendation = self.fuel_optimizer.optimize_fuel_stop(
                    from_stop["lat"],
                    from_stop["lon"],
                    to_stop["lat"],
                    to_stop["lon"],
                    current_fuel,
                    fuel_capacity,
                    mpg,
                )

                if fuel_recommendation.fuel_stop:
                    fuel_segment = RouteSegment(
                        sequence_order=sequence_order,
                        segment_type="fuel",
                        from_location=None,
                        to_location=fuel_recommendation.fuel_stop.name,
                        from_lat=from_stop["lat"],
                        from_lon=from_stop["lon"],
                        to_lat=fuel_recommendation.fuel_stop.lat,
                        to_lon=fuel_recommendation.fuel_stop.lon,
                        distance_miles=None,
                        drive_time_hours=0.25,  # 15 minutes
                        rest_type=None,
                        rest_duration_hours=None,
                        rest_reason=None,
                        fuel_gallons=fuel_recommendation.gallons_needed,
                        fuel_cost_estimate=fuel_recommendation.estimated_cost,
                        fuel_station_name=fuel_recommendation.fuel_stop.name,
                        dock_duration_hours=None,
                        customer_name=None,
                        hos_state_after={
                            "hours_driven": current_hos.hours_driven,
                            "on_duty_time": current_hos.on_duty_time + 0.25,
                            "hours_since_break": current_hos.hours_since_break + 0.25,
                        },
                        estimated_arrival=current_time,
                        estimated_departure=current_time + timedelta(hours=0.25),
                    )

                    segments.append(fuel_segment)
                    fuel_stops.append(
                        {
                            "location": fuel_recommendation.fuel_stop.name,
                            "gallons": fuel_recommendation.gallons_needed,
                            "cost": fuel_recommendation.estimated_cost,
                        }
                    )

                    current_fuel = fuel_capacity  # Assume full tank
                    current_hos.on_duty_time += 0.25
                    current_time += timedelta(hours=0.25)
                    total_on_duty_time += 0.25
                    total_cost += fuel_recommendation.estimated_cost
                    sequence_order += 1

            # Add drive segment
            drive_segment = RouteSegment(
                sequence_order=sequence_order,
                segment_type="drive",
                from_location=from_stop["name"],
                to_location=to_stop["name"],
                from_lat=from_stop["lat"],
                from_lon=from_stop["lon"],
                to_lat=to_stop["lat"],
                to_lon=to_stop["lon"],
                distance_miles=distance,
                drive_time_hours=drive_time,
                rest_type=None,
                rest_duration_hours=None,
                rest_reason=None,
                fuel_gallons=None,
                fuel_cost_estimate=None,
                fuel_station_name=None,
                dock_duration_hours=None,
                customer_name=to_stop.get("customer_name"),
                hos_state_after={
                    "hours_driven": current_hos.hours_driven + drive_time,
                    "on_duty_time": current_hos.on_duty_time + drive_time,
                    "hours_since_break": current_hos.hours_since_break + drive_time,
                },
                estimated_arrival=current_time + timedelta(hours=drive_time),
                estimated_departure=None,
            )

            segments.append(drive_segment)

            # Update state
            current_hos.hours_driven += drive_time
            current_hos.on_duty_time += drive_time
            current_hos.hours_since_break += drive_time
            current_fuel -= fuel_needed
            current_time += timedelta(hours=drive_time)
            total_distance += distance
            total_drive_time += drive_time
            total_on_duty_time += drive_time
            sequence_order += 1

            # Add dock segment if stop has dock time
            if to_stop.get("estimated_dock_hours", 0) > 0:
                dock_time = to_stop["estimated_dock_hours"]

                dock_segment = RouteSegment(
                    sequence_order=sequence_order,
                    segment_type="dock",
                    from_location=None,
                    to_location=to_stop["name"],
                    from_lat=to_stop["lat"],
                    from_lon=to_stop["lon"],
                    to_lat=None,
                    to_lon=None,
                    distance_miles=None,
                    drive_time_hours=None,
                    rest_type=None,
                    rest_duration_hours=None,
                    rest_reason=None,
                    fuel_gallons=None,
                    fuel_cost_estimate=None,
                    fuel_station_name=None,
                    dock_duration_hours=dock_time,
                    customer_name=to_stop.get("customer_name"),
                    hos_state_after={
                        "hours_driven": current_hos.hours_driven,
                        "on_duty_time": current_hos.on_duty_time + dock_time,
                        "hours_since_break": current_hos.hours_since_break + dock_time,
                    },
                    estimated_arrival=current_time,
                    estimated_departure=current_time + timedelta(hours=dock_time),
                )

                segments.append(dock_segment)
                current_hos.on_duty_time += dock_time
                current_time += timedelta(hours=dock_time)
                total_on_duty_time += dock_time
                sequence_order += 1

        # Check feasibility
        is_feasible = len(feasibility_issues) == 0

        # Compliance report
        compliance_report = {
            "max_drive_hours_used": current_hos.hours_driven,
            "max_duty_hours_used": current_hos.on_duty_time,
            "breaks_required": int(current_hos.hours_since_break / 8),
            "breaks_planned": len([s for s in segments if s.segment_type == "rest"]),
            "violations": feasibility_issues,
        }

        return {
            "sequence": tsp_result.optimized_sequence,
            "segments": segments,
            "total_distance": total_distance,
            "total_drive_time": total_drive_time,
            "total_on_duty_time": total_on_duty_time,
            "total_cost": total_cost,
            "rest_stops": rest_stops,
            "fuel_stops": fuel_stops,
            "is_feasible": is_feasible,
            "feasibility_issues": feasibility_issues,
            "compliance_report": compliance_report,
        }
