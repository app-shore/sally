"""Stop model for route planning locations."""

from datetime import time
from typing import TYPE_CHECKING, List

from sqlalchemy import Float, String, Text, Time
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.route_segment import RouteSegment


class Stop(Base, TimestampMixin):
    """Stop model representing a location in a route (warehouse, customer, truck stop, etc.)."""

    __tablename__ = "stops"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    stop_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    # Location
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(String(500))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(50))
    zip_code: Mapped[str | None] = mapped_column(String(20))
    lat_lon: Mapped[dict | None] = mapped_column(JSON)  # {"lat": float, "lon": float}

    # Stop type
    location_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # warehouse, customer, distribution_center, truck_stop, service_area, fuel_station

    # Time windows (nullable for flexible stops)
    earliest_arrival: Mapped[time | None] = mapped_column(Time)
    latest_arrival: Mapped[time | None] = mapped_column(Time)

    # Dock info (if type=warehouse/customer/distribution_center)
    average_dock_time_hours: Mapped[float | None] = mapped_column(Float)
    dock_notes: Mapped[str | None] = mapped_column(Text)

    # Fuel info (if type=fuel_station)
    fuel_price_per_gallon: Mapped[float | None] = mapped_column(Float)
    last_price_update: Mapped[str | None] = mapped_column(String(50))  # timestamp as string

    # Metadata
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships - many-to-many through RouteSegment
    # Note: We'll access segments through from_stop_id and to_stop_id in RouteSegment

    def __repr__(self) -> str:
        return f"<Stop(id={self.id}, stop_id='{self.stop_id}', name='{self.name}', type='{self.location_type}')>"
