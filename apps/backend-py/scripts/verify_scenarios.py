"""Verify scenarios in database."""
import asyncio
from sqlalchemy import select
from app.models.scenario import Scenario
from app.models.load import Load
from app.db.database import async_session_maker


async def verify():
    """Check scenarios and loads in database."""
    async with async_session_maker() as db:
        # Check scenarios
        result = await db.execute(select(Scenario))
        scenarios = result.scalars().all()
        print(f"\n✓ Scenarios: {len(scenarios)}")
        for s in scenarios:
            print(f"  - {s.scenario_id}: {s.name}")
            print(f"    Driver: {s.driver_id}, Vehicle: {s.vehicle_id}")

        # Check loads
        result = await db.execute(select(Load))
        loads = result.scalars().all()
        print(f"\n✓ Loads: {len(loads)}")
        for load in loads:
            print(f"  - {load.load_id}: {load.load_number} - {load.customer_name}")


if __name__ == "__main__":
    asyncio.run(verify())
