"""Vehicle model."""

from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, Float, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.route import Route
    from app.models.route_plan import RoutePlan


class Vehicle(Base, TimestampMixin):
    """Vehicle model representing a truck/equipment."""

    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    vehicle_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    unit_number: Mapped[str] = mapped_column(String(50), nullable=False)
    make: Mapped[str | None] = mapped_column(String(50))
    model: Mapped[str | None] = mapped_column(String(50))
    year: Mapped[int | None] = mapped_column()
    vin: Mapped[str | None] = mapped_column(String(17), unique=True)
    license_plate: Mapped[str | None] = mapped_column(String(20))

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Vehicle specs (NEW - for route planning)
    fuel_capacity_gallons: Mapped[float | None] = mapped_column(Float)
    current_fuel_gallons: Mapped[float | None] = mapped_column(Float)
    mpg: Mapped[float | None] = mapped_column(Float)  # Miles per gallon

    # Relationships
    routes: Mapped[List["Route"]] = relationship("Route", back_populates="vehicle")
    route_plans: Mapped[List["RoutePlan"]] = relationship(
        "RoutePlan", back_populates="vehicle", foreign_keys="RoutePlan.vehicle_id"
    )

    def __repr__(self) -> str:
        return f"<Vehicle(id={self.id}, vehicle_id='{self.vehicle_id}', unit='{self.unit_number}')>"
