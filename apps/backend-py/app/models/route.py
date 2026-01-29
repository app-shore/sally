"""Route model."""

from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.recommendation import Recommendation
    from app.models.route_plan import RoutePlan
    from app.models.vehicle import Vehicle


class Route(Base, TimestampMixin):
    """Route model representing a trip or delivery route."""

    __tablename__ = "routes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    route_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    # Route details
    origin: Mapped[str] = mapped_column(String(255), nullable=False)
    destination: Mapped[str] = mapped_column(String(255), nullable=False)
    total_distance_miles: Mapped[float] = mapped_column(Float, nullable=False)
    remaining_distance_miles: Mapped[float | None] = mapped_column(Float)
    estimated_duration_hours: Mapped[float | None] = mapped_column(Float)

    # Timing
    scheduled_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    scheduled_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    actual_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    actual_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    appointment_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Dock information
    dock_location: Mapped[str | None] = mapped_column(String(255))
    dock_duration_hours: Mapped[float | None] = mapped_column(Float)
    is_at_dock: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Status
    status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False
    )  # pending, planned, in_progress, at_dock, completed, cancelled, needs_replan
    notes: Mapped[str | None] = mapped_column(Text)

    # Foreign Keys
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id"), index=True)
    active_plan_id: Mapped[int | None] = mapped_column(
        ForeignKey("route_plans.id"), index=True
    )  # Link to active route plan

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="routes")
    recommendations: Mapped[List["Recommendation"]] = relationship(
        "Recommendation", back_populates="route"
    )
    route_plans: Mapped[List["RoutePlan"]] = relationship(
        "RoutePlan", back_populates="route", foreign_keys="RoutePlan.route_id"
    )

    def __repr__(self) -> str:
        return (
            f"<Route(id={self.id}, route_id='{self.route_id}', "
            f"origin='{self.origin}', destination='{self.destination}')>"
        )
