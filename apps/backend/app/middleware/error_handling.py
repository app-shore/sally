"""Global error handling middleware."""

from fastapi import Request, status
from fastapi.responses import JSONResponse

from app.core.exceptions import (
    DatabaseError,
    HOSComplianceError,
    NotFoundError,
    OptimizationError,
    PredictionError,
    RestOSException,
    ValidationError,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def restos_exception_handler(request: Request, exc: RestOSException) -> JSONResponse:
    """Handle custom REST-OS exceptions."""
    logger.error(
        "application_error",
        path=request.url.path,
        error_code=exc.code,
        error_message=exc.message,
    )

    # Map exception types to HTTP status codes
    status_code_map = {
        HOSComplianceError: status.HTTP_400_BAD_REQUEST,
        OptimizationError: status.HTTP_500_INTERNAL_SERVER_ERROR,
        PredictionError: status.HTTP_500_INTERNAL_SERVER_ERROR,
        DatabaseError: status.HTTP_500_INTERNAL_SERVER_ERROR,
        ValidationError: status.HTTP_422_UNPROCESSABLE_ENTITY,
        NotFoundError: status.HTTP_404_NOT_FOUND,
    }

    status_code = status_code_map.get(type(exc), status.HTTP_500_INTERNAL_SERVER_ERROR)

    return JSONResponse(
        status_code=status_code,
        content={
            "detail": exc.message,
            "error_code": exc.code,
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    logger.error(
        "unexpected_error",
        path=request.url.path,
        error=str(exc),
        error_type=type(exc).__name__,
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred",
            "error_code": "INTERNAL_SERVER_ERROR",
        },
    )
