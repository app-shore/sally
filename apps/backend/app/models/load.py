"""Load model for freight shipments with pickup/delivery stops."""

from typing import TYPE_CHECKING, List

from sqlalchemy import Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.load_stop import LoadStop
    from app.models.route_plan import RoutePlan


class Load(Base, TimestampMixin):
    """Load model representing a freight shipment with multiple stops."""

    __tablename__ = "loads"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    load_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    # Load identity
    load_number: Mapped[str] = mapped_column(String(100), nullable=False)  # Customer reference
    status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False, index=True
    )  # pending, planned, active, completed, cancelled

    # Load details
    weight_lbs: Mapped[float] = mapped_column(Float, nullable=False)
    commodity_type: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # general, hazmat, refrigerated, fragile
    special_requirements: Mapped[str | None] = mapped_column(Text)

    # Customer (simplified for MVP)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Metadata
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships
    stops: Mapped[List["LoadStop"]] = relationship(
        "LoadStop",
        back_populates="load",
        cascade="all, delete-orphan",
        order_by="LoadStop.sequence_order",
    )
    route_plans: Mapped[List["RoutePlan"]] = relationship(
        "RoutePlan", back_populates="load", foreign_keys="RoutePlan.load_id"
    )

    def __repr__(self) -> str:
        return (
            f"<Load(id={self.id}, load_id='{self.load_id}', "
            f"load_number='{self.load_number}', status='{self.status}')>"
        )
