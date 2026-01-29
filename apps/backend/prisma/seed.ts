import { PrismaClient, UserRole } from '@prisma/client';
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
  await prisma.alert.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.event.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.loadStop.deleteMany();
  await prisma.load.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.routePlanUpdate.deleteMany();
  await prisma.routeSegment.deleteMany();
  await prisma.routePlan.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.tenant.deleteMany();

  // ============================================================================
  // CREATE TENANTS (Fleet Companies)
  // ============================================================================
  console.log('Creating tenants...');

  const jycCarriers = await prisma.tenant.create({
    data: {
      tenantId: 'jyc_carriers',
      companyName: 'JYC Carriers',
      subdomain: 'jyc',
      contactEmail: 'admin@jyc.com',
      contactPhone: '(339) 242-8066',
      isActive: true,
    },
  });

  const xyzLogistics = await prisma.tenant.create({
    data: {
      tenantId: 'xyz_logistics',
      companyName: 'XYZ Logistics',
      subdomain: 'xyz',
      contactEmail: 'admin@xyzlogistics.com',
      contactPhone: '(339) 242-8066',
      isActive: true,
    },
  });

  console.log(`✓ Created 2 tenants`);

  // ============================================================================
  // JYC CARRIERS - Drivers (8 drivers)
  // ============================================================================
  console.log('Creating JYC Carriers drivers...');

  const jycDriver1 = await prisma.driver.create({
    data: {
      driverId: 'DRV-001',
      name: 'John Smith',
      isActive: true,
      tenantId: jycCarriers.id,
    },
  });

  const jycDriver2 = await prisma.driver.create({
    data: {
      driverId: 'DRV-002',
      name: 'Sarah Johnson',
      isActive: true,
      tenantId: jycCarriers.id,
    },
  });

  const jycDriver3 = await prisma.driver.create({
    data: {
      driverId: 'DRV-003',
      name: 'Mike Williams',
      isActive: true,
      tenantId: jycCarriers.id,
    },
  });

  const jycDriver4 = await prisma.driver.create({
    data: {
      driverId: 'DRV-004',
      name: 'Jane Doe',
      isActive: true,
      tenantId: jycCarriers.id,
    },
  });

  const jycDriver5 = await prisma.driver.create({
    data: {
      driverId: 'DRV-005',
      name: 'Bob Martinez',
      isActive: true,
      tenantId: jycCarriers.id,
    },
  });

  const jycDriver6 = await prisma.driver.create({
    data: {
      driverId: 'DRV-006',
      name: 'Lisa Chen',
      isActive: true,
      tenantId: jycCarriers.id,
    },
  });

  const jycDriver7 = await prisma.driver.create({
    data: {
      driverId: 'DRV-007',
      name: 'Tom Brown',
      isActive: true,
      tenantId: jycCarriers.id,
    },
  });

  const jycDriver8 = await prisma.driver.create({
    data: {
      driverId: 'DRV-008',
      name: 'Emily Davis',
      isActive: true,
      tenantId: jycCarriers.id,
    },
  });

  console.log(`✓ Created 8 JYC Carriers drivers`);

  // ============================================================================
  // XYZ LOGISTICS - Drivers (3 drivers)
  // ============================================================================
  console.log('Creating XYZ Logistics drivers...');

  const xyzDriver1 = await prisma.driver.create({
    data: {
      driverId: 'DRV-101',
      name: 'Carlos Rodriguez',
      isActive: true,
      tenantId: xyzLogistics.id,
    },
  });

  const xyzDriver2 = await prisma.driver.create({
    data: {
      driverId: 'DRV-102',
      name: 'Maria Garcia',
      isActive: true,
      tenantId: xyzLogistics.id,
    },
  });

  const xyzDriver3 = await prisma.driver.create({
    data: {
      driverId: 'DRV-103',
      name: 'David Lee',
      isActive: true,
      tenantId: xyzLogistics.id,
    },
  });

  console.log(`✓ Created 3 XYZ Logistics drivers`);

  // ============================================================================
  // JYC CARRIERS - Users
  // ============================================================================
  console.log('Creating JYC Carriers users...');

  // Admin
  const jycAdmin = await prisma.user.create({
    data: {
      userId: 'user_jyc_admin_001',
      email: 'admin@jyc.com',
      firstName: 'Admin',
      lastName: 'JYC',
      role: UserRole.ADMIN,
      tenantId: jycCarriers.id,
      isActive: true,
    },
  });

  // Dispatchers
  const jycDispatcher1 = await prisma.user.create({
    data: {
      userId: 'user_jyc_disp_001',
      email: 'dispatcher1@jyc.com',
      firstName: 'James',
      lastName: 'Wilson',
      role: UserRole.DISPATCHER,
      tenantId: jycCarriers.id,
      isActive: true,
    },
  });

  const jycDispatcher2 = await prisma.user.create({
    data: {
      userId: 'user_jyc_disp_002',
      email: 'dispatcher2@jyc.com',
      firstName: 'Jessica',
      lastName: 'Taylor',
      role: UserRole.DISPATCHER,
      tenantId: jycCarriers.id,
      isActive: true,
    },
  });

  // Drivers (linked to driver records)
  await prisma.user.create({
    data: {
      userId: 'user_jyc_drv_001',
      email: 'john.smith@jyc.com',
      firstName: 'John',
      lastName: 'Smith',
      role: UserRole.DRIVER,
      tenantId: jycCarriers.id,
      driverId: jycDriver1.id,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      userId: 'user_jyc_drv_002',
      email: 'sarah.johnson@jyc.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: UserRole.DRIVER,
      tenantId: jycCarriers.id,
      driverId: jycDriver2.id,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      userId: 'user_jyc_drv_003',
      email: 'mike.williams@jyc.com',
      firstName: 'Mike',
      lastName: 'Williams',
      role: UserRole.DRIVER,
      tenantId: jycCarriers.id,
      driverId: jycDriver3.id,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      userId: 'user_jyc_drv_004',
      email: 'jane.doe@jyc.com',
      firstName: 'Jane',
      lastName: 'Doe',
      role: UserRole.DRIVER,
      tenantId: jycCarriers.id,
      driverId: jycDriver4.id,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      userId: 'user_jyc_drv_005',
      email: 'bob.martinez@jyc.com',
      firstName: 'Bob',
      lastName: 'Martinez',
      role: UserRole.DRIVER,
      tenantId: jycCarriers.id,
      driverId: jycDriver5.id,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      userId: 'user_jyc_drv_006',
      email: 'lisa.chen@jyc.com',
      firstName: 'Lisa',
      lastName: 'Chen',
      role: UserRole.DRIVER,
      tenantId: jycCarriers.id,
      driverId: jycDriver6.id,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      userId: 'user_jyc_drv_007',
      email: 'tom.brown@jyc.com',
      firstName: 'Tom',
      lastName: 'Brown',
      role: UserRole.DRIVER,
      tenantId: jycCarriers.id,
      driverId: jycDriver7.id,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      userId: 'user_jyc_drv_008',
      email: 'emily.davis@jyc.com',
      firstName: 'Emily',
      lastName: 'Davis',
      role: UserRole.DRIVER,
      tenantId: jycCarriers.id,
      driverId: jycDriver8.id,
      isActive: true,
    },
  });

  console.log(`✓ Created 11 JYC Carriers users (1 admin, 2 dispatchers, 8 drivers)`);

  // ============================================================================
  // XYZ LOGISTICS - Users
  // ============================================================================
  console.log('Creating XYZ Logistics users...');

  // Admin
  await prisma.user.create({
    data: {
      userId: 'user_xyz_admin_001',
      email: 'admin@xyzlogistics.com',
      firstName: 'Admin',
      lastName: 'XYZ',
      role: UserRole.ADMIN,
      tenantId: xyzLogistics.id,
      isActive: true,
    },
  });

  // Dispatcher
  await prisma.user.create({
    data: {
      userId: 'user_xyz_disp_001',
      email: 'dispatcher1@xyzlogistics.com',
      firstName: 'Robert',
      lastName: 'Anderson',
      role: UserRole.DISPATCHER,
      tenantId: xyzLogistics.id,
      isActive: true,
    },
  });

  // Drivers (linked to driver records)
  await prisma.user.create({
    data: {
      userId: 'user_xyz_drv_001',
      email: 'carlos.rodriguez@xyzlogistics.com',
      firstName: 'Carlos',
      lastName: 'Rodriguez',
      role: UserRole.DRIVER,
      tenantId: xyzLogistics.id,
      driverId: xyzDriver1.id,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      userId: 'user_xyz_drv_002',
      email: 'maria.garcia@xyzlogistics.com',
      firstName: 'Maria',
      lastName: 'Garcia',
      role: UserRole.DRIVER,
      tenantId: xyzLogistics.id,
      driverId: xyzDriver2.id,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      userId: 'user_xyz_drv_003',
      email: 'david.lee@xyzlogistics.com',
      firstName: 'David',
      lastName: 'Lee',
      role: UserRole.DRIVER,
      tenantId: xyzLogistics.id,
      driverId: xyzDriver3.id,
      isActive: true,
    },
  });

  console.log(`✓ Created 5 XYZ Logistics users (1 admin, 1 dispatcher, 3 drivers)`);

  // ============================================================================
  // MULTI-TENANT TEST USER (for testing workspace selection)
  // ============================================================================
  console.log('Creating multi-tenant test user...');

  // JYC version
  await prisma.user.create({
    data: {
      userId: 'user_multi_jyc',
      email: 'test@example.com',
      firstName: 'Multi',
      lastName: 'Tenant',
      role: UserRole.DISPATCHER,
      tenantId: jycCarriers.id,
      isActive: true,
    },
  });

  // XYZ version
  await prisma.user.create({
    data: {
      userId: 'user_multi_xyz',
      email: 'test@example.com',
      firstName: 'Multi',
      lastName: 'Tenant',
      role: UserRole.ADMIN,
      tenantId: xyzLogistics.id,
      isActive: true,
    },
  });

  console.log(`✓ Created multi-tenant test user (exists in both JYC and XYZ)`);

  // ============================================================================
  // JYC CARRIERS - Vehicles
  // ============================================================================
  console.log('Creating JYC Carriers vehicles...');

  await prisma.vehicle.createMany({
    data: [
      {
        vehicleId: 'VEH-001',
        unitNumber: 'TRK-1234',
        fuelCapacityGallons: 200,
        currentFuelGallons: 150,
        mpg: 6.5,
        isActive: true,
        tenantId: jycCarriers.id,
      },
      {
        vehicleId: 'VEH-002',
        unitNumber: 'TRK-5678',
        fuelCapacityGallons: 180,
        currentFuelGallons: 90,
        mpg: 7.0,
        isActive: true,
        tenantId: jycCarriers.id,
      },
      {
        vehicleId: 'VEH-003',
        unitNumber: 'TRK-9012',
        fuelCapacityGallons: 220,
        currentFuelGallons: 200,
        mpg: 6.0,
        isActive: true,
        tenantId: jycCarriers.id,
      },
      {
        vehicleId: 'VEH-004',
        unitNumber: 'TRK-3456',
        fuelCapacityGallons: 200,
        currentFuelGallons: 160,
        mpg: 6.8,
        isActive: true,
        tenantId: jycCarriers.id,
      },
      {
        vehicleId: 'VEH-005',
        unitNumber: 'TRK-7890',
        fuelCapacityGallons: 190,
        currentFuelGallons: 95,
        mpg: 7.2,
        isActive: true,
        tenantId: jycCarriers.id,
      },
      {
        vehicleId: 'VEH-006',
        unitNumber: 'TRK-1122',
        fuelCapacityGallons: 210,
        currentFuelGallons: 180,
        mpg: 6.3,
        isActive: true,
        tenantId: jycCarriers.id,
      },
      {
        vehicleId: 'VEH-007',
        unitNumber: 'TRK-3344',
        fuelCapacityGallons: 200,
        currentFuelGallons: 40,
        mpg: 6.6,
        isActive: true,
        tenantId: jycCarriers.id,
      },
      {
        vehicleId: 'VEH-008',
        unitNumber: 'TRK-5566',
        fuelCapacityGallons: 195,
        currentFuelGallons: 175,
        mpg: 7.1,
        isActive: true,
        tenantId: jycCarriers.id,
      },
    ],
  });

  console.log(`✓ Created 8 JYC Carriers vehicles`);

  // ============================================================================
  // XYZ LOGISTICS - Vehicles
  // ============================================================================
  console.log('Creating XYZ Logistics vehicles...');

  await prisma.vehicle.createMany({
    data: [
      {
        vehicleId: 'VEH-201',
        unitNumber: 'XYZ-1001',
        fuelCapacityGallons: 200,
        currentFuelGallons: 180,
        mpg: 6.7,
        isActive: true,
        tenantId: xyzLogistics.id,
      },
      {
        vehicleId: 'VEH-202',
        unitNumber: 'XYZ-1002',
        fuelCapacityGallons: 210,
        currentFuelGallons: 100,
        mpg: 6.4,
        isActive: true,
        tenantId: xyzLogistics.id,
      },
      {
        vehicleId: 'VEH-203',
        unitNumber: 'XYZ-1003',
        fuelCapacityGallons: 195,
        currentFuelGallons: 150,
        mpg: 7.0,
        isActive: true,
        tenantId: xyzLogistics.id,
      },
    ],
  });

  console.log(`✓ Created 3 XYZ Logistics vehicles`);

  // ============================================================================
  // STOPS (Shared across tenants for POC)
  // ============================================================================
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

  console.log(`✓ Created 4 stops`);

  // ============================================================================
  // LOADS (Shared for POC)
  // ============================================================================
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

  console.log(`✓ Created 2 loads`);

  // ============================================================================
  // LOAD STOPS
  // ============================================================================
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

  console.log(`✓ Created 4 load stops`);

  // ============================================================================
  // SCENARIOS (JYC Carriers)
  // ============================================================================
  console.log('Creating scenarios...');

  await prisma.scenario.createMany({
    data: [
      {
        scenarioId: 'SCN-001',
        name: 'Basic Short Haul',
        description: 'Simple route under 200 miles, no rest required',
        category: 'basic',
        driverRefId: jycDriver1.id,
        vehicleRefId: null, // Vehicle reference from template
        driverStateTemplate: {
          hoursDrivenToday: 3.0,
          onDutyTimeToday: 4.0,
          hoursSinceBreak: 3.0,
          currentDutyStatus: 'on_duty_driving',
        },
        vehicleStateTemplate: {
          vehicleId: 'VEH-001',
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
        driverRefId: jycDriver2.id,
        vehicleRefId: null,
        driverStateTemplate: {
          hoursDrivenToday: 6.0,
          onDutyTimeToday: 7.0,
          hoursSinceBreak: 6.0,
          currentDutyStatus: 'on_duty_driving',
        },
        vehicleStateTemplate: {
          vehicleId: 'VEH-002',
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
        driverRefId: jycDriver3.id,
        vehicleRefId: null,
        driverStateTemplate: {
          hoursDrivenToday: 0.0,
          onDutyTimeToday: 0.0,
          hoursSinceBreak: 0.0,
          currentDutyStatus: 'off_duty',
        },
        vehicleStateTemplate: {
          vehicleId: 'VEH-003',
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

  console.log(`✓ Created 3 scenarios`);

  // ============================================================================
  // ALERTS (JYC Carriers - for dispatcher dashboard demo)
  // ============================================================================
  console.log('Creating sample alerts for JYC Carriers...');

  await prisma.alert.createMany({
    data: [
      {
        alertId: 'ALT-001',
        driverId: 'DRV-001',
        routePlanId: null,
        alertType: 'DRIVER_NOT_MOVING',
        priority: 'high',
        title: 'Driver Not Moving',
        message: 'DRV-001 (John Smith) has not moved in 2 hours during drive segment',
        recommendedAction: 'Call driver to check status',
        status: 'active',
        tenantId: jycCarriers.id,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        alertId: 'ALT-002',
        driverId: 'DRV-002',
        routePlanId: null,
        alertType: 'HOS_APPROACHING_LIMIT',
        priority: 'medium',
        title: 'HOS Approaching Limit',
        message: 'DRV-002 (Sarah Johnson) has less than 1h drive time remaining',
        recommendedAction: 'Monitor driver, ensure rest stop is upcoming',
        status: 'active',
        tenantId: jycCarriers.id,
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
      {
        alertId: 'ALT-003',
        driverId: 'DRV-007',
        routePlanId: null,
        alertType: 'FUEL_LOW',
        priority: 'high',
        title: 'Fuel Low',
        message: 'VEH-007 fuel level is below 20% (40 gallons remaining)',
        recommendedAction: 'Insert fuel stop or direct driver to nearest station',
        status: 'active',
        tenantId: jycCarriers.id,
        createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      },
    ],
  });

  console.log(`✓ Created 3 sample alerts for JYC Carriers`);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('✅ Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log('─────────────────────────────────────');
  console.log('Tenants:');
  console.log('  - JYC Carriers (jyc_carriers)');
  console.log('  - XYZ Logistics (xyz_logistics)');
  console.log('');
  console.log('JYC Carriers:');
  console.log('  - Drivers: 8');
  console.log('  - Vehicles: 8');
  console.log('  - Users: 11 (1 admin, 2 dispatchers, 8 drivers)');
  console.log('  - Alerts: 3');
  console.log('');
  console.log('XYZ Logistics:');
  console.log('  - Drivers: 3');
  console.log('  - Vehicles: 3');
  console.log('  - Users: 5 (1 admin, 1 dispatcher, 3 drivers)');
  console.log('  - Alerts: 0');
  console.log('');
  console.log('Shared Resources:');
  console.log('  - Stops: 4');
  console.log('  - Loads: 2');
  console.log('  - Load Stops: 4');
  console.log('  - Scenarios: 3');
  console.log('─────────────────────────────────────');
  console.log('\n🔑 Test Users:');
  console.log('\nJYC Carriers:');
  console.log('  Admin:       admin@jyc.com (user_jyc_admin_001)');
  console.log('  Dispatcher:  dispatcher1@jyc.com (user_jyc_disp_001)');
  console.log('  Dispatcher:  dispatcher2@jyc.com (user_jyc_disp_002)');
  console.log('  Driver:      john.smith@jyc.com (user_jyc_drv_001 - DRV-001)');
  console.log('  Driver:      sarah.johnson@jyc.com (user_jyc_drv_002 - DRV-002)');
  console.log('  ... 6 more drivers');
  console.log('\nXYZ Logistics:');
  console.log('  Admin:       admin@xyzlogistics.com (user_xyz_admin_001)');
  console.log('  Dispatcher:  dispatcher1@xyzlogistics.com (user_xyz_disp_001)');
  console.log('  Driver:      carlos.rodriguez@xyzlogistics.com (user_xyz_drv_001 - DRV-101)');
  console.log('  Driver:      maria.garcia@xyzlogistics.com (user_xyz_drv_002 - DRV-102)');
  console.log('  Driver:      david.lee@xyzlogistics.com (user_xyz_drv_003 - DRV-103)');
  console.log('─────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
