"""Loads API endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models import Load, LoadStop, Stop
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


# ============================================================================
# Pydantic Schemas
# ============================================================================


class LoadStopCreate(BaseModel):
    """Schema for creating a load stop."""

    stop_id: str
    sequence_order: int
    action_type: str = Field(..., pattern="^(pickup|delivery|both)$")
    earliest_arrival: Optional[str] = None  # HH:MM format
    latest_arrival: Optional[str] = None
    estimated_dock_hours: float = Field(ge=0)


class LoadCreate(BaseModel):
    """Schema for creating a load."""

    load_number: str
    weight_lbs: float = Field(gt=0)
    commodity_type: str
    special_requirements: Optional[str] = None
    customer_name: str
    stops: List[LoadStopCreate]


class LoadStopResponse(BaseModel):
    """Schema for load stop response."""

    id: int
    stop_id: int
    sequence_order: int
    action_type: str
    earliest_arrival: Optional[str]
    latest_arrival: Optional[str]
    estimated_dock_hours: float
    actual_dock_hours: Optional[float]

    # Stop details (joined)
    stop_name: Optional[str] = None
    stop_city: Optional[str] = None
    stop_state: Optional[str] = None
    stop_address: Optional[str] = None

    class Config:
        from_attributes = True


class LoadResponse(BaseModel):
    """Schema for load response."""

    id: int
    load_id: str
    load_number: str
    status: str
    weight_lbs: float
    commodity_type: str
    special_requirements: Optional[str]
    customer_name: str
    is_active: bool
    created_at: str
    updated_at: str

    # Relationships
    stops: List[LoadStopResponse] = []

    class Config:
        from_attributes = True


class LoadListResponse(BaseModel):
    """Schema for load list response."""

    id: int
    load_id: str
    load_number: str
    status: str
    customer_name: str
    stop_count: int
    weight_lbs: float
    commodity_type: str

    class Config:
        from_attributes = True


# ============================================================================
# Endpoints
# ============================================================================


@router.post("/", response_model=LoadResponse, status_code=201)
async def create_load(
    load_data: LoadCreate,
    db: AsyncSession = Depends(get_db),
) -> LoadResponse:
    """
    Create a new load with stops.

    Args:
        load_data: Load creation data including stops
        db: Database session

    Returns:
        Created load with stops

    Raises:
        HTTPException: If validation fails or stops not found
    """
    logger.info("create_load_started", load_number=load_data.load_number)

    try:
        # Generate load_id
        load_id = f"LOAD-{load_data.load_number}"

        # Validate stops exist
        stop_ids = [stop.stop_id for stop in load_data.stops]
        result = await db.execute(
            select(Stop).where(Stop.stop_id.in_(stop_ids))
        )
        stops = {stop.stop_id: stop for stop in result.scalars().all()}

        if len(stops) != len(stop_ids):
            missing = set(stop_ids) - set(stops.keys())
            raise HTTPException(
                status_code=404,
                detail=f"Stops not found: {', '.join(missing)}",
            )

        # Create load
        load = Load(
            load_id=load_id,
            load_number=load_data.load_number,
            status="pending",
            weight_lbs=load_data.weight_lbs,
            commodity_type=load_data.commodity_type,
            special_requirements=load_data.special_requirements,
            customer_name=load_data.customer_name,
            is_active=True,
        )

        db.add(load)
        await db.flush()

        # Create load stops
        for stop_data in load_data.stops:
            stop = stops[stop_data.stop_id]

            load_stop = LoadStop(
                load_id=load.id,
                stop_id=stop.id,
                sequence_order=stop_data.sequence_order,
                action_type=stop_data.action_type,
                earliest_arrival=stop_data.earliest_arrival,
                latest_arrival=stop_data.latest_arrival,
                estimated_dock_hours=stop_data.estimated_dock_hours,
            )
            db.add(load_stop)

        await db.commit()
        await db.refresh(load)

        # Load with relationships for response
        result = await db.execute(
            select(Load)
            .options(selectinload(Load.stops).selectinload(LoadStop.stop))
            .where(Load.id == load.id)
        )
        load = result.scalar_one()

        logger.info("create_load_completed", load_id=load.load_id, stop_count=len(load.stops))

        return _format_load_response(load)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_load_failed", error=str(e))
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[LoadListResponse])
async def list_loads(
    status: Optional[str] = Query(None, description="Filter by status"),
    customer_name: Optional[str] = Query(None, description="Filter by customer"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> List[LoadListResponse]:
    """
    List all loads with optional filtering.

    Args:
        status: Filter by load status
        customer_name: Filter by customer name
        limit: Maximum number of results
        offset: Pagination offset
        db: Database session

    Returns:
        List of loads
    """
    logger.info("list_loads_started", status=status, customer=customer_name)

    query = select(Load).options(selectinload(Load.stops))

    if status:
        query = query.where(Load.status == status)
    if customer_name:
        query = query.where(Load.customer_name.ilike(f"%{customer_name}%"))

    query = query.offset(offset).limit(limit).order_by(Load.created_at.desc())

    result = await db.execute(query)
    loads = result.scalars().all()

    response = [
        LoadListResponse(
            id=load.id,
            load_id=load.load_id,
            load_number=load.load_number,
            status=load.status,
            customer_name=load.customer_name,
            stop_count=len(load.stops),
            weight_lbs=load.weight_lbs,
            commodity_type=load.commodity_type,
        )
        for load in loads
    ]

    logger.info("list_loads_completed", count=len(response))
    return response


@router.get("/{load_id}", response_model=LoadResponse)
async def get_load(
    load_id: str,
    db: AsyncSession = Depends(get_db),
) -> LoadResponse:
    """
    Get load details with stops.

    Args:
        load_id: Load ID
        db: Database session

    Returns:
        Load with stops

    Raises:
        HTTPException: If load not found
    """
    logger.info("get_load_started", load_id=load_id)

    result = await db.execute(
        select(Load)
        .options(selectinload(Load.stops).selectinload(LoadStop.stop))
        .where(Load.load_id == load_id)
    )
    load = result.scalar_one_or_none()

    if not load:
        raise HTTPException(status_code=404, detail=f"Load not found: {load_id}")

    logger.info("get_load_completed", load_id=load_id)
    return _format_load_response(load)


# ============================================================================
# Helper Functions
# ============================================================================


def _format_load_response(load: Load) -> LoadResponse:
    """Format load model to response schema."""
    stops_data = []
    for load_stop in sorted(load.stops, key=lambda s: s.sequence_order):
        stop = load_stop.stop
        stops_data.append(
            LoadStopResponse(
                id=load_stop.id,
                stop_id=load_stop.stop_id,
                sequence_order=load_stop.sequence_order,
                action_type=load_stop.action_type,
                earliest_arrival=load_stop.earliest_arrival.isoformat() if load_stop.earliest_arrival else None,
                latest_arrival=load_stop.latest_arrival.isoformat() if load_stop.latest_arrival else None,
                estimated_dock_hours=load_stop.estimated_dock_hours,
                actual_dock_hours=load_stop.actual_dock_hours,
                stop_name=stop.name if stop else None,
                stop_city=stop.city if stop else None,
                stop_state=stop.state if stop else None,
                stop_address=stop.address if stop else None,
            )
        )

    return LoadResponse(
        id=load.id,
        load_id=load.load_id,
        load_number=load.load_number,
        status=load.status,
        weight_lbs=load.weight_lbs,
        commodity_type=load.commodity_type,
        special_requirements=load.special_requirements,
        customer_name=load.customer_name,
        is_active=load.is_active,
        created_at=load.created_at.isoformat(),
        updated_at=load.updated_at.isoformat(),
        stops=stops_data,
    )
