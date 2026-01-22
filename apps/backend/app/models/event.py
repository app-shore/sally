"""Event model for duty status change logs."""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Event(Base, TimestampMixin):
    """Event model for logging driver duty status changes."""

    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    event_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # duty_status_change, break_taken, rest_taken, etc.

    # Event details
    duty_status: Mapped[str] = mapped_column(String(50), nullable=False)
    previous_duty_status: Mapped[str | None] = mapped_column(String(50))
    duration_hours: Mapped[float | None] = mapped_column(Float)
    location: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)

    # Timestamp
    event_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )

    # Foreign Keys
    driver_id: Mapped[int] = mapped_column(ForeignKey("drivers.id"), index=True, nullable=False)

    # Relationships
    driver: Mapped["Driver"] = relationship("Driver", back_populates="events")

    def __repr__(self) -> str:
        return (
            f"<Event(id={self.id}, type='{self.event_type}', "
            f"driver_id={self.driver_id}, time='{self.event_time}')>"
        )
