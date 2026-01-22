"""Vehicle model."""

from typing import List

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


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

    # Relationships
    routes: Mapped[List["Route"]] = relationship("Route", back_populates="vehicle")

    def __repr__(self) -> str:
        return f"<Vehicle(id={self.id}, vehicle_id='{self.vehicle_id}', unit='{self.unit_number}')>"
