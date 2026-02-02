import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { seedFeatureFlags } from './seeds/feature-flags.seed';

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
  await prisma.driverPreferences.deleteMany();
  await prisma.dispatcherPreferences.deleteMany();
  await prisma.userPreferences.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.integrationSyncLog.deleteMany();
  await prisma.integrationConfig.deleteMany();
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
      status: 'ACTIVE',
      dotNumber: '12345678',
      fleetSize: 'SIZE_51_100',
      approvedAt: new Date(),
      approvedBy: 'system@sally.com',
      onboardingCompletedAt: new Date(),
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
      status: 'ACTIVE',
      dotNumber: '87654321',
      fleetSize: 'SIZE_11_50',
      approvedAt: new Date(),
      approvedBy: 'system@sally.com',
      onboardingCompletedAt: new Date(),
      isActive: true,
    },
  });

  console.log(`✓ Created 2 tenants`);

  // ============================================================================
  // JYC CARRIERS - Drivers (8 drivers)
  // ============================================================================
  console.log('Creating JYC Carriers drivers...');

  // All drivers synced from TMS Truckbase (default driver source)
  // NOTE: New drivers synced from external sources should be PENDING_ACTIVATION
  // and require manual activation by an admin
  const jycDriver1 = await prisma.driver.create({
    data: {
      driverId: 'driver_001',
      name: 'John Smith',
      status: 'PENDING_ACTIVATION', // NEW: External drivers start as pending
      isActive: false, // NEW: Inactive until manually activated
      tenantId: jycCarriers.id,
      externalDriverId: 'driver_001',
      externalSource: 'mock_truckbase_tms',
      syncStatus: 'SYNCED',
      lastSyncedAt: new Date(),
    },
  });

  const jycDriver2 = await prisma.driver.create({
    data: {
      driverId: 'driver_002',
      name: 'Sarah Johnson',
      status: 'PENDING_ACTIVATION',
      isActive: false,
      tenantId: jycCarriers.id,
      externalDriverId: 'driver_002',
      externalSource: 'mock_truckbase_tms',
      syncStatus: 'SYNCED',
      lastSyncedAt: new Date(),
    },
  });

  const jycDriver3 = await prisma.driver.create({
    data: {
      driverId: 'driver_003',
      name: 'Mike Williams',
      status: 'PENDING_ACTIVATION',
      isActive: false,
      tenantId: jycCarriers.id,
      externalDriverId: 'driver_003',
      externalSource: 'mock_truckbase_tms',
      syncStatus: 'SYNCED',
      lastSyncedAt: new Date(),
    },
  });

  const jycDriver4 = await prisma.driver.create({
    data: {
      driverId: 'driver_004',
      name: 'Jane Doe',
      status: 'PENDING_ACTIVATION',
      isActive: false,
      tenantId: jycCarriers.id,
      externalDriverId: 'driver_004',
      externalSource: 'mock_truckbase_tms',
      syncStatus: 'SYNCED',
      lastSyncedAt: new Date(),
    },
  });

  const jycDriver5 = await prisma.driver.create({
    data: {
      driverId: 'driver_005',
      name: 'Bob Martinez',
      status: 'PENDING_ACTIVATION',
      isActive: false,
      tenantId: jycCarriers.id,
      externalDriverId: 'driver_005',
      externalSource: 'mock_truckbase_tms',
      syncStatus: 'SYNCED',
      lastSyncedAt: new Date(),
    },
  });

  const jycDriver6 = await prisma.driver.create({
    data: {
      driverId: 'driver_006',
      name: 'Lisa Chen',
      status: 'PENDING_ACTIVATION',
      isActive: false,
      tenantId: jycCarriers.id,
      externalDriverId: 'driver_006',
      externalSource: 'mock_truckbase_tms',
      syncStatus: 'SYNCED',
      lastSyncedAt: new Date(),
    },
  });

  // Last 2 drivers are manual (no external source)
  // Manual drivers are immediately ACTIVE (no approval needed)
  const jycDriver7 = await prisma.driver.create({
    data: {
      driverId: 'driver_007',
      name: 'Tom Brown',
      status: 'ACTIVE', // Manual drivers are immediately active
      isActive: true,
      tenantId: jycCarriers.id,
      externalDriverId: null,
      externalSource: null,
      syncStatus: 'MANUAL_ENTRY',
      lastSyncedAt: null,
    },
  });

  const jycDriver8 = await prisma.driver.create({
    data: {
      driverId: 'driver_008',
      name: 'Emily Davis',
      status: 'ACTIVE',
      isActive: true,
      tenantId: jycCarriers.id,
      externalDriverId: null,
      externalSource: null,
      syncStatus: 'MANUAL_ENTRY',
      lastSyncedAt: null,
    },
  });

  console.log(`✓ Created 8 JYC Carriers drivers`);

  // ============================================================================
  // XYZ LOGISTICS - Drivers (3 drivers)
  // ============================================================================
  console.log('Creating XYZ Logistics drivers...');

  // XYZ drivers from TMS Truckbase integration
  const xyzDriver1 = await prisma.driver.create({
    data: {
      driverId: 'driver_101',
      name: 'Carlos Rodriguez',
      status: 'PENDING_ACTIVATION',
      isActive: false,
      tenantId: xyzLogistics.id,
      externalDriverId: 'driver_101',
      externalSource: 'mock_truckbase_tms',
      syncStatus: 'SYNCED',
      lastSyncedAt: new Date(),
    },
  });

  const xyzDriver2 = await prisma.driver.create({
    data: {
      driverId: 'driver_102',
      name: 'Maria Garcia',
      status: 'PENDING_ACTIVATION',
      isActive: false,
      tenantId: xyzLogistics.id,
      externalDriverId: 'driver_102',
      externalSource: 'mock_truckbase_tms',
      syncStatus: 'SYNCED',
      lastSyncedAt: new Date(),
    },
  });

  const xyzDriver3 = await prisma.driver.create({
    data: {
      driverId: 'driver_103',
      name: 'David Lee',
      status: 'PENDING_ACTIVATION',
      isActive: false,
      tenantId: xyzLogistics.id,
      externalDriverId: 'driver_103',
      externalSource: 'mock_truckbase_tms',
      syncStatus: 'SYNCED',
      lastSyncedAt: new Date(),
    },
  });

  console.log(`✓ Created 3 XYZ Logistics drivers`);

  // ============================================================================
  // SUPER_ADMIN - SALLY Internal Team
  // ============================================================================
  console.log('Creating SUPER_ADMIN user...');

  const superAdmin = await prisma.user.create({
    data: {
      userId: 'user_sally_superadmin_001',
      email: 'admin@sally.com',
      firstName: 'SALLY',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      tenantId: null,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log(`✓ Created SUPER_ADMIN user: ${superAdmin.email}`);

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

  // All vehicles from TMS Truckbase integration (default vehicle source)
  await prisma.vehicle.createMany({
    data: [
      {
        vehicleId: 'vehicle_001',
        unitNumber: 'TRK-1234',
        fuelCapacityGallons: 200,
        currentFuelGallons: 150,
        mpg: 6.5,
        isActive: true,
        tenantId: jycCarriers.id,
        externalVehicleId: 'vehicle_001',
        externalSource: 'mock_truckbase_tms',
        lastSyncedAt: new Date(),
      },
      {
        vehicleId: 'vehicle_002',
        unitNumber: 'TRK-5678',
        fuelCapacityGallons: 180,
        currentFuelGallons: 90,
        mpg: 7.0,
        isActive: true,
        tenantId: jycCarriers.id,
        externalVehicleId: 'vehicle_002',
        externalSource: 'mock_truckbase_tms',
        lastSyncedAt: new Date(),
      },
      {
        vehicleId: 'vehicle_003',
        unitNumber: 'TRK-9012',
        fuelCapacityGallons: 220,
        currentFuelGallons: 200,
        mpg: 6.0,
        isActive: true,
        tenantId: jycCarriers.id,
        externalVehicleId: 'vehicle_003',
        externalSource: 'mock_truckbase_tms',
        lastSyncedAt: new Date(),
      },
      {
        vehicleId: 'vehicle_004',
        unitNumber: 'TRK-3456',
        fuelCapacityGallons: 200,
        currentFuelGallons: 160,
        mpg: 6.8,
        isActive: true,
        tenantId: jycCarriers.id,
        externalVehicleId: 'vehicle_004',
        externalSource: 'mock_truckbase_tms',
        lastSyncedAt: new Date(),
      },
      {
        vehicleId: 'vehicle_005',
        unitNumber: 'TRK-7890',
        fuelCapacityGallons: 190,
        currentFuelGallons: 95,
        mpg: 7.2,
        isActive: true,
        tenantId: jycCarriers.id,
        externalVehicleId: 'vehicle_005',
        externalSource: 'mock_truckbase_tms',
        lastSyncedAt: new Date(),
      },
      // Last 3 vehicles are manual (no external source)
      {
        vehicleId: 'vehicle_006',
        unitNumber: 'TRK-1122',
        fuelCapacityGallons: 210,
        currentFuelGallons: 180,
        mpg: 6.3,
        isActive: true,
        tenantId: jycCarriers.id,
        externalVehicleId: null,
        externalSource: null,
        lastSyncedAt: null,
      },
      {
        vehicleId: 'vehicle_007',
        unitNumber: 'TRK-3344',
        fuelCapacityGallons: 200,
        currentFuelGallons: 40,
        mpg: 6.6,
        isActive: true,
        tenantId: jycCarriers.id,
        externalVehicleId: null,
        externalSource: null,
        lastSyncedAt: null,
      },
      {
        vehicleId: 'vehicle_008',
        unitNumber: 'TRK-5566',
        fuelCapacityGallons: 195,
        currentFuelGallons: 175,
        mpg: 7.1,
        isActive: true,
        tenantId: jycCarriers.id,
        externalVehicleId: null,
        externalSource: null,
        lastSyncedAt: null,
      },
    ],
  });

  console.log(`✓ Created 8 JYC Carriers vehicles`);

  // ============================================================================
  // XYZ LOGISTICS - Vehicles
  // ============================================================================
  console.log('Creating XYZ Logistics vehicles...');

  // XYZ vehicles from TMS Truckbase integration
  await prisma.vehicle.createMany({
    data: [
      {
        vehicleId: 'vehicle_101',
        unitNumber: 'XYZ-1001',
        fuelCapacityGallons: 200,
        currentFuelGallons: 180,
        mpg: 6.7,
        isActive: true,
        tenantId: xyzLogistics.id,
        externalVehicleId: 'vehicle_101',
        externalSource: 'mock_truckbase_tms',
        lastSyncedAt: new Date(),
      },
      {
        vehicleId: 'vehicle_102',
        unitNumber: 'XYZ-1002',
        fuelCapacityGallons: 210,
        currentFuelGallons: 100,
        mpg: 6.4,
        isActive: true,
        tenantId: xyzLogistics.id,
        externalVehicleId: 'vehicle_102',
        externalSource: 'mock_truckbase_tms',
        lastSyncedAt: new Date(),
      },
      {
        vehicleId: 'vehicle_103',
        unitNumber: 'XYZ-1003',
        fuelCapacityGallons: 195,
        currentFuelGallons: 150,
        mpg: 7.0,
        isActive: true,
        tenantId: xyzLogistics.id,
        externalVehicleId: 'vehicle_103',
        externalSource: 'mock_truckbase_tms',
        lastSyncedAt: new Date(),
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
  // LOADS (Real-world scenarios for route planning testing)
  // ============================================================================
  console.log('Creating loads...');

  const load1 = await prisma.load.create({
    data: {
      loadId: 'LOAD-001',
      loadNumber: 'L2026-001',
      status: 'pending',
      weightLbs: 38000,
      commodityType: 'Electronics',
      specialRequirements: 'Temperature controlled, fragile',
      customerName: 'TechCorp Inc',
      isActive: true,
      externalLoadId: 'LOAD-001',
      externalSource: 'mock_truckbase_tms',
      lastSyncedAt: new Date(),
    },
  });

  const load2 = await prisma.load.create({
    data: {
      loadId: 'LOAD-002',
      loadNumber: 'L2026-002',
      status: 'in_transit',
      weightLbs: 42000,
      commodityType: 'Food Products',
      specialRequirements: 'Refrigerated 35-40°F',
      customerName: 'FreshFoods LLC',
      isActive: true,
      externalLoadId: 'LOAD-002',
      externalSource: 'mock_truckbase_tms',
      lastSyncedAt: new Date(),
    },
  });

  const load3 = await prisma.load.create({
    data: {
      loadId: 'LOAD-003',
      loadNumber: 'L2026-003',
      status: 'pending',
      weightLbs: 45000,
      commodityType: 'Building Materials',
      specialRequirements: 'Flatbed required, tarps needed',
      customerName: 'ABC Construction',
      isActive: true,
      externalLoadId: 'LOAD-003',
      externalSource: 'mock_truckbase_tms',
      lastSyncedAt: new Date(),
    },
  });

  const load4 = await prisma.load.create({
    data: {
      loadId: 'LOAD-004',
      loadNumber: 'L2026-004',
      status: 'planned',
      weightLbs: 32000,
      commodityType: 'Auto Parts',
      specialRequirements: 'Liftgate delivery required',
      customerName: 'AutoZone Distribution',
      isActive: true,
      externalLoadId: 'LOAD-004',
      externalSource: 'mock_truckbase_tms',
      lastSyncedAt: new Date(),
    },
  });

  const load5 = await prisma.load.create({
    data: {
      loadId: 'LOAD-005',
      loadNumber: 'L2026-005',
      status: 'pending',
      weightLbs: 28000,
      commodityType: 'Pharmaceutical',
      specialRequirements: 'Climate controlled, security required, chain of custody',
      customerName: 'MedSupply Corp',
      isActive: true,
      externalLoadId: 'LOAD-005',
      externalSource: 'mock_truckbase_tms',
      lastSyncedAt: new Date(),
    },
  });

  const load6 = await prisma.load.create({
    data: {
      loadId: 'LOAD-006',
      loadNumber: 'L2026-006',
      status: 'active',
      weightLbs: 44000,
      commodityType: 'Consumer Goods',
      specialRequirements: 'No special requirements',
      customerName: 'Walmart Distribution',
      isActive: true,
      externalLoadId: 'LOAD-006',
      externalSource: 'mock_truckbase_tms',
      lastSyncedAt: new Date(),
    },
  });

  const load7 = await prisma.load.create({
    data: {
      loadId: 'LOAD-007',
      loadNumber: 'L2026-007',
      status: 'pending',
      weightLbs: 35000,
      commodityType: 'Paper Products',
      specialRequirements: 'Keep dry, no exposure to moisture',
      customerName: 'Office Depot Logistics',
      isActive: true,
      externalLoadId: 'LOAD-007',
      externalSource: 'mock_truckbase_tms',
      lastSyncedAt: new Date(),
    },
  });

  const load8 = await prisma.load.create({
    data: {
      loadId: 'LOAD-008',
      loadNumber: 'L2026-008',
      status: 'pending',
      weightLbs: 40000,
      commodityType: 'Machinery',
      specialRequirements: 'Heavy equipment, specialized straps needed',
      customerName: 'Industrial Equipment Co',
      isActive: true,
      externalLoadId: 'LOAD-008',
      externalSource: 'mock_truckbase_tms',
      lastSyncedAt: new Date(),
    },
  });

  const load9 = await prisma.load.create({
    data: {
      loadId: 'LOAD-009',
      loadNumber: 'L2026-009',
      status: 'completed',
      weightLbs: 36000,
      commodityType: 'Textiles',
      specialRequirements: 'Dry van, climate neutral',
      customerName: 'Fashion Brands Inc',
      isActive: true,
      externalLoadId: 'LOAD-009',
      externalSource: 'mock_truckbase_tms',
      lastSyncedAt: new Date(),
    },
  });

  const load10 = await prisma.load.create({
    data: {
      loadId: 'LOAD-010',
      loadNumber: 'L2026-010',
      status: 'pending',
      weightLbs: 48000,
      commodityType: 'Beverages',
      specialRequirements: 'Refrigerated, no freezing',
      customerName: 'Coca-Cola Bottling',
      isActive: true,
      externalLoadId: 'LOAD-010',
      externalSource: 'mock_truckbase_tms',
      lastSyncedAt: new Date(),
    },
  });

  console.log(`✓ Created 10 loads`);

  // ============================================================================
  // LOAD STOPS (Real-world multi-stop scenarios)
  // ============================================================================
  console.log('Creating load stops...');

  await prisma.loadStop.createMany({
    data: [
      // Load 1: Electronics - Single pickup, single delivery
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
      // Load 2: Food Products - Pickup and 2 deliveries
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
      {
        loadId: load2.id,
        stopId: stop1.id,
        sequenceOrder: 3,
        actionType: 'delivery',
        earliestArrival: '18:00',
        latestArrival: '22:00',
        estimatedDockHours: 1.0,
      },
      // Load 3: Building Materials - Single pickup, single delivery
      {
        loadId: load3.id,
        stopId: stop2.id,
        sequenceOrder: 1,
        actionType: 'pickup',
        earliestArrival: '07:00',
        latestArrival: '11:00',
        estimatedDockHours: 1.5,
      },
      {
        loadId: load3.id,
        stopId: stop3.id,
        sequenceOrder: 2,
        actionType: 'delivery',
        earliestArrival: '15:00',
        latestArrival: '19:00',
        estimatedDockHours: 2.0,
      },
      // Load 4: Auto Parts - Multi-stop delivery (1 pickup, 3 deliveries)
      {
        loadId: load4.id,
        stopId: stop1.id,
        sequenceOrder: 1,
        actionType: 'pickup',
        earliestArrival: '05:00',
        latestArrival: '09:00',
        estimatedDockHours: 1.5,
      },
      {
        loadId: load4.id,
        stopId: stop2.id,
        sequenceOrder: 2,
        actionType: 'delivery',
        earliestArrival: '11:00',
        latestArrival: '13:00',
        estimatedDockHours: 0.5,
      },
      {
        loadId: load4.id,
        stopId: stop3.id,
        sequenceOrder: 3,
        actionType: 'delivery',
        earliestArrival: '14:00',
        latestArrival: '16:00',
        estimatedDockHours: 0.5,
      },
      {
        loadId: load4.id,
        stopId: stop4.id,
        sequenceOrder: 4,
        actionType: 'delivery',
        earliestArrival: '17:00',
        latestArrival: '19:00',
        estimatedDockHours: 0.5,
      },
      // Load 5: Pharmaceutical - High-value, time-sensitive
      {
        loadId: load5.id,
        stopId: stop1.id,
        sequenceOrder: 1,
        actionType: 'pickup',
        earliestArrival: '06:00',
        latestArrival: '08:00',
        estimatedDockHours: 2.5,
      },
      {
        loadId: load5.id,
        stopId: stop4.id,
        sequenceOrder: 2,
        actionType: 'delivery',
        earliestArrival: '14:00',
        latestArrival: '16:00',
        estimatedDockHours: 2.0,
      },
      // Load 6: Consumer Goods - Standard route
      {
        loadId: load6.id,
        stopId: stop2.id,
        sequenceOrder: 1,
        actionType: 'pickup',
        earliestArrival: '08:00',
        latestArrival: '12:00',
        estimatedDockHours: 1.0,
      },
      {
        loadId: load6.id,
        stopId: stop3.id,
        sequenceOrder: 2,
        actionType: 'delivery',
        earliestArrival: '16:00',
        latestArrival: '20:00',
        estimatedDockHours: 1.5,
      },
      // Load 7: Paper Products - Standard route
      {
        loadId: load7.id,
        stopId: stop3.id,
        sequenceOrder: 1,
        actionType: 'pickup',
        earliestArrival: '07:00',
        latestArrival: '11:00',
        estimatedDockHours: 1.0,
      },
      {
        loadId: load7.id,
        stopId: stop1.id,
        sequenceOrder: 2,
        actionType: 'delivery',
        earliestArrival: '15:00',
        latestArrival: '19:00',
        estimatedDockHours: 1.0,
      },
      // Load 8: Machinery - Heavy equipment, longer dock times
      {
        loadId: load8.id,
        stopId: stop4.id,
        sequenceOrder: 1,
        actionType: 'pickup',
        earliestArrival: '06:00',
        latestArrival: '10:00',
        estimatedDockHours: 3.0,
      },
      {
        loadId: load8.id,
        stopId: stop2.id,
        sequenceOrder: 2,
        actionType: 'delivery',
        earliestArrival: '14:00',
        latestArrival: '18:00',
        estimatedDockHours: 3.0,
      },
      // Load 9: Textiles - Already completed
      {
        loadId: load9.id,
        stopId: stop1.id,
        sequenceOrder: 1,
        actionType: 'pickup',
        earliestArrival: '08:00',
        latestArrival: '12:00',
        estimatedDockHours: 1.0,
        actualDockHours: 1.2,
      },
      {
        loadId: load9.id,
        stopId: stop3.id,
        sequenceOrder: 2,
        actionType: 'delivery',
        earliestArrival: '16:00',
        latestArrival: '20:00',
        estimatedDockHours: 1.0,
        actualDockHours: 0.8,
      },
      // Load 10: Beverages - Multi-stop delivery
      {
        loadId: load10.id,
        stopId: stop2.id,
        sequenceOrder: 1,
        actionType: 'pickup',
        earliestArrival: '05:00',
        latestArrival: '09:00',
        estimatedDockHours: 2.0,
      },
      {
        loadId: load10.id,
        stopId: stop1.id,
        sequenceOrder: 2,
        actionType: 'delivery',
        earliestArrival: '11:00',
        latestArrival: '13:00',
        estimatedDockHours: 1.0,
      },
      {
        loadId: load10.id,
        stopId: stop4.id,
        sequenceOrder: 3,
        actionType: 'delivery',
        earliestArrival: '15:00',
        latestArrival: '17:00',
        estimatedDockHours: 1.0,
      },
    ],
  });

  console.log(`✓ Created 26 load stops for 10 loads`);

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
          vehicleId: 'vehicle_001',
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
          vehicleId: 'vehicle_002',
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
          vehicleId: 'vehicle_003',
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
        driverId: 'driver_001',
        routePlanId: null,
        alertType: 'DRIVER_NOT_MOVING',
        priority: 'high',
        title: 'Driver Not Moving',
        message: 'driver_001 (John Smith) has not moved in 2 hours during drive segment',
        recommendedAction: 'Call driver to check status',
        status: 'active',
        tenantId: jycCarriers.id,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        alertId: 'ALT-002',
        driverId: 'driver_002',
        routePlanId: null,
        alertType: 'HOS_APPROACHING_LIMIT',
        priority: 'medium',
        title: 'HOS Approaching Limit',
        message: 'driver_002 (Sarah Johnson) has less than 1h drive time remaining',
        recommendedAction: 'Monitor driver, ensure rest stop is upcoming',
        status: 'active',
        tenantId: jycCarriers.id,
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
      {
        alertId: 'ALT-003',
        driverId: 'driver_007',
        routePlanId: null,
        alertType: 'FUEL_LOW',
        priority: 'high',
        title: 'Fuel Low',
        message: 'vehicle_007 fuel level is below 20% (40 gallons remaining)',
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
  // ============================================================================
  // CREATE USER PREFERENCES
  // ============================================================================
  console.log('Creating user preferences...');

  const allUsers = await prisma.user.findMany();
  let userPrefsCount = 0;
  let driverPrefsCount = 0;

  for (const user of allUsers) {
    // Create user preferences for everyone
    await prisma.userPreferences.create({
      data: {
        userId: user.id,
      },
    });
    userPrefsCount++;

    // Create driver preferences for drivers
    if (user.role === UserRole.DRIVER) {
      await prisma.driverPreferences.create({
        data: {
          userId: user.id,
          driverId: user.driverId,
        },
      });
      driverPrefsCount++;
    }
  }

  // Create dispatcher preferences (one per tenant)
  await prisma.dispatcherPreferences.create({
    data: {
      tenantId: jycCarriers.id,
    },
  });

  await prisma.dispatcherPreferences.create({
    data: {
      tenantId: xyzLogistics.id,
    },
  });

  console.log(`✓ Created ${userPrefsCount} user preferences`);
  console.log(`✓ Created 2 dispatcher preferences (one per tenant)`);
  console.log(`✓ Created ${driverPrefsCount} driver preferences`);

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
  console.log('  - Loads: 10');
  console.log('  - Load Stops: 26');
  console.log('  - Scenarios: 3');
  console.log('─────────────────────────────────────');
  console.log('\n🔑 Test Users:');
  console.log('\nJYC Carriers:');
  console.log('  Admin:       admin@jyc.com (user_jyc_admin_001)');
  console.log('  Dispatcher:  dispatcher1@jyc.com (user_jyc_disp_001)');
  console.log('  Dispatcher:  dispatcher2@jyc.com (user_jyc_disp_002)');
  console.log('  Driver:      john.smith@jyc.com (user_jyc_drv_001 - driver_001)');
  console.log('  Driver:      sarah.johnson@jyc.com (user_jyc_drv_002 - driver_002)');
  console.log('  ... 6 more drivers');
  console.log('\nXYZ Logistics:');
  console.log('  Admin:       admin@xyzlogistics.com (user_xyz_admin_001)');
  console.log('  Dispatcher:  dispatcher1@xyzlogistics.com (user_xyz_disp_001)');
  console.log('  Driver:      carlos.rodriguez@xyzlogistics.com (user_xyz_drv_001 - driver_101)');
  console.log('  Driver:      maria.garcia@xyzlogistics.com (user_xyz_drv_002 - driver_102)');
  console.log('  Driver:      david.lee@xyzlogistics.com (user_xyz_drv_003 - driver_103)');
  console.log('─────────────────────────────────────');

  // Seed feature flags
  await seedFeatureFlags();
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
