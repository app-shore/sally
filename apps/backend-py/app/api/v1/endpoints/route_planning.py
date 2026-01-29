"""API endpoints for route planning and optimization."""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_db
from app.models import Driver, RoutePlan, RoutePlanUpdate, RouteSegment, Vehicle
from app.repositories.route_plan_repository import RoutePlanRepository
from app.api.v1.schemas.route_requests import (
    RoutePlanningRequest,
    RouteUpdateRequest,
)
from app.api.v1.schemas.route_responses import (
    ComplianceReportResponse,
    FuelStopInfo,
    RestStopInfo,
    RouteAlert,
    RoutePlanningResponse,
    RouteSegmentResponse,
    RouteSummary,
    RouteUpdateResponse,
)
from app.services.route_planning_engine import (
    RoutePlanInput,
    RoutePlanningEngine,
)
from app.utils.data_sources import DEFAULT_MVP_SOURCES, format_data_source_badge

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/route-planning", tags=["route-planning"])


@router.post(
    "/optimize",
    response_model=RoutePlanningResponse,
    status_code=status.HTTP_200_OK,
    summary="Optimize route with multiple stops",
    description="Generate optimized route plan with stop sequencing, rest stops, and fuel stops",
)
def optimize_route(request: RoutePlanningRequest, db: Session = Depends(get_db)):
    """
    Optimize route for a driver with multiple stops.

    This endpoint:
    1. Sequences stops optimally (TSP)
    2. Simulates HOS consumption
    3. Inserts rest stops where needed
    4. Inserts fuel stops when low
    5. Returns complete route plan with compliance report
    """
    try:
        logger.info(
            f"Route optimization request for driver {request.driver_id}, "
            f"{len(request.stops)} stops"
        )

        # Convert request to engine input
        engine_input = RoutePlanInput(
            driver_state={
                "hours_driven": request.driver_state.hours_driven,
                "on_duty_time": request.driver_state.on_duty_time,
                "hours_since_break": request.driver_state.hours_since_break,
            },
            vehicle_state={
                "fuel_capacity_gallons": request.vehicle_state.fuel_capacity_gallons,
                "current_fuel_gallons": request.vehicle_state.current_fuel_gallons,
                "mpg": request.vehicle_state.mpg,
            },
            stops=[
                {
                    "stop_id": stop.stop_id,
                    "name": stop.name,
                    "lat": stop.lat,
                    "lon": stop.lon,
                    "location_type": stop.location_type,
                    "is_origin": stop.is_origin,
                    "is_destination": stop.is_destination,
                    "estimated_dock_hours": stop.estimated_dock_hours,
                    "customer_name": stop.customer_name,
                }
                for stop in request.stops
            ],
            optimization_priority=request.optimization_priority,
        )

        # Run route planning engine
        engine = RoutePlanningEngine()
        result = engine.plan_route(engine_input)

        # Generate plan ID
        plan_id = f"plan_{uuid.uuid4().hex[:12]}"

        # Save to database
        try:
            repo = RoutePlanRepository(db)

            # Get driver and vehicle database IDs
            driver = db.query(Driver).filter(Driver.driver_id == request.driver_id).first()
            vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == request.vehicle_id).first()

            # Create driver/vehicle if not exists (for testing)
            if not driver:
                driver = Driver(
                    driver_id=request.driver_id,
                    name=f"Driver {request.driver_id}",
                    hours_driven_today=request.driver_state.hours_driven,
                    on_duty_time_today=request.driver_state.on_duty_time,
                    hours_since_break=request.driver_state.hours_since_break,
                )
                db.add(driver)
                db.flush()

            if not vehicle:
                vehicle = Vehicle(
                    vehicle_id=request.vehicle_id,
                    unit_number=request.vehicle_id,
                    fuel_capacity_gallons=request.vehicle_state.fuel_capacity_gallons,
                    current_fuel_gallons=request.vehicle_state.current_fuel_gallons,
                    mpg=request.vehicle_state.mpg,
                )
                db.add(vehicle)
                db.flush()

            # Create route plan
            route_plan_db = RoutePlan(
                plan_id=plan_id,
                driver_id=driver.id,
                vehicle_id=vehicle.id,
                plan_version=1,
                status="draft",
                is_active=False,
                optimization_priority=request.optimization_priority,
                total_distance_miles=result.total_distance_miles,
                total_drive_time_hours=result.total_drive_time_hours,
                total_on_duty_time_hours=result.total_on_duty_time_hours,
                total_cost_estimate=result.total_cost_estimate,
                is_feasible=result.is_feasible,
                feasibility_issues={"issues": result.feasibility_issues},
                compliance_report=result.compliance_report,
            )
            route_plan_db = repo.create(route_plan_db)

            # Create segments
            for seg in result.segments:
                segment_db = RouteSegment(
                    segment_id=f"seg_{uuid.uuid4().hex[:12]}",
                    plan_id=route_plan_db.id,
                    sequence_order=seg.sequence_order,
                    from_location=seg.from_location,
                    to_location=seg.to_location,
                    segment_type=seg.segment_type,
                    distance_miles=seg.distance_miles,
                    drive_time_hours=seg.drive_time_hours,
                    rest_type=seg.rest_type,
                    rest_duration_hours=seg.rest_duration_hours,
                    rest_reason=seg.rest_reason,
                    fuel_gallons=seg.fuel_gallons,
                    fuel_cost_estimate=seg.fuel_cost_estimate,
                    fuel_station_name=seg.fuel_station_name,
                    dock_duration_hours=seg.dock_duration_hours,
                    customer_name=seg.customer_name,
                    hos_state_after=seg.hos_state_after,
                    estimated_arrival=seg.estimated_arrival,
                    estimated_departure=seg.estimated_departure,
                    status="planned",
                )
                db.add(segment_db)

            db.commit()
            logger.info(f"Saved route plan to database: {plan_id}")

        except Exception as db_error:
            logger.warning(f"Failed to save to database: {db_error}")
            db.rollback()
            # Continue anyway - plan is still returned to user

        # Convert segments to response format
        segment_responses = []
        for seg in result.segments:
            segment_responses.append(
                RouteSegmentResponse(
                    sequence_order=seg.sequence_order,
                    segment_type=seg.segment_type,
                    from_location=seg.from_location,
                    to_location=seg.to_location,
                    distance_miles=seg.distance_miles,
                    drive_time_hours=seg.drive_time_hours,
                    rest_type=seg.rest_type,
                    rest_duration_hours=seg.rest_duration_hours,
                    rest_reason=seg.rest_reason,
                    fuel_gallons=seg.fuel_gallons,
                    fuel_cost_estimate=seg.fuel_cost_estimate,
                    fuel_station_name=seg.fuel_station_name,
                    dock_duration_hours=seg.dock_duration_hours,
                    customer_name=seg.customer_name,
                    hos_state_after=seg.hos_state_after,
                    estimated_arrival=seg.estimated_arrival,
                    estimated_departure=seg.estimated_departure,
                )
            )

        # Convert rest stops
        rest_stop_responses = [
            RestStopInfo(
                location=rs["location"],
                type=rs["type"],
                duration_hours=rs["duration_hours"],
                reason=rs["reason"],
            )
            for rs in result.rest_stops
        ]

        # Convert fuel stops
        fuel_stop_responses = [
            FuelStopInfo(
                location=fs["location"],
                gallons=fs["gallons"],
                cost=fs["cost"],
            )
            for fs in result.fuel_stops
        ]

        # Create summary
        summary = RouteSummary(
            total_driving_segments=len(
                [s for s in result.segments if s.segment_type == "drive"]
            ),
            total_rest_stops=len(result.rest_stops),
            total_fuel_stops=len(result.fuel_stops),
            total_dock_stops=len(
                [s for s in result.segments if s.segment_type == "dock"]
            ),
            estimated_completion=(
                result.segments[-1].estimated_arrival if result.segments else None
            ),
        )

        # Create compliance report
        compliance = ComplianceReportResponse(
            max_drive_hours_used=result.compliance_report["max_drive_hours_used"],
            max_duty_hours_used=result.compliance_report["max_duty_hours_used"],
            breaks_required=result.compliance_report["breaks_required"],
            breaks_planned=result.compliance_report["breaks_planned"],
            violations=result.compliance_report["violations"],
        )

        # Add data source badges
        data_sources = {
            "distance": format_data_source_badge(DEFAULT_MVP_SOURCES["distance"]),
            "traffic": format_data_source_badge(DEFAULT_MVP_SOURCES["traffic"]),
            "dock_time": format_data_source_badge(DEFAULT_MVP_SOURCES["dock_time"]),
            "hos": format_data_source_badge(DEFAULT_MVP_SOURCES["hos"]),
            "fuel_level": format_data_source_badge(DEFAULT_MVP_SOURCES["fuel_level"]),
            "fuel_price": format_data_source_badge(DEFAULT_MVP_SOURCES["fuel_price"]),
        }

        response = RoutePlanningResponse(
            plan_id=plan_id,
            plan_version=1,
            is_feasible=result.is_feasible,
            feasibility_issues=result.feasibility_issues,
            optimized_sequence=result.optimized_sequence,
            segments=segment_responses,
            total_distance_miles=result.total_distance_miles,
            total_time_hours=result.total_drive_time_hours,
            total_cost_estimate=result.total_cost_estimate,
            rest_stops=rest_stop_responses,
            fuel_stops=fuel_stop_responses,
            summary=summary,
            compliance_report=compliance,
            data_sources=data_sources,
        )

        logger.info(
            f"Route optimization successful: plan_id={plan_id}, "
            f"feasible={result.is_feasible}"
        )

        return response

    except Exception as e:
        logger.error(f"Route optimization failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Route optimization failed: {str(e)}",
        )


@router.post(
    "/update",
    response_model=RouteUpdateResponse,
    status_code=status.HTTP_200_OK,
    summary="Update route dynamically",
    description="Handle dynamic route updates (traffic, dock changes, load changes)",
)
def update_route(request: RouteUpdateRequest, db: Session = Depends(get_db)):
    """
    Handle dynamic route updates.

    Processes updates like:
    - Traffic delays
    - Dock time changes
    - Load added/cancelled
    - Driver rest requests

    Decides whether to re-plan or just update ETAs.
    """
    try:
        logger.info(
            f"Route update request: plan={request.plan_id}, "
            f"type={request.update_type}"
        )

        from app.services.dynamic_update_handler import DynamicUpdateHandler

        # Get existing route plan
        repo = RoutePlanRepository(db)
        route_plan_db = (
            db.query(RoutePlan)
            .filter(RoutePlan.plan_id == request.plan_id)
            .first()
        )

        if not route_plan_db:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Route plan {request.plan_id} not found",
            )

        # Get driver and vehicle
        driver = db.query(Driver).filter(Driver.id == route_plan_db.driver_id).first()
        vehicle = db.query(Vehicle).filter(Vehicle.id == route_plan_db.vehicle_id).first()

        if not driver or not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver or vehicle not found",
            )

        # Create update handler
        handler = DynamicUpdateHandler()

        # Determine priority based on update type
        priority_map = {
            "traffic_delay": "HIGH",
            "dock_time_change": "HIGH",
            "load_added": "CRITICAL",
            "load_cancelled": "HIGH",
            "driver_rest_request": "HIGH",
        }
        priority = priority_map.get(request.update_type, "MEDIUM")

        # Decide if re-plan is needed
        decision = handler.should_replan(
            current_plan=None,  # Not needed for decision
            trigger_type=request.update_type,
            trigger_data=request.update_data or {},
            priority=priority,
        )

        update_id = f"update_{uuid.uuid4().hex[:12]}"

        # If no re-plan needed, just return impact summary
        if not decision["replan_triggered"]:
            # Create update record
            update_record = RoutePlanUpdate(
                update_id=update_id,
                plan_id=route_plan_db.id,
                update_type=request.update_type,
                triggered_at=datetime.now(timezone.utc),
                triggered_by="user",
                trigger_data=request.update_data or {},
                replan_triggered=False,
                replan_reason=decision["reason"],
                previous_plan_version=route_plan_db.plan_version,
            )
            db.add(update_record)
            db.commit()

            return RouteUpdateResponse(
                update_id=update_id,
                plan_id=request.plan_id,
                replan_triggered=False,
                impact_summary={
                    "eta_changes": [],
                    "no_replan_reason": decision["reason"],
                },
            )

        # Re-plan needed - get current state and regenerate route
        logger.info(f"Re-planning triggered for {request.plan_id}: {decision['reason']}")

        # Update driver state based on update type
        if request.update_type == "dock_time_change" and request.update_data:
            actual_dock = request.update_data.get("actual_dock_hours", 0)
            estimated_dock = request.update_data.get("estimated_dock_hours", 0)
            variance = actual_dock - estimated_dock
            driver.on_duty_time_today += variance

        # Get remaining stops from original plan
        segments = (
            db.query(RouteSegment)
            .filter(RouteSegment.plan_id == route_plan_db.id)
            .filter(RouteSegment.segment_type.in_(["drive", "dock"]))
            .filter(RouteSegment.status == "planned")
            .order_by(RouteSegment.sequence_order)
            .all()
        )

        # Extract unique stops from segments
        remaining_stops = []
        seen_locations = set()
        for seg in segments:
            if seg.to_location and seg.to_location not in seen_locations:
                remaining_stops.append({
                    "stop_id": f"stop_{len(remaining_stops) + 1}",
                    "name": seg.to_location,
                    "lat": 0.0,  # Would need to extract from hos_state_after or store separately
                    "lon": 0.0,
                    "location_type": "customer" if seg.customer_name else "warehouse",
                    "estimated_dock_hours": seg.dock_duration_hours or 1.0,
                    "customer_name": seg.customer_name,
                })
                seen_locations.add(seg.to_location)

        if not remaining_stops:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No remaining stops to re-plan",
            )

        # Create input for route planning engine
        engine_input = RoutePlanInput(
            driver_state={
                "hours_driven": driver.hours_driven_today,
                "on_duty_time": driver.on_duty_time_today,
                "hours_since_break": driver.hours_since_break,
            },
            vehicle_state={
                "fuel_capacity_gallons": vehicle.fuel_capacity_gallons,
                "current_fuel_gallons": vehicle.current_fuel_gallons,
                "mpg": vehicle.mpg,
            },
            stops=remaining_stops,
            optimization_priority=route_plan_db.optimization_priority,
        )

        # Run route planning engine
        engine = RoutePlanningEngine()
        result = engine.plan_route(engine_input)

        # Increment plan version
        new_version = route_plan_db.plan_version + 1

        # Update existing plan
        route_plan_db.plan_version = new_version
        route_plan_db.total_distance_miles = result.total_distance_miles
        route_plan_db.total_drive_time_hours = result.total_drive_time_hours
        route_plan_db.total_on_duty_time_hours = result.total_on_duty_time_hours
        route_plan_db.total_cost_estimate = result.total_cost_estimate
        route_plan_db.is_feasible = result.is_feasible
        route_plan_db.feasibility_issues = {"issues": result.feasibility_issues}
        route_plan_db.compliance_report = result.compliance_report

        # Mark old segments as cancelled
        db.query(RouteSegment).filter(
            RouteSegment.plan_id == route_plan_db.id,
            RouteSegment.status == "planned"
        ).update({"status": "cancelled"})

        # Create new segments
        for seg in result.segments:
            segment_db = RouteSegment(
                segment_id=f"seg_{uuid.uuid4().hex[:12]}",
                plan_id=route_plan_db.id,
                sequence_order=seg.sequence_order,
                from_location=seg.from_location,
                to_location=seg.to_location,
                segment_type=seg.segment_type,
                distance_miles=seg.distance_miles,
                drive_time_hours=seg.drive_time_hours,
                rest_type=seg.rest_type,
                rest_duration_hours=seg.rest_duration_hours,
                rest_reason=seg.rest_reason,
                fuel_gallons=seg.fuel_gallons,
                fuel_cost_estimate=seg.fuel_cost_estimate,
                fuel_station_name=seg.fuel_station_name,
                dock_duration_hours=seg.dock_duration_hours,
                customer_name=seg.customer_name,
                hos_state_after=seg.hos_state_after,
                estimated_arrival=seg.estimated_arrival,
                estimated_departure=seg.estimated_departure,
                status="planned",
            )
            db.add(segment_db)

        # Create update record
        update_record = RoutePlanUpdate(
            update_id=update_id,
            plan_id=route_plan_db.id,
            update_type=request.update_type,
            triggered_at=datetime.now(timezone.utc),
            triggered_by="user",
            trigger_data=request.update_data or {},
            replan_triggered=True,
            replan_reason=decision["reason"],
            previous_plan_version=route_plan_db.plan_version - 1,
            new_plan_version=new_version,
        )
        db.add(update_record)

        db.commit()

        logger.info(
            f"Route re-plan successful: plan_id={request.plan_id}, "
            f"version={new_version}"
        )

        # Convert segments to response format
        segment_responses = []
        for seg in result.segments:
            segment_responses.append(
                RouteSegmentResponse(
                    sequence_order=seg.sequence_order,
                    segment_type=seg.segment_type,
                    from_location=seg.from_location,
                    to_location=seg.to_location,
                    distance_miles=seg.distance_miles,
                    drive_time_hours=seg.drive_time_hours,
                    rest_type=seg.rest_type,
                    rest_duration_hours=seg.rest_duration_hours,
                    rest_reason=seg.rest_reason,
                    fuel_gallons=seg.fuel_gallons,
                    fuel_cost_estimate=seg.fuel_cost_estimate,
                    fuel_station_name=seg.fuel_station_name,
                    dock_duration_hours=seg.dock_duration_hours,
                    customer_name=seg.customer_name,
                    hos_state_after=seg.hos_state_after,
                    estimated_arrival=seg.estimated_arrival,
                    estimated_departure=seg.estimated_departure,
                )
            )

        # Convert rest stops
        rest_stop_responses = [
            RestStopInfo(
                location=rs["location"],
                type=rs["type"],
                duration_hours=rs["duration_hours"],
                reason=rs["reason"],
            )
            for rs in result.rest_stops
        ]

        # Convert fuel stops
        fuel_stop_responses = [
            FuelStopInfo(
                location=fs["location"],
                gallons=fs["gallons"],
                cost=fs["cost"],
            )
            for fs in result.fuel_stops
        ]

        # Create summary
        summary = RouteSummary(
            total_driving_segments=len(
                [s for s in result.segments if s.segment_type == "drive"]
            ),
            total_rest_stops=len(result.rest_stops),
            total_fuel_stops=len(result.fuel_stops),
            total_dock_stops=len(
                [s for s in result.segments if s.segment_type == "dock"]
            ),
            estimated_completion=(
                result.segments[-1].estimated_arrival if result.segments else None
            ),
        )

        # Create compliance report
        compliance = ComplianceReportResponse(
            max_drive_hours_used=result.compliance_report["max_drive_hours_used"],
            max_duty_hours_used=result.compliance_report["max_duty_hours_used"],
            breaks_required=result.compliance_report["breaks_required"],
            breaks_planned=result.compliance_report["breaks_planned"],
            violations=result.compliance_report["violations"],
        )

        # Create new plan response
        new_plan = RoutePlanningResponse(
            plan_id=request.plan_id,
            plan_version=new_version,
            is_feasible=result.is_feasible,
            feasibility_issues=result.feasibility_issues,
            optimized_sequence=result.optimized_sequence,
            segments=segment_responses,
            total_distance_miles=result.total_distance_miles,
            total_time_hours=result.total_drive_time_hours,
            total_cost_estimate=result.total_cost_estimate,
            rest_stops=rest_stop_responses,
            fuel_stops=fuel_stop_responses,
            summary=summary,
            compliance_report=compliance,
            data_sources={},  # Reuse from original
        )

        return RouteUpdateResponse(
            update_id=update_id,
            plan_id=request.plan_id,
            replan_triggered=True,
            new_plan=new_plan,
            impact_summary={
                "replan_reason": decision["reason"],
                "version_change": f"{route_plan_db.plan_version - 1} → {new_version}",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Route update failed: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Route update failed: {str(e)}",
        )


@router.get(
    "/status/{driver_id}",
    status_code=status.HTTP_200_OK,
    summary="Get current route status",
    description="Get current route plan and execution status for a driver",
)
def get_route_status(driver_id: str):
    """
    Get current route status for a driver.

    Returns:
    - Current plan
    - Current segment with progress
    - Upcoming segments
    - Alerts/warnings
    """
    try:
        logger.info(f"Route status request for driver {driver_id}")

        # TODO: Implement route status retrieval from database
        # For MVP, return placeholder

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active route found for driver {driver_id}",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Route status retrieval failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Route status retrieval failed: {str(e)}",
        )


# ============================================================================
# Trigger Simulation Endpoints
# ============================================================================


from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.trigger_simulator import TriggerSimulator, TriggerInput


class TriggerInputSchema(BaseModel):
    """Schema for trigger input."""

    trigger_type: str
    segment_id: Optional[str] = None
    data: Dict[str, Any] = {}


class SimulationResultSchema(BaseModel):
    """Schema for simulation result."""

    previous_plan_version: int
    new_plan_version: int
    new_plan_id: str
    triggers_applied: int
    impact_summary: Dict[str, Any]
    replan_triggered: bool
    replan_reason: Optional[str]


@router.post(
    "/simulate-triggers",
    response_model=SimulationResultSchema,
    status_code=status.HTTP_200_OK,
    summary="Simulate triggers and generate new plan version",
    description="Apply multiple triggers to a route plan and generate updated plan",
)
async def simulate_triggers(
    plan_id: str,
    triggers: List[TriggerInputSchema],
    db: Session = Depends(get_db),
):
    """
    Simulate triggers and generate new route plan version.

    This endpoint:
    1. Applies multiple triggers to an existing plan
    2. Analyzes impact and determines if replan is needed
    3. Generates new plan version if needed
    4. Returns impact summary

    Supported trigger types:
    - dock_time_change: Actual dock time differs from estimate
    - traffic_delay: Traffic delay on a segment
    - driver_rest_request: Driver requests early rest
    - fuel_price_spike: Fuel price change
    - appointment_change: Customer changes time window
    - hos_violation: HOS violation detected

    Args:
        plan_id: Route plan ID to simulate triggers on
        triggers: List of triggers to apply
        db: Database session

    Returns:
        Simulation result with new plan version and impact summary

    Raises:
        HTTPException: If plan not found or simulation fails
    """
    try:
        logger.info(f"Trigger simulation request for plan {plan_id} with {len(triggers)} triggers")

        # Convert schema to service input
        trigger_inputs = [
            TriggerInput(
                trigger_type=t.trigger_type,
                segment_id=t.segment_id,
                data=t.data,
            )
            for t in triggers
        ]

        # Initialize simulator
        simulator = TriggerSimulator(db)

        # Apply triggers
        result = await simulator.apply_triggers(plan_id, trigger_inputs)

        logger.info(
            f"Trigger simulation completed: {result.previous_plan_version} → {result.new_plan_version}"
        )

        return SimulationResultSchema(
            previous_plan_version=result.previous_plan_version,
            new_plan_version=result.new_plan_version,
            new_plan_id=result.new_plan_id,
            triggers_applied=result.triggers_applied,
            impact_summary=result.impact_summary,
            replan_triggered=result.replan_triggered,
            replan_reason=result.replan_reason,
        )

    except ValueError as e:
        logger.error(f"Trigger simulation validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Trigger simulation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Trigger simulation failed: {str(e)}",
        )
