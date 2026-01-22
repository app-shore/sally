"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, status
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.config import settings
from app.core.exceptions import RestOSException
from app.db.database import close_db, init_db
from app.middleware.cors import setup_cors
from app.middleware.error_handling import generic_exception_handler, restos_exception_handler
from app.middleware.logging import LoggingMiddleware
from app.utils.cache import cache_manager
from app.utils.logger import get_logger, setup_logging

# Setup logging
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("application_startup", environment=settings.environment)

    try:
        # Initialize database
        await init_db()
        logger.info("database_initialized")

        # Initialize cache
        await cache_manager.connect()
        logger.info("cache_initialized")

    except Exception as e:
        logger.error("application_startup_failed", error=str(e))
        raise

    yield

    # Shutdown
    logger.info("application_shutdown")
    try:
        await close_db()
        await cache_manager.disconnect()
    except Exception as e:
        logger.error("application_shutdown_failed", error=str(e))


# Create FastAPI application
app = FastAPI(
    title=settings.project_name,
    description="REST-OS Backend API for optimizing truck driver rest periods",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Setup CORS
setup_cors(app)

# Add middleware
app.add_middleware(LoggingMiddleware)

# Add exception handlers
app.add_exception_handler(RestOSException, restos_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Include API router
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["Health"], status_code=status.HTTP_200_OK)
async def health_check() -> JSONResponse:
    """
    Health check endpoint.

    Returns:
        JSONResponse: Service health status
    """
    return JSONResponse(
        content={
            "status": "healthy",
            "environment": settings.environment,
            "version": "0.1.0",
        }
    )


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    """
    Root endpoint.

    Returns:
        dict: Welcome message
    """
    return {
        "message": "REST-OS Backend API",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
