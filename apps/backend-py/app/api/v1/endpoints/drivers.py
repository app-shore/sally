"""API endpoints for drivers."""

from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models import Driver
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class DriverListResponse(BaseModel):
    """Schema for driver list response."""

    id: int
    driver_id: str
    name: str
    hours_driven_today: float
    on_duty_time_today: float
    hours_since_break: float
    current_duty_status: str

    class Config:
        from_attributes = True


@router.get("/", response_model=List[DriverListResponse])
async def list_drivers(
    status: str = None,
    db: AsyncSession = Depends(get_db),
) -> List[DriverListResponse]:
    """
    List all drivers.

    Args:
        status: Optional filter by current_duty_status
        db: Database session

    Returns:
        List of drivers
    """
    logger.info("list_drivers_started", status=status)

    query = select(Driver).where(Driver.is_active == True)

    if status:
        query = query.where(Driver.current_duty_status == status)

    query = query.order_by(Driver.driver_id)

    result = await db.execute(query)
    drivers = result.scalars().all()

    response = [
        DriverListResponse(
            id=driver.id,
            driver_id=driver.driver_id,
            name=driver.name,
            hours_driven_today=driver.hours_driven_today,
            on_duty_time_today=driver.on_duty_time_today,
            hours_since_break=driver.hours_since_break,
            current_duty_status=driver.current_duty_status,
        )
        for driver in drivers
    ]

    logger.info("list_drivers_completed", count=len(response))
    return response
