"""Rest Optimization Engine API endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.api.v1.schemas.requests import OptimizationRequest
from app.api.v1.schemas.responses import (
    CostAnalysisResponse,
    FeasibilityAnalysisResponse,
    OpportunityAnalysisResponse,
    OptimizationResponse,
)
from app.services.prediction_engine import PredictionEngine, PredictionInput
from app.services.rest_optimization import (
    RestOptimizationEngine,
    RestOptimizationInput,
    TripRequirement,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/optimization", tags=["Rest Optimization"])


@router.post("/recommend", response_model=OptimizationResponse, status_code=status.HTTP_200_OK)
async def recommend_rest(request: OptimizationRequest) -> OptimizationResponse:
    """
    Generate intelligent rest optimization recommendation.

    Uses intelligent optimization formula that considers:
    - All HOS compliance parameters (drive limit, duty window, break requirements)
    - Multiple upcoming trips (not just next stop)
    - Opportunity value of extending rest at dock
    - Cost-benefit analysis of rest extension

    Recommendations:
    - FULL_REST: Take complete 10-hour sleeper berth rest
    - PARTIAL_REST: Take split sleeper berth rest (7-8 hours)
    - NO_REST: Continue without rest (includes 30-min break if required)

    Args:
        request: Optimization request with driver status and trip information

    Returns:
        OptimizationResponse: Intelligent recommendation with confidence, analytics, and reasoning

    Raises:
        HTTPException: If validation fails or service error occurs

    See: .specs/INTELLIGENT_OPTIMIZATION_FORMULA.md for algorithm details
    """
    try:
        logger.info("optimization_requested", driver_id=request.driver_id)

        # Convert upcoming trips from request to TripRequirement objects
        upcoming_trips = None
        if request.upcoming_trips:
            upcoming_trips = [
                TripRequirement(
                    drive_time=trip.drive_time,
                    dock_time=trip.dock_time,
                    location=trip.location,
                )
                for trip in request.upcoming_trips
            ]

        # Calculate post-load drive hours if route information provided (backward compatibility)
        post_load_drive_hours = None
        if request.remaining_distance_miles is not None:
            prediction_engine = PredictionEngine()
            prediction_input = PredictionInput(
                remaining_distance_miles=request.remaining_distance_miles,
                destination=request.destination or "Unknown",
                appointment_time=request.appointment_time,
                current_location=request.current_location,
                average_speed_mph=55.0,
            )
            prediction_result = prediction_engine.predict_drive_demand(prediction_input)
            post_load_drive_hours = prediction_result.estimated_drive_hours

        # Prepare optimization input
        optimization_input = RestOptimizationInput(
            hours_driven=request.hours_driven,
            on_duty_time=request.on_duty_time,
            hours_since_break=request.hours_since_break,
            dock_duration_hours=request.dock_duration_hours,
            post_load_drive_hours=post_load_drive_hours,
            current_location=request.current_location,
            upcoming_trips=upcoming_trips,  # New: multi-trip support
        )

        # Generate intelligent recommendation
        optimization_engine = RestOptimizationEngine()
        result = optimization_engine.recommend_rest(optimization_input)

        # Build enhanced response with all analytics
        response = OptimizationResponse(
            # Core recommendation
            recommendation=result.recommendation.value,
            recommended_duration_hours=result.recommended_duration_hours,
            reasoning=result.reasoning,
            confidence=result.confidence,
            # Compliance
            is_compliant=result.is_compliant,
            compliance_details=result.compliance_details,
            hours_remaining_to_drive=result.hours_remaining_to_drive,
            hours_remaining_on_duty=result.hours_remaining_on_duty,
            # Feasibility
            post_load_drive_feasible=result.post_load_drive_feasible,
            driver_can_decline=result.driver_can_decline,
            # Enhanced analytics
            feasibility_analysis=(
                FeasibilityAnalysisResponse(
                    feasible=result.feasibility_analysis.feasible,
                    limiting_factor=result.feasibility_analysis.limiting_factor,
                    shortfall_hours=result.feasibility_analysis.shortfall_hours,
                    total_drive_needed=result.feasibility_analysis.total_drive_needed,
                    total_on_duty_needed=result.feasibility_analysis.total_on_duty_needed,
                    will_need_break=result.feasibility_analysis.will_need_break,
                    drive_margin=result.feasibility_analysis.drive_margin,
                    duty_margin=result.feasibility_analysis.duty_margin,
                )
                if result.feasibility_analysis
                else None
            ),
            opportunity_analysis=(
                OpportunityAnalysisResponse(
                    score=result.opportunity_analysis.score,
                    dock_score=result.opportunity_analysis.dock_score,
                    hours_score=result.opportunity_analysis.hours_score,
                    criticality_score=result.opportunity_analysis.criticality_score,
                    dock_time_available=result.opportunity_analysis.dock_time_available,
                    hours_gainable=result.opportunity_analysis.hours_gainable,
                )
                if result.opportunity_analysis
                else None
            ),
            cost_analysis=(
                CostAnalysisResponse(
                    full_rest_extension_hours=result.cost_analysis.full_rest_extension_hours,
                    partial_rest_extension_hours=result.cost_analysis.partial_rest_extension_hours,
                    dock_time_available=result.cost_analysis.dock_time_available,
                )
                if result.cost_analysis
                else None
            ),
            # Before/after comparison
            hours_after_rest_drive=result.hours_after_rest_drive,
            hours_after_rest_duty=result.hours_after_rest_duty,
        )

        logger.info(
            "optimization_completed",
            driver_id=request.driver_id,
            recommendation=result.recommendation.value,
            duration=result.recommended_duration_hours,
            confidence=result.confidence,
            opportunity_score=(
                result.opportunity_analysis.score if result.opportunity_analysis else None
            ),
            driver_can_decline=result.driver_can_decline,
        )

        return response

    except ValueError as e:
        logger.error("optimization_validation_error", driver_id=request.driver_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        logger.error("optimization_failed", driver_id=request.driver_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate rest recommendation",
        )
