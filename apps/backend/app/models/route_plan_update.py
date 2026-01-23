"""RoutePlanUpdate model for tracking dynamic route updates."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class RoutePlanUpdate(Base, TimestampMixin):
    """RoutePlanUpdate model for tracking dynamic updates to route plans (audit trail)."""

    __tablename__ = "route_plan_updates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    update_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("route_plans.id"), index=True, nullable=False
    )

    # Trigger
    update_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # traffic_delay, dock_time_change, load_added, load_cancelled, driver_rest_request, etc.
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    triggered_by: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # system, driver, dispatcher

    # Details
    trigger_data: Mapped[dict | None] = mapped_column(
        JSON
    )  # e.g., {"segment_id": "...", "delay_minutes": 45}

    # Decision
    replan_triggered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    replan_reason: Mapped[str | None] = mapped_column(Text)

    # Result
    previous_plan_version: Mapped[int] = mapped_column(Integer, nullable=False)
    new_plan_version: Mapped[int | None] = mapped_column(Integer)  # Nullable if no re-plan

    # Impact summary
    impact_summary: Mapped[dict | None] = mapped_column(
        JSON
    )  # {"eta_changes": [...], "new_segments": [...]}

    # Relationships
    route_plan: Mapped["RoutePlan"] = relationship("RoutePlan", back_populates="updates")

    def __repr__(self) -> str:
        return (
            f"<RoutePlanUpdate(id={self.id}, update_id='{self.update_id}', "
            f"type='{self.update_type}', replan={self.replan_triggered})>"
        )
