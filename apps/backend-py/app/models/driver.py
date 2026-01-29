"""Driver model."""

from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import DutyStatus
from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.event import Event
    from app.models.recommendation import Recommendation
    from app.models.route_plan import RoutePlan


class Driver(Base, TimestampMixin):
    """Driver model representing a truck driver."""

    __tablename__ = "drivers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    driver_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20))

    # Current HOS Status
    current_duty_status: Mapped[str] = mapped_column(
        String(50), default=DutyStatus.OFF_DUTY, nullable=False
    )
    hours_driven_today: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    on_duty_time_today: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    hours_since_break: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    last_break_duration: Mapped[float | None] = mapped_column(Float)
    last_rest_period: Mapped[float | None] = mapped_column(Float)
    duty_status_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Metadata
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Route Planning (NEW)
    current_plan_id: Mapped[int | None] = mapped_column(
        ForeignKey("route_plans.id"), index=True
    )  # Link to active route plan
    current_location_lat_lon: Mapped[dict | None] = mapped_column(
        JSON
    )  # {"lat": float, "lon": float} for live tracking in future

    # Relationships
    events: Mapped[List["Event"]] = relationship("Event", back_populates="driver")
    recommendations: Mapped[List["Recommendation"]] = relationship(
        "Recommendation", back_populates="driver"
    )
    route_plans: Mapped[List["RoutePlan"]] = relationship(
        "RoutePlan", back_populates="driver", foreign_keys="RoutePlan.driver_id"
    )
    current_plan: Mapped["RoutePlan"] = relationship(
        "RoutePlan", foreign_keys=[current_plan_id], post_update=True
    )

    def __repr__(self) -> str:
        return f"<Driver(id={self.id}, driver_id='{self.driver_id}', name='{self.name}')>"
