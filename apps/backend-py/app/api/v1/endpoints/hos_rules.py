"""HOS Rule Engine API endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.api.v1.schemas.requests import HOSCheckRequest
from app.api.v1.schemas.responses import ComplianceCheckDetail, HOSCheckResponse
from app.services.hos_rule_engine import HOSRuleEngine
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/hos-rules", tags=["HOS Rules"])


@router.post("/check", response_model=HOSCheckResponse, status_code=status.HTTP_200_OK)
async def check_hos_compliance(request: HOSCheckRequest) -> HOSCheckResponse:
    """
    Check HOS compliance for a driver.

    Validates current driver status against FMCSA Hours of Service regulations:
    - 11-hour driving limit
    - 14-hour on-duty window
    - 30-minute break requirement after 8 hours

    Args:
        request: HOS compliance check request

    Returns:
        HOSCheckResponse: Detailed compliance status with checks and recommendations

    Raises:
        HTTPException: If validation fails or service error occurs
    """
    try:
        logger.info("hos_check_requested", driver_id=request.driver_id)

        # Initialize HOS engine
        hos_engine = HOSRuleEngine()

        # Validate compliance
        result = hos_engine.validate_compliance(
            hours_driven=request.hours_driven,
            on_duty_time=request.on_duty_time,
            hours_since_break=request.hours_since_break,
            last_rest_period=request.last_rest_period,
        )

        # Convert to response schema
        checks = [
            ComplianceCheckDetail(
                rule_name=check.rule_name,
                is_compliant=check.is_compliant,
                current_value=check.current_value,
                limit_value=check.limit_value,
                remaining=check.remaining,
                message=check.message,
            )
            for check in result.checks
        ]

        response = HOSCheckResponse(
            status=result.status.value,
            is_compliant=result.is_compliant,
            checks=checks,
            warnings=result.warnings,
            violations=result.violations,
            hours_remaining_to_drive=result.hours_remaining_to_drive,
            hours_remaining_on_duty=result.hours_remaining_on_duty,
            break_required=result.break_required,
            rest_required=result.rest_required,
        )

        logger.info(
            "hos_check_completed",
            driver_id=request.driver_id,
            is_compliant=result.is_compliant,
            status=result.status.value,
        )

        return response

    except ValueError as e:
        logger.error("hos_check_validation_error", driver_id=request.driver_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        logger.error("hos_check_failed", driver_id=request.driver_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check HOS compliance",
        )
