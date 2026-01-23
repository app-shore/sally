"""API v1 router aggregator."""

from fastapi import APIRouter

from app.api.v1.endpoints import drivers, hos_rules, loads, optimization, prediction, route_planning, scenarios, vehicles

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(hos_rules.router)
api_router.include_router(optimization.router)
api_router.include_router(prediction.router)
api_router.include_router(route_planning.router)
api_router.include_router(loads.router, prefix="/loads", tags=["loads"])
api_router.include_router(scenarios.router, prefix="/scenarios", tags=["scenarios"])
api_router.include_router(drivers.router, prefix="/drivers", tags=["drivers"])
api_router.include_router(vehicles.router, prefix="/vehicles", tags=["vehicles"])
