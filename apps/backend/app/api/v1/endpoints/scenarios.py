"""Scenarios API endpoints for test scenario templates."""

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models import Scenario
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


# ============================================================================
# Pydantic Schemas
# ============================================================================


class ScenarioResponse(BaseModel):
    """Schema for scenario response."""

    id: int
    scenario_id: str
    name: str
    description: str
    category: str
    driver_state_template: Dict[str, Any]
    vehicle_state_template: Dict[str, Any]
    stops_template: List[Dict[str, Any]]
    expected_rest_stops: int
    expected_fuel_stops: int
    expected_violations: List[str]
    is_active: bool
    display_order: int

    class Config:
        from_attributes = True


class ScenarioListResponse(BaseModel):
    """Schema for scenario list response (simplified)."""

    id: int
    scenario_id: str
    name: str
    description: str
    category: str
    expected_rest_stops: int
    expected_fuel_stops: int
    display_order: int

    class Config:
        from_attributes = True


class ScenarioStateResponse(BaseModel):
    """Schema for scenario state with driver and vehicle IDs."""

    driver_id: str | None
    vehicle_id: str | None
    driver_state: Dict[str, float]
    vehicle_state: Dict[str, float]


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/", response_model=List[ScenarioListResponse])
async def list_scenarios(
    category: str = None,
    db: AsyncSession = Depends(get_db),
) -> List[ScenarioListResponse]:
    """
    List all test scenarios.

    Args:
        category: Optional filter by category (simple, hos_constrained, fuel_constrained, complex)
        db: Database session

    Returns:
        List of scenarios
    """
    logger.info("list_scenarios_started", category=category)

    query = select(Scenario).where(Scenario.is_active == True)

    if category:
        query = query.where(Scenario.category == category)

    query = query.order_by(Scenario.display_order)

    result = await db.execute(query)
    scenarios = result.scalars().all()

    response = [
        ScenarioListResponse(
            id=scenario.id,
            scenario_id=scenario.scenario_id,
            name=scenario.name,
            description=scenario.description,
            category=scenario.category,
            expected_rest_stops=scenario.expected_rest_stops,
            expected_fuel_stops=scenario.expected_fuel_stops,
            display_order=scenario.display_order,
        )
        for scenario in scenarios
    ]

    logger.info("list_scenarios_completed", count=len(response))
    return response


@router.get("/{scenario_id}", response_model=ScenarioResponse)
async def get_scenario(
    scenario_id: str,
    db: AsyncSession = Depends(get_db),
) -> ScenarioResponse:
    """
    Get scenario template details.

    Args:
        scenario_id: Scenario ID
        db: Database session

    Returns:
        Scenario template with full data

    Raises:
        HTTPException: If scenario not found
    """
    logger.info("get_scenario_started", scenario_id=scenario_id)

    result = await db.execute(
        select(Scenario).where(Scenario.scenario_id == scenario_id)
    )
    scenario = result.scalar_one_or_none()

    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario not found: {scenario_id}")

    logger.info("get_scenario_completed", scenario_id=scenario_id)

    return ScenarioResponse(
        id=scenario.id,
        scenario_id=scenario.scenario_id,
        name=scenario.name,
        description=scenario.description,
        category=scenario.category,
        driver_state_template=scenario.driver_state_template,
        vehicle_state_template=scenario.vehicle_state_template,
        stops_template=scenario.stops_template,
        expected_rest_stops=scenario.expected_rest_stops,
        expected_fuel_stops=scenario.expected_fuel_stops,
        expected_violations=scenario.expected_violations or [],
        is_active=scenario.is_active,
        display_order=scenario.display_order,
    )


@router.post("/{scenario_id}/instantiate", response_model=ScenarioStateResponse)
async def instantiate_scenario(
    scenario_id: str,
    db: AsyncSession = Depends(get_db),
) -> ScenarioStateResponse:
    """
    Load driver and vehicle state from scenario.

    Scenarios provide pre-configured driver and vehicle states for testing.
    Stops always come from the selected load, not the scenario.

    Args:
        scenario_id: Scenario ID
        db: Database session

    Returns:
        Driver and vehicle state only (no stops)

    Raises:
        HTTPException: If scenario not found
    """
    logger.info("instantiate_scenario_started", scenario_id=scenario_id)

    result = await db.execute(
        select(Scenario).where(Scenario.scenario_id == scenario_id)
    )
    scenario = result.scalar_one_or_none()

    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario not found: {scenario_id}")

    # Return driver/vehicle IDs and states (NO stops)
    response = ScenarioStateResponse(
        driver_id=scenario.driver_id,
        vehicle_id=scenario.vehicle_id,
        driver_state=scenario.driver_state_template,
        vehicle_state=scenario.vehicle_state_template,
    )

    logger.info(
        "instantiate_scenario_completed",
        scenario_id=scenario_id,
        driver_id=scenario.driver_id,
        vehicle_id=scenario.vehicle_id,
    )

    return response
