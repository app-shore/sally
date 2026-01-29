"""RouteSegment model for individual segments in a route plan."""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class RouteSegment(Base, TimestampMixin):
    """RouteSegment model representing a single segment in a route plan (drive, rest, fuel, dock)."""

    __tablename__ = "route_segments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    segment_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("route_plans.id"), index=True, nullable=False
    )

    # Sequence
    sequence_order: Mapped[int] = mapped_column(
        Integer, nullable=False, index=True
    )  # 1, 2, 3...

    # Locations (string identifiers or names)
    from_location: Mapped[str | None] = mapped_column(String(255))  # stop_id or location name
    to_location: Mapped[str | None] = mapped_column(String(255))
    from_lat_lon: Mapped[dict | None] = mapped_column(JSON)  # {"lat": float, "lon": float}
    to_lat_lon: Mapped[dict | None] = mapped_column(JSON)

    # Optional foreign keys to Stop model (if locations are stops)
    from_stop_id: Mapped[int | None] = mapped_column(ForeignKey("stops.id"), index=True)
    to_stop_id: Mapped[int | None] = mapped_column(ForeignKey("stops.id"), index=True)

    # Segment type
    segment_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # drive, rest, fuel, dock

    # Drive segment data
    distance_miles: Mapped[float | None] = mapped_column(Float)
    drive_time_hours: Mapped[float | None] = mapped_column(Float)
    expected_speed_mph: Mapped[float | None] = mapped_column(Float)  # For deviation monitoring

    # Rest segment data (if type=rest)
    rest_type: Mapped[str | None] = mapped_column(
        String(50)
    )  # full_rest, partial_rest, break
    rest_duration_hours: Mapped[float | None] = mapped_column(Float)
    rest_reason: Mapped[str | None] = mapped_column(
        Text
    )  # e.g., "HOS 11h drive limit reached"

    # Fuel segment data (if type=fuel)
    fuel_gallons: Mapped[float | None] = mapped_column(Float)
    fuel_cost_estimate: Mapped[float | None] = mapped_column(Float)
    fuel_station_name: Mapped[str | None] = mapped_column(String(255))

    # Dock segment data (if type=dock)
    dock_duration_hours: Mapped[float | None] = mapped_column(Float)
    customer_name: Mapped[str | None] = mapped_column(String(255))
    appointment_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # HOS state after this segment
    hos_state_after: Mapped[dict | None] = mapped_column(
        JSON
    )  # {"hours_driven": 2.0, "on_duty_time": 2.0, "hours_since_break": 2.0}

    # Time estimates
    estimated_arrival: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    estimated_departure: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    actual_arrival: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )  # For tracking
    actual_departure: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Status
    status: Mapped[str] = mapped_column(
        String(50), default="planned", nullable=False, index=True
    )  # planned, in_progress, completed, skipped

    # Relationships
    route_plan: Mapped["RoutePlan"] = relationship("RoutePlan", back_populates="segments")
    from_stop: Mapped["Stop"] = relationship(
        "Stop", foreign_keys=[from_stop_id], overlaps="from_stop,to_stop"
    )
    to_stop: Mapped["Stop"] = relationship(
        "Stop", foreign_keys=[to_stop_id], overlaps="from_stop,to_stop"
    )

    def __repr__(self) -> str:
        return (
            f"<RouteSegment(id={self.id}, segment_id='{self.segment_id}', "
            f"type='{self.segment_type}', sequence={self.sequence_order}, "
            f"from='{self.from_location}', to='{self.to_location}')>"
        )
