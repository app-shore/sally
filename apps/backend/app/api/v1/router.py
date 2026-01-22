"""API v1 router aggregator."""

from fastapi import APIRouter

from app.api.v1.endpoints import hos_rules, optimization, prediction

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(hos_rules.router)
api_router.include_router(optimization.router)
api_router.include_router(prediction.router)
