"""Rest Optimization Engine API endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.api.v1.schemas.requests import OptimizationRequest
from app.api.v1.schemas.responses import OptimizationResponse
from app.services.prediction_engine import PredictionEngine, PredictionInput
from app.services.rest_optimization import RestOptimizationEngine, RestOptimizationInput
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/optimization", tags=["Rest Optimization"])


@router.post("/recommend", response_model=OptimizationResponse, status_code=status.HTTP_200_OK)
async def recommend_rest(request: OptimizationRequest) -> OptimizationResponse:
    """
    Generate rest optimization recommendation.

    Analyzes current HOS status, dock time availability, and post-load drive demand
    to recommend optimal rest timing:
    - FULL_REST: Take complete 10-hour sleeper berth rest
    - PARTIAL_REST: Take split sleeper berth rest (7-8 hours)
    - NO_REST: Continue without rest

    Args:
        request: Optimization request with driver status and route information

    Returns:
        OptimizationResponse: Rest recommendation with reasoning and feasibility analysis

    Raises:
        HTTPException: If validation fails or service error occurs
    """
    try:
        logger.info("optimization_requested", driver_id=request.driver_id)

        # Calculate post-load drive hours if route information provided
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
        )

        # Generate recommendation
        optimization_engine = RestOptimizationEngine()
        result = optimization_engine.recommend_rest(optimization_input)

        # Build response
        response = OptimizationResponse(
            recommendation=result.recommendation.value,
            recommended_duration_hours=result.recommended_duration_hours,
            reasoning=result.reasoning,
            is_compliant=result.is_compliant,
            compliance_details=result.compliance_details,
            hours_remaining_to_drive=result.hours_remaining_to_drive,
            hours_remaining_on_duty=result.hours_remaining_on_duty,
            post_load_drive_feasible=result.post_load_drive_feasible,
        )

        logger.info(
            "optimization_completed",
            driver_id=request.driver_id,
            recommendation=result.recommendation.value,
            duration=result.recommended_duration_hours,
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
