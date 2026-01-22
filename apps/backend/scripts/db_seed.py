"""Database seeding script for development and testing."""

import asyncio
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.constants import DutyStatus
from app.db.database import async_session_maker, init_db
from app.models import Driver, Event, Route, Vehicle
from app.utils.logger import get_logger, setup_logging

setup_logging()
logger = get_logger(__name__)


async def seed_database() -> None:
    """Seed database with sample data."""
    logger.info("database_seed_started")

    try:
        # Initialize database connection
        await init_db()

        async with async_session_maker() as session:
            await seed_drivers(session)
            await seed_vehicles(session)
            await seed_routes(session)
            await session.commit()

        logger.info("database_seed_completed")

    except Exception as e:
        logger.error("database_seed_failed", error=str(e))
        raise


async def seed_drivers(session: AsyncSession) -> None:
    """Seed driver data."""
    drivers = [
        Driver(
            driver_id="DRV-001",
            name="John Smith",
            email="john.smith@example.com",
            phone="555-0101",
            current_duty_status=DutyStatus.DRIVING,
            hours_driven_today=8.5,
            on_duty_time_today=10.0,
            hours_since_break=6.0,
            last_break_duration=0.5,
            last_rest_period=10.0,
            duty_status_changed_at=datetime.now(timezone.utc),
            is_active=True,
        ),
        Driver(
            driver_id="DRV-002",
            name="Sarah Johnson",
            email="sarah.johnson@example.com",
            phone="555-0102",
            current_duty_status=DutyStatus.ON_DUTY_NOT_DRIVING,
            hours_driven_today=5.0,
            on_duty_time_today=7.5,
            hours_since_break=3.0,
            last_rest_period=10.0,
            duty_status_changed_at=datetime.now(timezone.utc),
            is_active=True,
        ),
        Driver(
            driver_id="DRV-003",
            name="Mike Davis",
            email="mike.davis@example.com",
            phone="555-0103",
            current_duty_status=DutyStatus.SLEEPER_BERTH,
            hours_driven_today=0.0,
            on_duty_time_today=0.0,
            hours_since_break=0.0,
            last_rest_period=10.0,
            duty_status_changed_at=datetime.now(timezone.utc),
            is_active=True,
        ),
    ]

    session.add_all(drivers)
    await session.flush()
    logger.info("drivers_seeded", count=len(drivers))


async def seed_vehicles(session: AsyncSession) -> None:
    """Seed vehicle data."""
    vehicles = [
        Vehicle(
            vehicle_id="VEH-001",
            unit_number="TRUCK-101",
            make="Freightliner",
            model="Cascadia",
            year=2022,
            vin="1FUJGHDV8NLBK1234",
            license_plate="ABC123",
            is_active=True,
        ),
        Vehicle(
            vehicle_id="VEH-002",
            unit_number="TRUCK-102",
            make="Kenworth",
            model="T680",
            year=2023,
            vin="1XKYDP9X5NJ456789",
            license_plate="XYZ789",
            is_active=True,
        ),
    ]

    session.add_all(vehicles)
    await session.flush()
    logger.info("vehicles_seeded", count=len(vehicles))


async def seed_routes(session: AsyncSession) -> None:
    """Seed route data."""
    # Get vehicles for foreign key references
    from sqlalchemy import select

    result = await session.execute(select(Vehicle))
    vehicles = list(result.scalars().all())

    if not vehicles:
        logger.warning("no_vehicles_found", message="Cannot seed routes without vehicles")
        return

    routes = [
        Route(
            route_id="ROUTE-001",
            origin="Los Angeles, CA",
            destination="Phoenix, AZ",
            total_distance_miles=375.0,
            remaining_distance_miles=150.0,
            estimated_duration_hours=6.5,
            dock_location="Phoenix Distribution Center",
            dock_duration_hours=10.0,
            is_at_dock=True,
            status="at_dock",
            vehicle_id=vehicles[0].id,
        ),
        Route(
            route_id="ROUTE-002",
            origin="Chicago, IL",
            destination="New York, NY",
            total_distance_miles=790.0,
            remaining_distance_miles=450.0,
            estimated_duration_hours=12.0,
            status="in_progress",
            vehicle_id=vehicles[1].id,
        ),
    ]

    session.add_all(routes)
    await session.flush()
    logger.info("routes_seeded", count=len(routes))


if __name__ == "__main__":
    asyncio.run(seed_database())
