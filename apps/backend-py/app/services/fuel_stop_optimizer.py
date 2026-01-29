"""Fuel Stop Optimizer for determining optimal fuel stop locations.

Optimizes fuel stop placement based on range, price, and route constraints.
"""

import logging
from dataclasses import dataclass
from typing import List

logger = logging.getLogger(__name__)


@dataclass
class FuelStopLocation:
    """Represents a fuel station location."""

    stop_id: str
    name: str
    lat: float
    lon: float
    price_per_gallon: float
    distance_from_point: float  # Miles from reference point
    last_price_update: str  # Timestamp string


@dataclass
class FuelStopRecommendation:
    """Recommendation for fuel stop placement."""

    should_fuel: bool
    fuel_stop: FuelStopLocation | None
    gallons_needed: float
    estimated_cost: float
    reason: str


class FuelStopOptimizer:
    """
    Service for optimizing fuel stop placement.

    MVP: Simple range-based logic with static fuel prices.
    Future: Dynamic pricing optimization, multi-stop fuel planning.
    """

    # Fuel thresholds
    LOW_FUEL_THRESHOLD = 0.25  # Fuel at 25% capacity
    OPTIMAL_FUEL_BUFFER = 0.20  # Keep 20% buffer

    def __init__(self):
        """Initialize with fuel station database."""
        self.fuel_stations_db = self._load_fuel_stations_database()

    def _load_fuel_stations_database(self) -> List[dict]:
        """
        Load fuel station database.

        MVP: Hardcoded sample data.
        Future: Load from GasBuddy API or database.
        """
        return [
            {
                "stop_id": "fuel_i80_exit_120",
                "name": "Pilot Fuel - I-80 Exit 120",
                "lat": 41.2500,
                "lon": -95.9000,
                "price_per_gallon": 3.89,
                "last_price_update": "2025-01-20",
            },
            {
                "stop_id": "fuel_i80_exit_140",
                "name": "Love's Diesel - I-80 Exit 140",
                "lat": 41.1000,
                "lon": -96.1000,
                "price_per_gallon": 3.95,
                "last_price_update": "2025-01-20",
            },
            {
                "stop_id": "fuel_i5_exit_198",
                "name": "TA Fuel - I-5 Exit 198",
                "lat": 34.0400,
                "lon": -118.2500,
                "price_per_gallon": 4.15,
                "last_price_update": "2025-01-20",
            },
            {
                "stop_id": "fuel_i95_exit_48",
                "name": "Flying J Diesel - I-95 Exit 48",
                "lat": 39.7300,
                "lon": -104.9800,
                "price_per_gallon": 3.79,
                "last_price_update": "2025-01-20",
            },
        ]

    def should_refuel(
        self,
        current_fuel_gallons: float,
        fuel_capacity_gallons: float,
        remaining_distance_miles: float,
        mpg: float,
    ) -> FuelStopRecommendation:
        """
        Determine if vehicle should refuel based on current state.

        Args:
            current_fuel_gallons: Current fuel level
            fuel_capacity_gallons: Tank capacity
            remaining_distance_miles: Distance to destination
            mpg: Miles per gallon

        Returns:
            FuelStopRecommendation
        """
        # Calculate fuel needed for remaining distance
        fuel_needed_for_distance = remaining_distance_miles / mpg

        # Calculate current fuel percentage
        fuel_percentage = current_fuel_gallons / fuel_capacity_gallons

        # Calculate if current fuel is sufficient (with buffer)
        fuel_needed_with_buffer = fuel_needed_for_distance * (1 + self.OPTIMAL_FUEL_BUFFER)

        if current_fuel_gallons >= fuel_needed_with_buffer:
            # Sufficient fuel
            return FuelStopRecommendation(
                should_fuel=False,
                fuel_stop=None,
                gallons_needed=0.0,
                estimated_cost=0.0,
                reason=f"Sufficient fuel: {current_fuel_gallons:.1f} gallons available, "
                f"need {fuel_needed_for_distance:.1f} gallons "
                f"(+{self.OPTIMAL_FUEL_BUFFER*100:.0f}% buffer)",
            )

        if fuel_percentage < self.LOW_FUEL_THRESHOLD:
            # Critical: Fuel below threshold
            gallons_to_fill = fuel_capacity_gallons - current_fuel_gallons

            return FuelStopRecommendation(
                should_fuel=True,
                fuel_stop=None,  # Will be populated by find_fuel_stop method
                gallons_needed=gallons_to_fill,
                estimated_cost=0.0,  # Will be calculated with fuel stop
                reason=f"CRITICAL: Fuel at {fuel_percentage*100:.1f}% "
                f"(threshold: {self.LOW_FUEL_THRESHOLD*100:.0f}%). "
                f"Need {gallons_to_fill:.1f} gallons.",
            )

        # Not critical but insufficient for remaining distance
        gallons_to_fill = fuel_needed_with_buffer - current_fuel_gallons

        return FuelStopRecommendation(
            should_fuel=True,
            fuel_stop=None,
            gallons_needed=gallons_to_fill,
            estimated_cost=0.0,
            reason=f"Insufficient fuel for remaining distance. "
            f"Current: {current_fuel_gallons:.1f} gal, "
            f"Need: {fuel_needed_with_buffer:.1f} gal",
        )

    def find_fuel_stop_near_point(
        self, lat: float, lon: float, radius_miles: float = 30
    ) -> List[FuelStopLocation]:
        """
        Find fuel stations within radius of a point.

        Args:
            lat: Latitude
            lon: Longitude
            radius_miles: Search radius

        Returns:
            List of FuelStopLocation objects sorted by price
        """
        from app.utils.distance_calculator import haversine_distance

        nearby_stations = []

        for station in self.fuel_stations_db:
            distance = haversine_distance(lat, lon, station["lat"], station["lon"])

            if distance <= radius_miles:
                nearby_stations.append(
                    FuelStopLocation(
                        stop_id=station["stop_id"],
                        name=station["name"],
                        lat=station["lat"],
                        lon=station["lon"],
                        price_per_gallon=station["price_per_gallon"],
                        distance_from_point=distance,
                        last_price_update=station["last_price_update"],
                    )
                )

        # Sort by price (cheapest first)
        nearby_stations.sort(key=lambda x: x.price_per_gallon)

        logger.info(
            f"Found {len(nearby_stations)} fuel stations within {radius_miles} miles"
        )

        return nearby_stations

    def optimize_fuel_stop(
        self,
        current_lat: float,
        current_lon: float,
        destination_lat: float,
        destination_lon: float,
        current_fuel: float,
        fuel_capacity: float,
        mpg: float,
    ) -> FuelStopRecommendation:
        """
        Find optimal fuel stop along route.

        Args:
            current_lat, current_lon: Current location
            destination_lat, destination_lon: Destination
            current_fuel: Current fuel in gallons
            fuel_capacity: Tank capacity
            mpg: Miles per gallon

        Returns:
            FuelStopRecommendation with best fuel stop
        """
        from app.utils.distance_calculator import haversine_distance

        # Calculate remaining distance
        remaining_distance = haversine_distance(
            current_lat, current_lon, destination_lat, destination_lon
        )

        # Check if refuel needed
        recommendation = self.should_refuel(
            current_fuel, fuel_capacity, remaining_distance, mpg
        )

        if not recommendation.should_fuel:
            return recommendation

        # Find fuel stops near current location
        fuel_stops = self.find_fuel_stop_near_point(
            current_lat, current_lon, radius_miles=30
        )

        if not fuel_stops:
            logger.warning("No fuel stations found near current location")
            recommendation.reason += " WARNING: No fuel stations found nearby."
            return recommendation

        # Select cheapest fuel stop
        best_stop = fuel_stops[0]

        # Calculate cost
        estimated_cost = recommendation.gallons_needed * best_stop.price_per_gallon

        recommendation.fuel_stop = best_stop
        recommendation.estimated_cost = estimated_cost
        recommendation.reason += (
            f" Recommended: {best_stop.name} "
            f"at ${best_stop.price_per_gallon:.2f}/gal "
            f"({best_stop.distance_from_point:.1f} miles away). "
            f"Total cost: ${estimated_cost:.2f}"
        )

        logger.info(
            f"Fuel stop recommended: {best_stop.name}, "
            f"{recommendation.gallons_needed:.1f} gal, ${estimated_cost:.2f}"
        )

        return recommendation
