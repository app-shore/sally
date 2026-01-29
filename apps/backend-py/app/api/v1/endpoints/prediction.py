"""Prediction Engine API endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.api.v1.schemas.requests import PredictionRequest
from app.api.v1.schemas.responses import PredictionResponse
from app.services.prediction_engine import PredictionEngine, PredictionInput
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/prediction", tags=["Prediction"])


@router.post("/estimate", response_model=PredictionResponse, status_code=status.HTTP_200_OK)
async def estimate_drive_demand(request: PredictionRequest) -> PredictionResponse:
    """
    Estimate post-load drive demand.

    Predicts driving time required based on remaining distance, destination,
    and other route factors.

    MVP Implementation: Simple time/distance calculation
    Future: ML-based prediction with traffic, historical patterns, etc.

    Args:
        request: Prediction request with route information

    Returns:
        PredictionResponse: Drive demand estimate with classification

    Raises:
        HTTPException: If validation fails or service error occurs
    """
    try:
        logger.info(
            "prediction_requested",
            distance=request.remaining_distance_miles,
            destination=request.destination,
        )

        # Prepare prediction input
        prediction_input = PredictionInput(
            remaining_distance_miles=request.remaining_distance_miles,
            destination=request.destination,
            appointment_time=request.appointment_time,
            current_location=request.current_location,
            average_speed_mph=request.average_speed_mph,
        )

        # Generate prediction
        prediction_engine = PredictionEngine()
        result = prediction_engine.predict_drive_demand(prediction_input)

        # Build response
        response = PredictionResponse(
            estimated_drive_hours=result.estimated_drive_hours,
            estimated_arrival_time=result.estimated_arrival_time,
            is_high_demand=result.is_high_demand,
            is_low_demand=result.is_low_demand,
            confidence=result.confidence,
            reasoning=result.reasoning,
        )

        logger.info(
            "prediction_completed",
            destination=request.destination,
            estimated_hours=result.estimated_drive_hours,
            is_low_demand=result.is_low_demand,
            is_high_demand=result.is_high_demand,
        )

        return response

    except ValueError as e:
        logger.error("prediction_validation_error", destination=request.destination, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        logger.error("prediction_failed", destination=request.destination, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to estimate drive demand",
        )
