"""Database models."""

from app.db.base import Base
from app.models.driver import Driver
from app.models.event import Event
from app.models.load import Load
from app.models.load_stop import LoadStop
from app.models.recommendation import Recommendation
from app.models.route import Route
from app.models.scenario import Scenario
from app.models.route_plan import RoutePlan
from app.models.route_plan_update import RoutePlanUpdate
from app.models.route_segment import RouteSegment
from app.models.stop import Stop
from app.models.vehicle import Vehicle

__all__ = [
    "Base",
    "Driver",
    "Vehicle",
    "Route",
    "Event",
    "Recommendation",
    "RoutePlan",
    "RouteSegment",
    "RoutePlanUpdate",
    "Stop",
    "Load",
    "LoadStop",
    "Scenario",
]
