"""Scenario model for pre-configured test scenarios."""

from typing import List

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Scenario(Base, TimestampMixin):
    """Scenario model representing a pre-configured test scenario template."""

    __tablename__ = "scenarios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    scenario_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    # Scenario identity
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # simple, hos_constrained, fuel_constrained, complex

    # Linked driver and vehicle (NEW)
    driver_id: Mapped[str | None] = mapped_column(String(50), nullable=True)  # DRV-001
    vehicle_id: Mapped[str | None] = mapped_column(String(50), nullable=True)  # VEH-001

    # Template data (JSON)
    driver_state_template: Mapped[dict] = mapped_column(
        JSON, nullable=False
    )  # {hours_driven: 1.0, on_duty_time: 1.0, ...}
    vehicle_state_template: Mapped[dict] = mapped_column(
        JSON, nullable=False
    )  # {fuel_capacity: 200, current_fuel: 180, mpg: 6.5}
    stops_template: Mapped[List[dict]] = mapped_column(
        JSON, nullable=False
    )  # List of stop configurations

    # Expected outcomes (for validation)
    expected_rest_stops: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    expected_fuel_stops: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    expected_violations: Mapped[List[str] | None] = mapped_column(
        JSON
    )  # List of expected violation types

    # Metadata
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    def __repr__(self) -> str:
        return (
            f"<Scenario(id={self.id}, scenario_id='{self.scenario_id}', "
            f"name='{self.name}', category='{self.category}')>"
        )
