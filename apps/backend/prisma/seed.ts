import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://sally_user:sally_password@localhost:5432/sally';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (in reverse order of dependencies)
  console.log('Clearing existing data...');
  await prisma.recommendation.deleteMany();
  await prisma.event.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.loadStop.deleteMany();
  await prisma.load.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.routePlanUpdate.deleteMany();
  await prisma.routeSegment.deleteMany();
  await prisma.routePlan.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();

  // Create Drivers
  console.log('Creating drivers...');
  const driver1 = await prisma.driver.create({
    data: {
      driverId: 'DRV-001',
      name: 'John Smith',
      hoursDrivenToday: 5.5,
      onDutyTimeToday: 6.0,
      hoursSinceBreak: 5.5,
      currentDutyStatus: 'on_duty_driving',
      isActive: true,
    },
  });

  const driver2 = await prisma.driver.create({
    data: {
      driverId: 'DRV-002',
      name: 'Sarah Johnson',
      hoursDrivenToday: 8.0,
      onDutyTimeToday: 9.5,
      hoursSinceBreak: 7.0,
      currentDutyStatus: 'on_duty_driving',
      isActive: true,
    },
  });

  const driver3 = await prisma.driver.create({
    data: {
      driverId: 'DRV-003',
      name: 'Mike Williams',
      hoursDrivenToday: 0.0,
      onDutyTimeToday: 0.0,
      hoursSinceBreak: 0.0,
      currentDutyStatus: 'off_duty',
      isActive: true,
    },
  });

  console.log(`✓ Created ${3} drivers`);

  // Create Vehicles
  console.log('Creating vehicles...');
  const vehicle1 = await prisma.vehicle.create({
    data: {
      vehicleId: 'VEH-001',
      unitNumber: 'TRK-1234',
      fuelCapacityGallons: 200,
      currentFuelGallons: 150,
      mpg: 6.5,
      isActive: true,
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      vehicleId: 'VEH-002',
      unitNumber: 'TRK-5678',
      fuelCapacityGallons: 180,
      currentFuelGallons: 90,
      mpg: 7.0,
      isActive: true,
    },
  });

  const vehicle3 = await prisma.vehicle.create({
    data: {
      vehicleId: 'VEH-003',
      unitNumber: 'TRK-9012',
      fuelCapacityGallons: 220,
      currentFuelGallons: 200,
      mpg: 6.0,
      isActive: true,
    },
  });

  console.log(`✓ Created ${3} vehicles`);

  // Create Stops
  console.log('Creating stops...');
  const stop1 = await prisma.stop.create({
    data: {
      stopId: 'STP-001',
      name: 'Dallas Distribution Center',
      address: '1234 Industrial Blvd',
      city: 'Dallas',
      state: 'TX',
      lat: 32.7767,
      lon: -96.7970,
      locationType: 'warehouse',
      isActive: true,
    },
  });

  const stop2 = await prisma.stop.create({
    data: {
      stopId: 'STP-002',
      name: 'Houston Warehouse',
      address: '5678 Commerce Dr',
      city: 'Houston',
      state: 'TX',
      lat: 29.7604,
      lon: -95.3698,
      locationType: 'warehouse',
      isActive: true,
    },
  });

  const stop3 = await prisma.stop.create({
    data: {
      stopId: 'STP-003',
      name: 'Austin Logistics Hub',
      address: '9012 Freight Ln',
      city: 'Austin',
      state: 'TX',
      lat: 30.2672,
      lon: -97.7431,
      locationType: 'warehouse',
      isActive: true,
    },
  });

  const stop4 = await prisma.stop.create({
    data: {
      stopId: 'STP-004',
      name: 'San Antonio Distribution',
      address: '3456 Cargo Way',
      city: 'San Antonio',
      state: 'TX',
      lat: 29.4241,
      lon: -98.4936,
      locationType: 'warehouse',
      isActive: true,
    },
  });

  console.log(`✓ Created ${4} stops`);

  // Create Loads
  console.log('Creating loads...');
  const load1 = await prisma.load.create({
    data: {
      loadId: 'LOAD-001',
      loadNumber: 'L2026-001',
      status: 'pending',
      weightLbs: 38000,
      commodityType: 'Electronics',
      specialRequirements: 'Temperature controlled',
      customerName: 'TechCorp Inc',
      isActive: true,
    },
  });

  const load2 = await prisma.load.create({
    data: {
      loadId: 'LOAD-002',
      loadNumber: 'L2026-002',
      status: 'in_transit',
      weightLbs: 42000,
      commodityType: 'Food Products',
      specialRequirements: 'Refrigerated',
      customerName: 'FreshFoods LLC',
      isActive: true,
    },
  });

  console.log(`✓ Created ${2} loads`);

  // Create Load Stops
  console.log('Creating load stops...');
  await prisma.loadStop.createMany({
    data: [
      {
        loadId: load1.id,
        stopId: stop1.id,
        sequenceOrder: 1,
        actionType: 'pickup',
        earliestArrival: '08:00',
        latestArrival: '12:00',
        estimatedDockHours: 2.0,
      },
      {
        loadId: load1.id,
        stopId: stop2.id,
        sequenceOrder: 2,
        actionType: 'delivery',
        earliestArrival: '14:00',
        latestArrival: '18:00',
        estimatedDockHours: 1.5,
      },
      {
        loadId: load2.id,
        stopId: stop3.id,
        sequenceOrder: 1,
        actionType: 'pickup',
        earliestArrival: '06:00',
        latestArrival: '10:00',
        estimatedDockHours: 1.0,
      },
      {
        loadId: load2.id,
        stopId: stop4.id,
        sequenceOrder: 2,
        actionType: 'delivery',
        earliestArrival: '13:00',
        latestArrival: '17:00',
        estimatedDockHours: 1.5,
      },
    ],
  });

  console.log(`✓ Created ${4} load stops`);

  // Create Scenarios
  console.log('Creating scenarios...');
  await prisma.scenario.createMany({
    data: [
      {
        scenarioId: 'SCN-001',
        name: 'Basic Short Haul',
        description: 'Simple route under 200 miles, no rest required',
        category: 'basic',
        driverId: 'DRV-001',
        vehicleId: 'VEH-001',
        driverStateTemplate: {
          hoursDrivenToday: 3.0,
          onDutyTimeToday: 4.0,
          hoursSinceBreak: 3.0,
          currentDutyStatus: 'on_duty_driving',
        },
        vehicleStateTemplate: {
          currentFuelGallons: 150,
          fuelCapacityGallons: 200,
          mpg: 6.5,
        },
        stopsTemplate: [
          { stopId: 'STP-001', actionType: 'pickup', estimatedDockHours: 1.0 },
          { stopId: 'STP-003', actionType: 'delivery', estimatedDockHours: 1.0 },
        ],
        expectedRestStops: 0,
        expectedFuelStops: 0,
        displayOrder: 1,
      },
      {
        scenarioId: 'SCN-002',
        name: 'Long Haul with Rest',
        description: 'Route over 500 miles requiring one rest stop',
        category: 'long_haul',
        driverId: 'DRV-002',
        vehicleId: 'VEH-002',
        driverStateTemplate: {
          hoursDrivenToday: 6.0,
          onDutyTimeToday: 7.0,
          hoursSinceBreak: 6.0,
          currentDutyStatus: 'on_duty_driving',
        },
        vehicleStateTemplate: {
          currentFuelGallons: 90,
          fuelCapacityGallons: 180,
          mpg: 7.0,
        },
        stopsTemplate: [
          { stopId: 'STP-001', actionType: 'pickup', estimatedDockHours: 2.0 },
          { stopId: 'STP-002', actionType: 'delivery', estimatedDockHours: 1.5 },
        ],
        expectedRestStops: 1,
        expectedFuelStops: 1,
        displayOrder: 2,
      },
      {
        scenarioId: 'SCN-003',
        name: 'Multi-Stop Route',
        description: 'Complex route with 4 stops and multiple pickups/deliveries',
        category: 'complex',
        driverId: 'DRV-003',
        vehicleId: 'VEH-003',
        driverStateTemplate: {
          hoursDrivenToday: 0.0,
          onDutyTimeToday: 0.0,
          hoursSinceBreak: 0.0,
          currentDutyStatus: 'off_duty',
        },
        vehicleStateTemplate: {
          currentFuelGallons: 200,
          fuelCapacityGallons: 220,
          mpg: 6.0,
        },
        stopsTemplate: [
          { stopId: 'STP-001', actionType: 'pickup', estimatedDockHours: 1.5 },
          { stopId: 'STP-003', actionType: 'pickup', estimatedDockHours: 1.0 },
          { stopId: 'STP-002', actionType: 'delivery', estimatedDockHours: 1.5 },
          { stopId: 'STP-004', actionType: 'delivery', estimatedDockHours: 2.0 },
        ],
        expectedRestStops: 1,
        expectedFuelStops: 0,
        displayOrder: 3,
      },
    ],
  });

  console.log(`✓ Created ${3} scenarios`);

  console.log('✅ Database seeded successfully!');
  console.log('\nSummary:');
  console.log(`- Drivers: 3`);
  console.log(`- Vehicles: 3`);
  console.log(`- Stops: 4`);
  console.log(`- Loads: 2`);
  console.log(`- Load Stops: 4`);
  console.log(`- Scenarios: 3`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
