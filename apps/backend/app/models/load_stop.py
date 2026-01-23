"""LoadStop model for individual stops within a load."""

from datetime import datetime, time
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.load import Load
    from app.models.stop import Stop


class LoadStop(Base, TimestampMixin):
    """LoadStop model representing an individual stop within a load (pickup or delivery)."""

    __tablename__ = "load_stops"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Foreign keys
    load_id: Mapped[int] = mapped_column(ForeignKey("loads.id"), index=True, nullable=False)
    stop_id: Mapped[int] = mapped_column(ForeignKey("stops.id"), index=True, nullable=False)

    # Stop sequence within load
    sequence_order: Mapped[int] = mapped_column(
        Integer, nullable=False, index=True
    )  # 1, 2, 3... order within load

    # Stop type
    action_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # pickup, delivery, both

    # Time windows
    earliest_arrival: Mapped[time | None] = mapped_column(Time)
    latest_arrival: Mapped[time | None] = mapped_column(Time)
    appointment_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Dock info
    estimated_dock_hours: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    actual_dock_hours: Mapped[float | None] = mapped_column(Float)  # Filled after completion

    # Relationships
    load: Mapped["Load"] = relationship("Load", back_populates="stops")
    stop: Mapped["Stop"] = relationship("Stop")

    def __repr__(self) -> str:
        return (
            f"<LoadStop(id={self.id}, load_id={self.load_id}, stop_id={self.stop_id}, "
            f"sequence={self.sequence_order}, action='{self.action_type}')>"
        )
