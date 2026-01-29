"""Database seeding script for development and testing."""

import asyncio
from datetime import datetime, time, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.constants import DutyStatus
from app.db.database import async_session_maker, init_db
from app.models import Driver, Event, Route, Vehicle, Stop, RoutePlan, RouteSegment, RoutePlanUpdate, Load, LoadStop, Scenario
from app.utils.logger import get_logger, setup_logging

setup_logging()
logger = get_logger(__name__)


async def clear_database(session: AsyncSession) -> None:
    """Clear all existing data from tables (in correct order for foreign keys)."""
    logger.info("clearing_existing_data")

    # Delete in order respecting foreign keys
    await session.execute(text("DELETE FROM route_plan_updates"))
    await session.execute(text("DELETE FROM route_segments"))
    await session.execute(text("DELETE FROM route_plans"))
    await session.execute(text("DELETE FROM load_stops"))
    await session.execute(text("DELETE FROM loads"))
    await session.execute(text("DELETE FROM scenarios"))
    await session.execute(text("DELETE FROM events"))
    await session.execute(text("DELETE FROM routes"))
    await session.execute(text("DELETE FROM stops"))
    await session.execute(text("DELETE FROM vehicles"))
    await session.execute(text("DELETE FROM drivers"))
    await session.commit()

    logger.info("existing_data_cleared")


async def seed_database() -> None:
    """Seed database with sample data."""
    logger.info("database_seed_started")

    try:
        # Initialize database connection
        await init_db()

        async with async_session_maker() as session:
            # Clear existing data first
            await clear_database(session)

            # Seed fresh data
            await seed_drivers(session)
            await seed_vehicles(session)
            await seed_routes(session)
            await seed_stops(session)
            await seed_scenarios(session)  # NEW: Test scenarios
            await seed_loads(session)  # NEW: Sample loads
            await seed_route_plans(session)  # NEW: Route planning data
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


async def seed_stops(session: AsyncSession) -> None:
    """Seed stop/location data for route planning."""
    stops = [
        # Warehouses
        Stop(
            stop_id="STOP-WH-001",
            name="Chicago Distribution Center",
            address="1000 W Distribution Dr",
            city="Chicago",
            state="IL",
            zip_code="60601",
            lat_lon={"lat": 41.8781, "lon": -87.6298},
            location_type="warehouse",
            earliest_arrival=time(6, 0),
            latest_arrival=time(18, 0),
            average_dock_time_hours=2.0,
            dock_notes="Warehouse accepts deliveries 6am-6pm, 2-hour average dock time",
        ),
        Stop(
            stop_id="STOP-WH-002",
            name="Los Angeles Warehouse",
            address="2000 E Warehouse Blvd",
            city="Los Angeles",
            state="CA",
            zip_code="90001",
            lat_lon={"lat": 34.0522, "lon": -118.2437},
            location_type="warehouse",
            earliest_arrival=time(5, 0),
            latest_arrival=time(20, 0),
            average_dock_time_hours=1.5,
        ),
        Stop(
            stop_id="STOP-WH-003",
            name="Phoenix Distribution",
            address="500 S Industrial Pkwy",
            city="Phoenix",
            state="AZ",
            zip_code="85003",
            lat_lon={"lat": 33.4484, "lon": -112.074},
            location_type="warehouse",
            average_dock_time_hours=2.5,
        ),
        # Customers
        Stop(
            stop_id="STOP-CUS-001",
            name="Boston Customer - ABC Corp",
            address="100 Commercial St",
            city="Boston",
            state="MA",
            zip_code="02108",
            lat_lon={"lat": 42.3601, "lon": -71.0589},
            location_type="customer",
            earliest_arrival=time(8, 0),
            latest_arrival=time(16, 0),
            average_dock_time_hours=1.0,
            dock_notes="Customer requires delivery 8am-4pm, 1-hour dock time",
        ),
        Stop(
            stop_id="STOP-CUS-002",
            name="Indianapolis Customer - XYZ Inc",
            address="200 Commerce Ave",
            city="Indianapolis",
            state="IN",
            zip_code="46204",
            lat_lon={"lat": 39.7684, "lon": -86.158},
            location_type="customer",
            average_dock_time_hours=0.75,
        ),
        # Truck Stops (for rest)
        Stop(
            stop_id="STOP-TS-001",
            name="Pilot Travel Center - I-80 Exit 45",
            address="I-80 Exit 45",
            city="Joliet",
            state="IL",
            zip_code="60435",
            lat_lon={"lat": 41.525, "lon": -88.0817},
            location_type="truck_stop",
            dock_notes="24/7 truck parking, showers, restaurant",
        ),
        Stop(
            stop_id="STOP-TS-002",
            name="Love's Travel Stop - I-70 Exit 221",
            address="I-70 Exit 221",
            city="Kansas City",
            state="KS",
            zip_code="66111",
            lat_lon={"lat": 39.1142, "lon": -94.6275},
            location_type="truck_stop",
        ),
        Stop(
            stop_id="STOP-TS-003",
            name="TA Truck Stop - I-40 Exit 150",
            address="I-40 Exit 150",
            city="Amarillo",
            state="TX",
            zip_code="79102",
            lat_lon={"lat": 35.222, "lon": -101.8313},
            location_type="truck_stop",
        ),
        Stop(
            stop_id="STOP-TS-004",
            name="Flying J - I-15 Exit 112",
            address="I-15 Exit 112",
            city="Las Vegas",
            state="NV",
            zip_code="89101",
            lat_lon={"lat": 36.1699, "lon": -115.1398},
            location_type="truck_stop",
        ),
        Stop(
            stop_id="STOP-TS-005",
            name="Petro Stopping Center - I-10 Exit 198",
            address="I-10 Exit 198",
            city="Tucson",
            state="AZ",
            zip_code="85701",
            lat_lon={"lat": 32.2217, "lon": -110.9265},
            location_type="truck_stop",
        ),
        # Fuel Stations
        Stop(
            stop_id="STOP-FUEL-001",
            name="Pilot Fuel - Exit 45",
            address="I-80 Exit 45",
            city="Joliet",
            state="IL",
            zip_code="60435",
            lat_lon={"lat": 41.525, "lon": -88.0817},
            location_type="fuel_station",
            fuel_price_per_gallon=3.89,
            last_price_update=datetime.now(timezone.utc).isoformat(),
        ),
        Stop(
            stop_id="STOP-FUEL-002",
            name="Love's Fuel - Exit 221",
            address="I-70 Exit 221",
            city="Kansas City",
            state="KS",
            zip_code="66111",
            lat_lon={"lat": 39.1142, "lon": -94.6275},
            location_type="fuel_station",
            fuel_price_per_gallon=3.79,
            last_price_update=datetime.now(timezone.utc).isoformat(),
        ),
    ]

    session.add_all(stops)
    await session.flush()
    logger.info("stops_seeded", count=len(stops))


async def seed_scenarios(session: AsyncSession) -> None:
    """Seed test scenario templates."""
    scenarios = [
        # Scenario 1: Fresh Driver - Plenty of Hours
        Scenario(
            scenario_id="SCENARIO-001",
            name="Fresh Driver - Plenty of Hours",
            description="Driver just started shift (1h driven). Full fuel tank (90%). Ideal for short/medium routes.",
            category="simple",
            driver_id="DRV-001",  # Links to specific driver
            vehicle_id="VEH-001",  # Links to specific vehicle
            driver_state_template={
                "hours_driven": 1.0,
                "on_duty_time": 1.5,
                "hours_since_break": 1.0,
            },
            vehicle_state_template={
                "fuel_capacity": 200.0,
                "current_fuel": 180.0,
                "mpg": 6.5,
            },
            stops_template=[
                {
                    "name": "Chicago Warehouse",
                    "city": "Chicago",
                    "state": "IL",
                    "action_type": "pickup",
                    "estimated_dock_hours": 1.5,
                    "distance_from_previous": 0,
                },
                {
                    "name": "Indianapolis Customer",
                    "city": "Indianapolis",
                    "state": "IN",
                    "action_type": "delivery",
                    "estimated_dock_hours": 0.75,
                    "distance_from_previous": 185,
                },
            ],
            expected_rest_stops=0,
            expected_fuel_stops=0,
            expected_violations=[],
            is_active=True,
            display_order=1,
        ),
        # Scenario 2: HOS Constrained - Near Limits
        Scenario(
            scenario_id="SCENARIO-002",
            name="HOS Constrained - Near Limits",
            description="Driver at 9h driven (needs rest soon). 75% fuel. Tests rest stop insertion for long routes.",
            category="hos_constrained",
            driver_id="DRV-002",  # Links to specific driver
            vehicle_id="VEH-002",  # Links to specific vehicle
            driver_state_template={
                "hours_driven": 9.0,
                "on_duty_time": 11.0,
                "hours_since_break": 7.5,
            },
            vehicle_state_template={
                "fuel_capacity": 200.0,
                "current_fuel": 150.0,
                "mpg": 6.5,
            },
            stops_template=[
                {
                    "name": "Chicago Warehouse",
                    "city": "Chicago",
                    "state": "IL",
                    "action_type": "pickup",
                    "estimated_dock_hours": 2.0,
                    "distance_from_previous": 0,
                },
                {
                    "name": "Indianapolis Customer",
                    "city": "Indianapolis",
                    "state": "IN",
                    "action_type": "delivery",
                    "estimated_dock_hours": 1.0,
                    "distance_from_previous": 185,
                },
                {
                    "name": "Boston Customer",
                    "city": "Boston",
                    "state": "MA",
                    "action_type": "delivery",
                    "estimated_dock_hours": 1.0,
                    "distance_from_previous": 950,
                },
            ],
            expected_rest_stops=1,
            expected_fuel_stops=0,
            expected_violations=[],
            is_active=True,
            display_order=2,
        ),
        # Scenario 3: Low Fuel - Needs Refuel
        Scenario(
            scenario_id="SCENARIO-003",
            name="Low Fuel - Needs Refuel",
            description="Fuel at 20% (40/200 gal). Driver mid-shift (3h driven). Tests fuel stop insertion logic.",
            category="fuel_constrained",
            driver_id="DRV-003",
            vehicle_id="VEH-003",
            driver_state_template={
                "hours_driven": 3.0,
                "on_duty_time": 4.0,
                "hours_since_break": 2.5,
            },
            vehicle_state_template={
                "fuel_capacity": 200.0,
                "current_fuel": 40.0,  # 20% - low!
                "mpg": 6.5,
            },
            stops_template=[
                {
                    "name": "Los Angeles Warehouse",
                    "city": "Los Angeles",
                    "state": "CA",
                    "action_type": "pickup",
                    "estimated_dock_hours": 1.5,
                    "distance_from_previous": 0,
                },
                {
                    "name": "Phoenix Distribution",
                    "city": "Phoenix",
                    "state": "AZ",
                    "action_type": "delivery",
                    "estimated_dock_hours": 1.0,
                    "distance_from_previous": 375,
                },
                {
                    "name": "Tucson Customer",
                    "city": "Tucson",
                    "state": "AZ",
                    "action_type": "delivery",
                    "estimated_dock_hours": 0.5,
                    "distance_from_previous": 120,
                },
            ],
            expected_rest_stops=0,
            expected_fuel_stops=1,
            expected_violations=[],
            is_active=True,
            display_order=3,
        ),
        # Scenario 4: Mid-Shift - Split Sleeper Candidate
        Scenario(
            scenario_id="SCENARIO-004",
            name="Mid-Shift - Split Sleeper Candidate",
            description="Driver at 6h driven, 80% fuel. Good for testing 7/3 or 8/2 split sleeper optimization.",
            category="complex",
            driver_id="DRV-004",
            vehicle_id="VEH-004",
            driver_state_template={
                "hours_driven": 6.0,
                "on_duty_time": 8.0,
                "hours_since_break": 5.5,
            },
            vehicle_state_template={
                "fuel_capacity": 200.0,
                "current_fuel": 160.0,
                "mpg": 6.5,
            },
            stops_template=[
                {
                    "name": "Chicago Warehouse",
                    "city": "Chicago",
                    "state": "IL",
                    "action_type": "pickup",
                    "estimated_dock_hours": 2.0,
                    "distance_from_previous": 0,
                },
                {
                    "name": "Indianapolis Customer",
                    "city": "Indianapolis",
                    "state": "IN",
                    "action_type": "delivery",
                    "estimated_dock_hours": 4.0,  # Long dock - split opportunity!
                    "distance_from_previous": 185,
                },
                {
                    "name": "Columbus Customer",
                    "city": "Columbus",
                    "state": "OH",
                    "action_type": "delivery",
                    "estimated_dock_hours": 1.0,
                    "distance_from_previous": 175,
                },
                {
                    "name": "Pittsburgh Customer",
                    "city": "Pittsburgh",
                    "state": "PA",
                    "action_type": "delivery",
                    "estimated_dock_hours": 0.75,
                    "distance_from_previous": 185,
                },
                {
                    "name": "Boston Distribution Center",
                    "city": "Boston",
                    "state": "MA",
                    "action_type": "delivery",
                    "estimated_dock_hours": 1.0,
                    "distance_from_previous": 565,
                },
            ],
            expected_rest_stops=1,  # Partial rest at Indianapolis
            expected_fuel_stops=0,
            expected_violations=[],
            is_active=True,
            display_order=4,
        ),
        # Scenario 5: Mid-Day - Moderate Hours Used
        Scenario(
            scenario_id="SCENARIO-005",
            name="Mid-Day - Moderate Hours Used",
            description="Driver at 6h driven, 85% fuel. Mid-shift status, good for testing time-sensitive deliveries.",
            category="complex",
            driver_id="DRV-001",
            vehicle_id="VEH-002",
            driver_state_template={
                "hours_driven": 6.0,
                "on_duty_time": 7.5,
                "hours_since_break": 5.0,
            },
            vehicle_state_template={
                "fuel_capacity": 200.0,
                "current_fuel": 170.0,
                "mpg": 6.5,
            },
            stops_template=[
                {
                    "name": "Chicago Warehouse",
                    "city": "Chicago",
                    "state": "IL",
                    "action_type": "pickup",
                    "estimated_dock_hours": 1.0,
                    "earliest_arrival": "06:00",
                    "latest_arrival": "08:00",
                    "distance_from_previous": 0,
                },
                {
                    "name": "Indianapolis Customer",
                    "city": "Indianapolis",
                    "state": "IN",
                    "action_type": "delivery",
                    "estimated_dock_hours": 0.5,
                    "earliest_arrival": "14:00",  # 2pm-4pm window
                    "latest_arrival": "16:00",
                    "distance_from_previous": 185,
                },
                {
                    "name": "Columbus Customer",
                    "city": "Columbus",
                    "state": "OH",
                    "action_type": "delivery",
                    "estimated_dock_hours": 0.75,
                    "distance_from_previous": 175,
                },
            ],
            expected_rest_stops=0,
            expected_fuel_stops=0,
            expected_violations=[],
            is_active=True,
            display_order=5,
        ),
        # Scenario 6: Urban Delivery - Duty Window Concern
        Scenario(
            scenario_id="SCENARIO-006",
            name="Urban Delivery - Duty Window Concern",
            description="Driver at 4h driven, 6h on-duty. Good for routes with multiple stops and dock time.",
            category="complex",
            driver_id="DRV-002",
            vehicle_id="VEH-003",
            driver_state_template={
                "hours_driven": 4.0,
                "on_duty_time": 6.0,
                "hours_since_break": 3.5,
            },
            vehicle_state_template={
                "fuel_capacity": 200.0,
                "current_fuel": 180.0,
                "mpg": 6.5,
            },
            stops_template=[
                {
                    "name": "Chicago Warehouse",
                    "city": "Chicago",
                    "state": "IL",
                    "action_type": "pickup",
                    "estimated_dock_hours": 1.5,
                    "distance_from_previous": 0,
                },
                {
                    "name": "Stop 1",
                    "city": "Chicago",
                    "state": "IL",
                    "action_type": "delivery",
                    "estimated_dock_hours": 1.0,
                    "distance_from_previous": 25,
                },
                {
                    "name": "Stop 2",
                    "city": "Chicago",
                    "state": "IL",
                    "action_type": "delivery",
                    "estimated_dock_hours": 1.0,
                    "distance_from_previous": 20,
                },
                {
                    "name": "Stop 3",
                    "city": "Chicago",
                    "state": "IL",
                    "action_type": "delivery",
                    "estimated_dock_hours": 0.75,
                    "distance_from_previous": 30,
                },
                {
                    "name": "Stop 4",
                    "city": "Joliet",
                    "state": "IL",
                    "action_type": "delivery",
                    "estimated_dock_hours": 1.0,
                    "distance_from_previous": 40,
                },
                {
                    "name": "Stop 5",
                    "city": "Aurora",
                    "state": "IL",
                    "action_type": "delivery",
                    "estimated_dock_hours": 0.75,
                    "distance_from_previous": 35,
                },
            ],
            expected_rest_stops=0,
            expected_fuel_stops=0,
            expected_violations=[],
            is_active=True,
            display_order=6,
        ),
        # Scenario 7: Break Required Soon
        Scenario(
            scenario_id="SCENARIO-007",
            name="Break Required Soon",
            description="Driver at 7.5h since break (30min break required soon). 80% fuel. Tests break insertion.",
            category="simple",
            driver_id="DRV-003",
            vehicle_id="VEH-001",
            driver_state_template={
                "hours_driven": 7.5,
                "on_duty_time": 9.0,
                "hours_since_break": 7.5,  # Near 8h limit!
            },
            vehicle_state_template={
                "fuel_capacity": 200.0,
                "current_fuel": 160.0,
                "mpg": 6.5,
            },
            stops_template=[
                {
                    "name": "Chicago Warehouse",
                    "city": "Chicago",
                    "state": "IL",
                    "action_type": "pickup",
                    "estimated_dock_hours": 0.5,
                    "distance_from_previous": 0,
                },
                {
                    "name": "Milwaukee Customer",
                    "city": "Milwaukee",
                    "state": "WI",
                    "action_type": "delivery",
                    "estimated_dock_hours": 0.75,
                    "distance_from_previous": 90,
                },
            ],
            expected_rest_stops=0,
            expected_fuel_stops=0,
            expected_violations=[],  # Break should be inserted to prevent violation
            is_active=True,
            display_order=7,
        ),
    ]

    session.add_all(scenarios)
    await session.flush()
    logger.info("scenarios_seeded", count=len(scenarios))


async def seed_loads(session: AsyncSession) -> None:
    """Seed sample load data."""
    from sqlalchemy import select

    # Get stops for references
    result_stops = await session.execute(select(Stop))
    stops_list = list(result_stops.scalars().all())

    if not stops_list:
        logger.warning("no_stops_found", message="Cannot seed loads without stops")
        return

    stops = {stop.stop_id: stop for stop in stops_list}

    loads = [
        # Load 1: Midwest Retail Distribution - Short Haul
        Load(
            load_id="LOAD-001",
            load_number="WMT-45892",
            status="pending",
            weight_lbs=44500.0,
            commodity_type="general",
            special_requirements="Delivery appointment required - call 24h ahead",
            customer_name="Walmart Distribution",
            is_active=True,
        ),
        # Load 2: Cross-Country Refrigerated - Long Haul
        Load(
            load_id="LOAD-002",
            load_number="TGT-12034",
            status="pending",
            weight_lbs=42000.0,
            commodity_type="refrigerated",
            special_requirements="Maintain 38°F - reefer unit required",
            customer_name="Target Logistics",
            is_active=True,
        ),
        # Load 3: Regional LTL - Multi-Stop
        Load(
            load_id="LOAD-003",
            load_number="FDX-78234",
            status="pending",
            weight_lbs=28000.0,
            commodity_type="general",
            special_requirements="Liftgate required at final stop",
            customer_name="FedEx Freight",
            is_active=True,
        ),
        # Load 4: West Coast Distribution - Time-Sensitive
        Load(
            load_id="LOAD-004",
            load_number="AMZ-99201",
            status="pending",
            weight_lbs=38750.0,
            commodity_type="general",
            special_requirements="Must deliver by 10 AM - No weekend delivery",
            customer_name="Amazon Fulfillment",
            is_active=True,
        ),
        # Load 5: Heavy Machinery - Specialized
        Load(
            load_id="LOAD-005",
            load_number="CAT-55612",
            status="pending",
            weight_lbs=47900.0,
            commodity_type="fragile",
            special_requirements="Flatbed required - Tarps provided - Oversize permits needed",
            customer_name="Caterpillar Equipment",
            is_active=True,
        ),
        # Load 6: Pharmaceutical - High Value
        Load(
            load_id="LOAD-006",
            load_number="CVS-44023",
            status="pending",
            weight_lbs=12500.0,
            commodity_type="refrigerated",
            special_requirements="Temperature monitoring required - High value cargo - Team driver preferred",
            customer_name="CVS Health Supply",
            is_active=True,
        ),
        # Load 7: Construction Materials - Bulk
        Load(
            load_id="LOAD-007",
            load_number="HD-88451",
            status="pending",
            weight_lbs=45800.0,
            commodity_type="general",
            special_requirements="Flatbed - Secure tarps - Multiple pickup locations",
            customer_name="Home Depot Distribution",
            is_active=True,
        ),
    ]

    session.add_all(loads)
    await session.flush()

    # Create load stops for each load
    load_stops = []

    # Load 1: Walmart - Chicago → Indianapolis (Short regional haul)
    if "STOP-WH-001" in stops and "STOP-CUS-002" in stops:
        load_stops.extend([
            LoadStop(
                load_id=loads[0].id,
                stop_id=stops["STOP-WH-001"].id,
                sequence_order=1,
                action_type="pickup",
                estimated_dock_hours=1.5,
                earliest_arrival=time(6, 0),
                latest_arrival=time(10, 0),
            ),
            LoadStop(
                load_id=loads[0].id,
                stop_id=stops["STOP-CUS-002"].id,
                sequence_order=2,
                action_type="delivery",
                estimated_dock_hours=2.0,
                earliest_arrival=time(14, 0),
                latest_arrival=time(18, 0),
            ),
        ])

    # Load 2: Target - LA → Phoenix → Tucson (Refrigerated multi-stop)
    if "STOP-WH-002" in stops and "STOP-WH-003" in stops and "STOP-TS-005" in stops:
        load_stops.extend([
            LoadStop(
                load_id=loads[1].id,
                stop_id=stops["STOP-WH-002"].id,
                sequence_order=1,
                action_type="pickup",
                estimated_dock_hours=2.5,
                earliest_arrival=time(7, 0),
                latest_arrival=time(12, 0),
            ),
            LoadStop(
                load_id=loads[1].id,
                stop_id=stops["STOP-WH-003"].id,
                sequence_order=2,
                action_type="delivery",
                estimated_dock_hours=1.5,
                earliest_arrival=time(6, 0),
                latest_arrival=time(16, 0),
            ),
            LoadStop(
                load_id=loads[1].id,
                stop_id=stops["STOP-TS-005"].id,
                sequence_order=3,
                action_type="delivery",
                estimated_dock_hours=1.0,
                earliest_arrival=time(8, 0),
                latest_arrival=time(18, 0),
            ),
        ])

    # Load 3: FedEx - Chicago → Indianapolis → Boston (Multi-stop LTL)
    if "STOP-WH-001" in stops and "STOP-CUS-002" in stops and "STOP-CUS-001" in stops:
        load_stops.extend([
            LoadStop(
                load_id=loads[2].id,
                stop_id=stops["STOP-WH-001"].id,
                sequence_order=1,
                action_type="pickup",
                estimated_dock_hours=1.0,
                earliest_arrival=time(5, 0),
                latest_arrival=time(9, 0),
            ),
            LoadStop(
                load_id=loads[2].id,
                stop_id=stops["STOP-CUS-002"].id,
                sequence_order=2,
                action_type="delivery",
                estimated_dock_hours=0.5,
            ),
            LoadStop(
                load_id=loads[2].id,
                stop_id=stops["STOP-CUS-001"].id,
                sequence_order=3,
                action_type="delivery",
                estimated_dock_hours=0.75,
                earliest_arrival=time(7, 0),
                latest_arrival=time(17, 0),
            ),
        ])

    # Load 4: Amazon - LA → Phoenix (Time-sensitive)
    if "STOP-WH-002" in stops and "STOP-WH-003" in stops:
        load_stops.extend([
            LoadStop(
                load_id=loads[3].id,
                stop_id=stops["STOP-WH-002"].id,
                sequence_order=1,
                action_type="pickup",
                estimated_dock_hours=1.25,
                earliest_arrival=time(18, 0),
                latest_arrival=time(22, 0),
            ),
            LoadStop(
                load_id=loads[3].id,
                stop_id=stops["STOP-WH-003"].id,
                sequence_order=2,
                action_type="delivery",
                estimated_dock_hours=1.5,
                earliest_arrival=time(6, 0),
                latest_arrival=time(10, 0),  # Must deliver by 10 AM
            ),
        ])

    # Load 5: Caterpillar - Indianapolis → Chicago (Heavy equipment backhaul)
    if "STOP-CUS-002" in stops and "STOP-CUS-001" in stops:
        load_stops.extend([
            LoadStop(
                load_id=loads[4].id,
                stop_id=stops["STOP-CUS-002"].id,
                sequence_order=1,
                action_type="pickup",
                estimated_dock_hours=3.0,  # Heavy equipment loading
                earliest_arrival=time(8, 0),
                latest_arrival=time(14, 0),
            ),
            LoadStop(
                load_id=loads[4].id,
                stop_id=stops["STOP-CUS-001"].id,
                sequence_order=2,
                action_type="delivery",
                estimated_dock_hours=2.5,
                earliest_arrival=time(7, 0),
                latest_arrival=time(16, 0),
            ),
        ])

    # Load 6: CVS - Boston → Chicago (High-value pharmaceutical)
    if "STOP-CUS-001" in stops and "STOP-WH-001" in stops:
        load_stops.extend([
            LoadStop(
                load_id=loads[5].id,
                stop_id=stops["STOP-CUS-001"].id,
                sequence_order=1,
                action_type="pickup",
                estimated_dock_hours=1.5,
                earliest_arrival=time(6, 0),
                latest_arrival=time(10, 0),
            ),
            LoadStop(
                load_id=loads[5].id,
                stop_id=stops["STOP-WH-001"].id,
                sequence_order=2,
                action_type="delivery",
                estimated_dock_hours=1.0,
                earliest_arrival=time(8, 0),
                latest_arrival=time(18, 0),
            ),
        ])

    # Load 7: Home Depot - Multi-pickup construction (Chicago area consolidation)
    if "STOP-WH-001" in stops and "STOP-CUS-002" in stops and "STOP-WH-003" in stops:
        load_stops.extend([
            LoadStop(
                load_id=loads[6].id,
                stop_id=stops["STOP-WH-001"].id,
                sequence_order=1,
                action_type="pickup",
                estimated_dock_hours=2.0,
                earliest_arrival=time(6, 0),
                latest_arrival=time(12, 0),
            ),
            LoadStop(
                load_id=loads[6].id,
                stop_id=stops["STOP-CUS-002"].id,
                sequence_order=2,
                action_type="pickup",  # Second pickup
                estimated_dock_hours=1.5,
            ),
            LoadStop(
                load_id=loads[6].id,
                stop_id=stops["STOP-WH-003"].id,
                sequence_order=3,
                action_type="delivery",
                estimated_dock_hours=2.5,
                earliest_arrival=time(8, 0),
                latest_arrival=time(18, 0),
            ),
        ])

    session.add_all(load_stops)
    await session.flush()
    logger.info("loads_seeded", count=len(loads), load_stops=len(load_stops))


async def seed_route_plans(session: AsyncSession) -> None:
    """Seed route plan data (example planned routes with segments)."""
    from sqlalchemy import select
    from datetime import datetime, timezone, timedelta

    # Get drivers, vehicles, and stops for references
    result_drivers = await session.execute(select(Driver))
    drivers = list(result_drivers.scalars().all())

    result_vehicles = await session.execute(select(Vehicle))
    vehicles = list(result_vehicles.scalars().all())

    result_stops = await session.execute(select(Stop))
    stops_list = list(result_stops.scalars().all())

    if not drivers or not vehicles or not stops_list:
        logger.warning("no_data_for_route_plans", message="Cannot seed route plans without drivers, vehicles, or stops")
        return

    # Convert stops list to dict for easy lookup
    stops = {stop.stop_id: stop for stop in stops_list}

    # ========================================
    # ROUTE PLAN 1: Chicago → Boston (3 stops, 1 rest stop needed)
    # ========================================
    base_time = datetime.now(timezone.utc)

    route_plan_1 = RoutePlan(
        plan_id="PLAN-001",
        driver_id=drivers[0].id,  # John Smith (8.5h driven, tight on hours)
        vehicle_id=vehicles[0].id,
        created_at=base_time,
        plan_version=1,
        is_active=True,
        status="active",
        optimization_priority="minimize_time",
        total_distance_miles=950.0,
        total_drive_time_hours=15.8,
        total_on_duty_time_hours=28.8,  # Includes rest
        total_cost_estimate=450.0,
        is_feasible=True,
        feasibility_issues=None,
    )

    # Add route plan 1 first and flush to get ID
    session.add(route_plan_1)
    await session.flush()  # Get the auto-generated ID

    # Segments for Route Plan 1 (now we can use route_plan_1.id)
    segments_plan_1 = [
        # Segment 1: Origin (Chicago DC) → Indianapolis Customer (2h drive)
        RouteSegment(
            segment_id="SEG-001-01",
            plan_id=route_plan_1.id,  # Use integer ID, not string plan_id
            sequence_order=1,
            segment_type="drive",
            from_location=stops["STOP-WH-001"].name,  # Chicago DC
            to_location=stops["STOP-CUS-002"].name,  # Indianapolis Customer
            from_lat_lon=stops["STOP-WH-001"].lat_lon,
            to_lat_lon=stops["STOP-CUS-002"].lat_lon,
            distance_miles=185.0,
            drive_time_hours=3.1,
            hos_state_after={"hours_driven": 11.6, "on_duty_time": 13.1, "hours_since_break": 9.1},  # Close to limits!
            estimated_arrival=base_time + timedelta(hours=3.1),
            estimated_departure=base_time + timedelta(hours=3.1),
            status="completed",
        ),
        # Segment 2: Dock at Indianapolis Customer (0.75h)
        RouteSegment(
            segment_id="SEG-001-02",
            plan_id=route_plan_1.id,
            sequence_order=2,
            segment_type="dock",
            from_location=stops["STOP-CUS-002"].name,
            to_location=stops["STOP-CUS-002"].name,
            dock_duration_hours=0.75,
            customer_name="XYZ Inc",
            hos_state_after={"hours_driven": 11.6, "on_duty_time": 13.85, "hours_since_break": 9.85},
            estimated_arrival=base_time + timedelta(hours=3.1),
            estimated_departure=base_time + timedelta(hours=3.85),
            status="completed",
        ),
        # Segment 3: MANDATORY REST at Pilot Travel Center I-80 (10h full rest)
        RouteSegment(
            segment_id="SEG-001-03",
            plan_id=route_plan_1.id,
            sequence_order=3,
            segment_type="rest",
            from_location=stops["STOP-TS-001"].name,  # Pilot I-80
            to_location=stops["STOP-TS-001"].name,
            from_lat_lon=stops["STOP-TS-001"].lat_lon,
            to_lat_lon=stops["STOP-TS-001"].lat_lon,
            rest_type="full_rest",
            rest_duration_hours=10.0,
            rest_reason="HOS 14h duty window exceeded after Indianapolis dock. Mandatory 10h rest required.",
            hos_state_after={"hours_driven": 0, "on_duty_time": 0, "hours_since_break": 0},  # Reset!
            estimated_arrival=base_time + timedelta(hours=4.0),
            estimated_departure=base_time + timedelta(hours=14.0),
            status="in_progress",
        ),
        # Segment 4: Drive to Boston Customer (12.5h drive - after rest)
        RouteSegment(
            segment_id="SEG-001-04",
            plan_id=route_plan_1.id,
            sequence_order=4,
            segment_type="drive",
            from_location=stops["STOP-TS-001"].name,  # Pilot I-80
            to_location=stops["STOP-CUS-001"].name,  # Boston Customer
            from_lat_lon=stops["STOP-TS-001"].lat_lon,
            to_lat_lon=stops["STOP-CUS-001"].lat_lon,
            distance_miles=765.0,
            drive_time_hours=12.75,  # Long drive but within 14h after rest
            hos_state_after={"hours_driven": 12.75, "on_duty_time": 12.75, "hours_since_break": 12.75},
            estimated_arrival=base_time + timedelta(hours=26.75),
            estimated_departure=base_time + timedelta(hours=26.75),
            status="planned",
        ),
        # Segment 5: Dock at Boston Customer (1h)
        RouteSegment(
            segment_id="SEG-001-05",
            plan_id=route_plan_1.id,
            sequence_order=5,
            segment_type="dock",
            from_location=stops["STOP-CUS-001"].name,
            to_location=stops["STOP-CUS-001"].name,
            dock_duration_hours=1.0,
            customer_name="ABC Corp",
            appointment_time=base_time + timedelta(hours=27),
            hos_state_after={"hours_driven": 12.75, "on_duty_time": 13.75, "hours_since_break": 13.75},
            estimated_arrival=base_time + timedelta(hours=26.75),
            estimated_departure=base_time + timedelta(hours=27.75),
            status="planned",
        ),
    ]

    # ========================================
    # ROUTE PLAN 2: LA → Phoenix → Tucson (fuel stop + opportunistic rest)
    # ========================================
    route_plan_2 = RoutePlan(
        plan_id="PLAN-002",
        driver_id=drivers[1].id,  # Sarah Johnson (5h driven, good on hours)
        vehicle_id=vehicles[1].id,
        created_at=base_time,
        plan_version=1,
        is_active=True,
        status="active",
        optimization_priority="minimize_cost",
        total_distance_miles=650.0,
        total_drive_time_hours=10.8,
        total_on_duty_time_hours=15.3,
        total_cost_estimate=320.0,
        is_feasible=True,
        feasibility_issues=None,
    )

    # Add route plan 2 and flush to get ID
    session.add(route_plan_2)
    await session.flush()

    segments_plan_2 = [
        # Segment 1: LA Warehouse → Phoenix Distribution (6h drive)
        RouteSegment(
            segment_id="SEG-002-01",
            plan_id=route_plan_2.id,
            sequence_order=1,
            segment_type="drive",
            from_location=stops["STOP-WH-002"].name,  # LA Warehouse
            to_location=stops["STOP-WH-003"].name,  # Phoenix Distribution
            from_lat_lon=stops["STOP-WH-002"].lat_lon,
            to_lat_lon=stops["STOP-WH-003"].lat_lon,
            distance_miles=375.0,
            drive_time_hours=6.25,
            hos_state_after={"hours_driven": 11.25, "on_duty_time": 13.75, "hours_since_break": 9.25},
            estimated_arrival=base_time + timedelta(hours=6.25),
            estimated_departure=base_time + timedelta(hours=6.25),
            status="completed",
        ),
        # Segment 2: Dock at Phoenix (2.5h - EXTENDED TO 7h partial rest)
        RouteSegment(
            segment_id="SEG-002-02",
            plan_id=route_plan_2.id,
            sequence_order=2,
            segment_type="dock",
            from_location=stops["STOP-WH-003"].name,
            to_location=stops["STOP-WH-003"].name,
            dock_duration_hours=2.5,
            customer_name="Phoenix Distribution",
            hos_state_after={"hours_driven": 11.25, "on_duty_time": 16.25, "hours_since_break": 11.75},
            estimated_arrival=base_time + timedelta(hours=6.25),
            estimated_departure=base_time + timedelta(hours=8.75),
            status="in_progress",
            # Note: This could be extended to 7h partial rest (see RoutePlanUpdate below)
        ),
        # Segment 3: Fuel stop at Petro I-10 (30 min)
        RouteSegment(
            segment_id="SEG-002-03",
            plan_id=route_plan_2.id,
            sequence_order=3,
            segment_type="fuel",
            from_location=stops["STOP-TS-005"].name,  # Petro Tucson
            to_location=stops["STOP-TS-005"].name,
            from_lat_lon=stops["STOP-TS-005"].lat_lon,
            to_lat_lon=stops["STOP-TS-005"].lat_lon,
            fuel_gallons=85.0,
            fuel_cost_estimate=330.0,
            fuel_station_name="Petro Stopping Center",
            hos_state_after={"hours_driven": 11.25, "on_duty_time": 16.75, "hours_since_break": 12.25},
            estimated_arrival=base_time + timedelta(hours=9.0),
            estimated_departure=base_time + timedelta(hours=9.5),
            status="planned",
        ),
        # Segment 4: Drive to Tucson (final leg, 2h)
        RouteSegment(
            segment_id="SEG-002-04",
            plan_id=route_plan_2.id,
            sequence_order=4,
            segment_type="drive",
            from_location=stops["STOP-TS-005"].name,
            to_location="Tucson Destination",
            from_lat_lon=stops["STOP-TS-005"].lat_lon,
            to_lat_lon={"lat": 32.2217, "lon": -110.9265},
            distance_miles=120.0,
            drive_time_hours=2.0,
            hos_state_after={"hours_driven": 13.25, "on_duty_time": 18.75, "hours_since_break": 14.25},
            estimated_arrival=base_time + timedelta(hours=11.5),
            estimated_departure=base_time + timedelta(hours=11.5),
            status="planned",
        ),
    ]

    # ========================================
    # ROUTE PLAN UPDATE: Dynamic update example (dock time exceeded)
    # ========================================
    route_plan_update_1 = RoutePlanUpdate(
        update_id="UPDATE-001",
        plan_id=route_plan_2.id,  # Use the actual plan.id, not plan_id string
        update_type="dock_time_change",
        triggered_at=base_time + timedelta(hours=7),
        triggered_by="driver",
        trigger_data={
            "stop_id": "STOP-WH-003",
            "estimated_dock_hours": 2.5,
            "actual_dock_hours": 7.0,
            "variance": 4.5,
        },
        replan_triggered=True,
        replan_reason="Dock time exceeded estimate by 4.5h. Route marginal. Extended dock to 7h partial rest (7/3 split) to recover hours.",
        previous_plan_version=1,
        new_plan_version=2,
        impact_summary={
            "eta_changes": [
                {
                    "stop_id": "STOP-WH-003",
                    "old_eta": "2026-02-01T08:45:00Z",
                    "new_eta": "2026-02-01T13:00:00Z",
                    "delay_hours": 4.5,
                }
            ],
            "rest_stops_added": 0,
            "rest_stops_removed": 0,
        },
    )

    # Add segments and update (route plans already added and flushed)
    session.add_all(segments_plan_1)
    session.add_all(segments_plan_2)
    session.add(route_plan_update_1)
    await session.flush()

    logger.info("route_plans_seeded", count=2, segments=len(segments_plan_1) + len(segments_plan_2), updates=1)


if __name__ == "__main__":
    asyncio.run(seed_database())
