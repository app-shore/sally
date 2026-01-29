"""RoutePlan model for storing optimized route plans."""

from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.driver import Driver
    from app.models.load import Load
    from app.models.route import Route
    from app.models.route_plan_update import RoutePlanUpdate
    from app.models.route_segment import RouteSegment
    from app.models.vehicle import Vehicle


class RoutePlan(Base, TimestampMixin):
    """RoutePlan model representing an optimized route plan with segments and compliance data."""

    __tablename__ = "route_plans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    plan_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    # Identity
    route_id: Mapped[int | None] = mapped_column(
        ForeignKey("routes.id"), index=True
    )  # Optional link to historical route
    load_id: Mapped[int | None] = mapped_column(
        ForeignKey("loads.id"), index=True
    )  # Optional link to load
    driver_id: Mapped[int] = mapped_column(ForeignKey("drivers.id"), index=True, nullable=False)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), index=True, nullable=False)

    # Metadata
    plan_version: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False
    )  # 1, 2, 3... for re-plans
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )  # Only one active plan per route
    status: Mapped[str] = mapped_column(
        String(50), default="draft", nullable=False, index=True
    )  # draft, active, completed, cancelled

    # Optimization inputs
    optimization_priority: Mapped[str] = mapped_column(
        String(50), default="minimize_time", nullable=False
    )  # minimize_time, minimize_cost, balance

    # Optimization results
    total_distance_miles: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_drive_time_hours: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_on_duty_time_hours: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_cost_estimate: Mapped[float | None] = mapped_column(Float)  # fuel + tolls

    # Feasibility
    is_feasible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    feasibility_issues: Mapped[dict | None] = mapped_column(
        JSON
    )  # Array of constraint violations as dict

    # Compliance summary
    compliance_report: Mapped[dict | None] = mapped_column(
        JSON
    )  # {"max_drive_hours_used": 10.5, "max_duty_hours_used": 13.0, ...}

    # Timestamps
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    driver: Mapped["Driver"] = relationship(
        "Driver", back_populates="route_plans", foreign_keys=[driver_id]
    )
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="route_plans")
    route: Mapped["Route"] = relationship(
        "Route", back_populates="route_plans", foreign_keys=[route_id]
    )
    load: Mapped["Load"] = relationship(
        "Load", back_populates="route_plans", foreign_keys=[load_id]
    )
    segments: Mapped[List["RouteSegment"]] = relationship(
        "RouteSegment", back_populates="route_plan", cascade="all, delete-orphan"
    )
    updates: Mapped[List["RoutePlanUpdate"]] = relationship(
        "RoutePlanUpdate", back_populates="route_plan", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<RoutePlan(id={self.id}, plan_id='{self.plan_id}', "
            f"version={self.plan_version}, driver_id={self.driver_id}, status='{self.status}')>"
        )
