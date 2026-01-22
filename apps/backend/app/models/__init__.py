"""Database models."""

from app.db.base import Base
from app.models.driver import Driver
from app.models.event import Event
from app.models.recommendation import Recommendation
from app.models.route import Route
from app.models.vehicle import Vehicle

__all__ = ["Base", "Driver", "Vehicle", "Route", "Event", "Recommendation"]
