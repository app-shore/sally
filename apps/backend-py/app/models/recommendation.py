"""Recommendation model for rest optimization history."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.driver import Driver
    from app.models.route import Route
    from app.models.route_plan import RoutePlan
    from app.models.route_segment import RouteSegment


class Recommendation(Base, TimestampMixin):
    """Recommendation model for storing rest optimization recommendations."""

    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Recommendation details
    recommendation_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # full_rest, partial_rest, no_rest
    recommended_duration_hours: Mapped[float | None] = mapped_column(Float)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)

    # Input data snapshot
    hours_driven: Mapped[float] = mapped_column(Float, nullable=False)
    on_duty_time: Mapped[float] = mapped_column(Float, nullable=False)
    hours_since_break: Mapped[float] = mapped_column(Float, nullable=False)
    dock_duration_hours: Mapped[float | None] = mapped_column(Float)
    post_load_drive_hours: Mapped[float | None] = mapped_column(Float)

    # Compliance check results
    is_compliant: Mapped[bool] = mapped_column(nullable=False)
    compliance_details: Mapped[str | None] = mapped_column(Text)

    # Metadata
    recommended_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    was_accepted: Mapped[bool | None] = mapped_column()
    actual_action_taken: Mapped[str | None] = mapped_column(String(50))

    # Foreign Keys
    driver_id: Mapped[int] = mapped_column(ForeignKey("drivers.id"), index=True, nullable=False)
    route_id: Mapped[int | None] = mapped_column(ForeignKey("routes.id"), index=True)
    plan_id: Mapped[int | None] = mapped_column(
        ForeignKey("route_plans.id"), index=True
    )  # NEW: Link to route plan
    segment_id: Mapped[int | None] = mapped_column(
        ForeignKey("route_segments.id"), index=True
    )  # NEW: Link to specific segment

    # Relationships
    driver: Mapped["Driver"] = relationship("Driver", back_populates="recommendations")
    route: Mapped["Route"] = relationship("Route", back_populates="recommendations")

    def __repr__(self) -> str:
        return (
            f"<Recommendation(id={self.id}, type='{self.recommendation_type}', "
            f"driver_id={self.driver_id}, recommended_at='{self.recommended_at}')>"
        )
