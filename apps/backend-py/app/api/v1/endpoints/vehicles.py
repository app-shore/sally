"""API endpoints for vehicles."""

from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models import Vehicle
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class VehicleListResponse(BaseModel):
    """Schema for vehicle list response."""

    id: int
    vehicle_id: str
    unit_number: str
    fuel_capacity_gallons: float | None
    current_fuel_gallons: float | None
    mpg: float | None

    class Config:
        from_attributes = True


@router.get("/", response_model=List[VehicleListResponse])
async def list_vehicles(
    db: AsyncSession = Depends(get_db),
) -> List[VehicleListResponse]:
    """
    List all vehicles.

    Args:
        db: Database session

    Returns:
        List of vehicles
    """
    logger.info("list_vehicles_started")

    query = select(Vehicle).where(Vehicle.is_active == True)
    query = query.order_by(Vehicle.vehicle_id)

    result = await db.execute(query)
    vehicles = result.scalars().all()

    response = [
        VehicleListResponse(
            id=vehicle.id,
            vehicle_id=vehicle.vehicle_id,
            unit_number=vehicle.unit_number,
            fuel_capacity_gallons=vehicle.fuel_capacity_gallons,
            current_fuel_gallons=vehicle.current_fuel_gallons,
            mpg=vehicle.mpg,
        )
        for vehicle in vehicles
    ]

    logger.info("list_vehicles_completed", count=len(response))
    return response
