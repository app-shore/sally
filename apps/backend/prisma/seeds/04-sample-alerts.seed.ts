import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { MOCK_DRIVERS, driverName } from '../../src/infrastructure/mock/mock.dataset';

/**
 * Sample alerts for demo/testing.
 *
 * Creates alerts directly in the database (bypasses the trigger service).
 * Uses MOCK_DRIVERS for consistent IDs. Queries DB for existing drivers
 * and falls back to mock dataset if none found.
 */

function getAlertSeedData(drivers: Array<{ id: string; name: string }>) {
  const d = (idx: number) => drivers[idx % drivers.length];

  return [
    {
      alertType: 'HOS_VIOLATION',
      category: 'COMPLIANCE',
      priority: 'critical',
      driverId: d(0).id,
      title: `HOS Violation: ${d(0).name}`,
      message: `Driver ${d(0).name} has exceeded the 11-hour driving limit. Current driving time: 11.5 hours.`,
      metadata: { hoursType: 'driving', currentHours: '11.5', limitHours: '11', routePlanId: 'RP-100' },
    },
    {
      alertType: 'HOS_APPROACHING_LIMIT',
      category: 'COMPLIANCE',
      priority: 'high',
      driverId: d(1).id,
      title: `HOS Warning: ${d(1).name}`,
      message: `Driver ${d(1).name} has 45 minutes remaining on on-duty hours.`,
      metadata: { remainingMinutes: '45', hoursType: 'on-duty', routePlanId: 'RP-101' },
    },
    {
      alertType: 'MISSED_APPOINTMENT',
      category: 'OPERATIONS',
      priority: 'high',
      driverId: d(2).id,
      title: `Missed Appointment: ${d(2).name}`,
      message: `Driver ${d(2).name} did not arrive at Walmart DC #4521 by scheduled time 2:00 PM.`,
      metadata: { stopName: 'Walmart DC #4521', scheduledTime: '2:00 PM', routePlanId: 'RP-102' },
    },
    {
      alertType: 'DRIVER_NOT_MOVING',
      category: 'OPERATIONS',
      priority: 'medium',
      driverId: d(0).id,
      title: `Stationary Alert: ${d(0).name}`,
      message: `Driver ${d(0).name} has been stationary for 47 minutes at I-95 Exit 42, NJ.`,
      metadata: { stationaryMinutes: '47', location: 'I-95 Exit 42, NJ', vehicleId: 'VH-TRK-001' },
    },
    {
      alertType: 'FUEL_LOW',
      category: 'VEHICLE',
      priority: 'medium',
      driverId: d(3).id,
      title: `Low Fuel: ${d(3).name}`,
      message: `Vehicle has 12% fuel remaining. Estimated range: 45 miles.`,
      metadata: { fuelPercent: '12', rangeEstimateMiles: '45', vehicleId: 'VH-TRK-004' },
    },
    {
      alertType: 'ROAD_CLOSURE',
      category: 'ROUTING',
      priority: 'high',
      driverId: d(1).id,
      title: `Road Closure: I-81 Northbound`,
      message: `Multi-vehicle accident on I-81 Northbound near Exit 114. Affecting driver ${d(1).name}.`,
      metadata: { road: 'I-81 Northbound near Exit 114', reason: 'Multi-vehicle accident' },
    },
    {
      alertType: 'SPEEDING',
      category: 'SAFETY',
      priority: 'medium',
      driverId: d(4).id,
      title: `Speeding: ${d(4).name}`,
      message: `Driver ${d(4).name} traveling at 78 mph in a 65 mph zone.`,
      metadata: { speed: '78', speedLimit: '65', vehicleId: 'VH-TRK-005' },
    },
    {
      alertType: 'APPOINTMENT_AT_RISK',
      category: 'OPERATIONS',
      priority: 'high',
      driverId: d(2).id,
      title: `Appointment at Risk: ${d(2).name}`,
      message: `ETA for Target DC #1022 delayed by 35 minutes.`,
      metadata: { stopName: 'Target DC #1022', etaDelay: '35', routePlanId: 'RP-102' },
    },
    {
      alertType: 'INTEGRATION_FAILURE',
      category: 'SYSTEM',
      priority: 'low',
      driverId: 'SYSTEM',
      title: 'Integration Failure: Samsara ELD',
      message: 'Samsara API rate limit exceeded (429). Retrying in 60 seconds.',
      metadata: { integrationName: 'Samsara ELD', error: 'API rate limit exceeded (429)' },
    },
    {
      alertType: 'BREAK_REQUIRED',
      category: 'COMPLIANCE',
      priority: 'high',
      driverId: d(3).id,
      title: `Break Required: ${d(3).name}`,
      message: `Driver ${d(3).name} has 22 minutes until mandatory 30-minute break is required.`,
      metadata: { remainingMinutes: '22', routePlanId: 'RP-103' },
    },
  ];
}

export const seed = {
  name: 'Sample Alerts',
  description: 'Creates 10 sample alerts across compliance, operations, safety, and system categories',

  async run(prisma: PrismaClient): Promise<{ created: number; skipped: number }> {
    // Check if alerts already exist (idempotent)
    const existingCount = await prisma.alert.count();
    if (existingCount > 0) {
      return { created: 0, skipped: existingCount };
    }

    // Try to find real drivers, fall back to mock dataset
    const dbDrivers = await prisma.driver.findMany({
      take: 10,
      select: { driverId: true, name: true },
    });

    const drivers = dbDrivers.length > 0
      ? dbDrivers.map((d) => ({ id: d.driverId, name: d.name }))
      : MOCK_DRIVERS.map((d) => ({ id: d.id, name: driverName(d) }));

    // Find a tenant to associate alerts with
    const tenant = await prisma.tenant.findFirst();
    const tenantId = tenant?.id ?? 1;

    const alertData = getAlertSeedData(drivers);
    let created = 0;

    for (const alert of alertData) {
      try {
        const data: Prisma.AlertUncheckedCreateInput = {
            alertId: `ALT-SEED-${randomUUID().slice(0, 8).toUpperCase()}`,
            tenantId,
            alertType: alert.alertType,
            category: alert.category,
            priority: alert.priority,
            status: 'active',
            driverId: alert.driverId,
            title: alert.title,
            message: alert.message,
            metadata: alert.metadata,
        };
        await prisma.alert.create({ data });
        created++;
      } catch (error: any) {
        console.log(`  Warning: Failed to create ${alert.alertType}: ${error.message}`);
      }
    }

    return { created, skipped: 0 };
  },
};
