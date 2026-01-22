"""Route model."""

from datetime import datetime
from typing import List

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


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
    )  # pending, in_progress, at_dock, completed, cancelled
    notes: Mapped[str | None] = mapped_column(Text)

    # Foreign Keys
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id"), index=True)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="routes")
    recommendations: Mapped[List["Recommendation"]] = relationship(
        "Recommendation", back_populates="route"
    )

    def __repr__(self) -> str:
        return (
            f"<Route(id={self.id}, route_id='{self.route_id}', "
            f"origin='{self.origin}', destination='{self.destination}')>"
        )
