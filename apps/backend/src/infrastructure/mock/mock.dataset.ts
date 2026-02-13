/**
 * Mock Dataset — Single Source of Truth
 *
 * All mock entity data lives here. Every service that needs mock data
 * imports from this file instead of maintaining its own inline data.
 *
 * Used by:
 * - Command center service (runtime mock routes, KPIs, HOS)
 * - Seed scripts (sample alerts, notifications)
 *
 * NOT used by:
 * - TMS adapters (they simulate external API responses in their own format)
 */

import type {
  ActiveRouteDto,
  DriverHOSChipDto,
} from '../../domains/operations/command-center/command-center.types';

// ---------------------------------------------------------------------------
// Mock Drivers (10)
// ---------------------------------------------------------------------------

export const MOCK_DRIVERS = [
  { id: 'DRV-001', firstName: 'Mike', lastName: 'Johnson', phone: '555-0101', email: 'mike.johnson@carrier.com', licenseNumber: 'TX-CDL-20198', licenseState: 'TX' },
  { id: 'DRV-002', firstName: 'Sarah', lastName: 'Chen', phone: '555-0102', email: 'sarah.chen@carrier.com', licenseNumber: 'IL-CDL-31045', licenseState: 'IL' },
  { id: 'DRV-003', firstName: 'James', lastName: 'Williams', phone: '555-0103', email: 'james.williams@carrier.com', licenseNumber: 'GA-CDL-42587', licenseState: 'GA' },
  { id: 'DRV-004', firstName: 'Maria', lastName: 'Garcia', phone: '555-0104', email: 'maria.garcia@carrier.com', licenseNumber: 'CA-CDL-53219', licenseState: 'CA' },
  { id: 'DRV-005', firstName: 'Robert', lastName: 'Davis', phone: '555-0105', email: 'robert.davis@carrier.com', licenseNumber: 'FL-CDL-64873', licenseState: 'FL' },
  { id: 'DRV-006', firstName: 'Emily', lastName: 'Wilson', phone: '555-0106', email: 'emily.wilson@carrier.com', licenseNumber: 'OH-CDL-75634', licenseState: 'OH' },
  { id: 'DRV-007', firstName: 'David', lastName: 'Martinez', phone: '555-0107', email: 'david.martinez@carrier.com', licenseNumber: 'TN-CDL-86492', licenseState: 'TN' },
  { id: 'DRV-008', firstName: 'Lisa', lastName: 'Anderson', phone: '555-0108', email: 'lisa.anderson@carrier.com', licenseNumber: 'PA-CDL-97358', licenseState: 'PA' },
  { id: 'DRV-009', firstName: 'Thomas', lastName: 'Brown', phone: '555-0109', email: 'thomas.brown@carrier.com', licenseNumber: 'NC-CDL-08216', licenseState: 'NC' },
  { id: 'DRV-010', firstName: 'Jennifer', lastName: 'Taylor', phone: '555-0110', email: 'jennifer.taylor@carrier.com', licenseNumber: 'MO-CDL-19074', licenseState: 'MO' },
];

// ---------------------------------------------------------------------------
// Mock Vehicles (10)
// ---------------------------------------------------------------------------

export const MOCK_VEHICLES = [
  { id: 'VH-TRK-001', unitNumber: 'TRK-001' },
  { id: 'VH-TRK-002', unitNumber: 'TRK-002' },
  { id: 'VH-TRK-003', unitNumber: 'TRK-003' },
  { id: 'VH-TRK-004', unitNumber: 'TRK-004' },
  { id: 'VH-TRK-005', unitNumber: 'TRK-005' },
  { id: 'VH-TRK-006', unitNumber: 'TRK-006' },
  { id: 'VH-TRK-007', unitNumber: 'TRK-007' },
  { id: 'VH-TRK-008', unitNumber: 'TRK-008' },
  { id: 'VH-TRK-009', unitNumber: 'TRK-009' },
  { id: 'VH-TRK-010', unitNumber: 'TRK-010' },
];

// ---------------------------------------------------------------------------
// Mock Loads (10) — for command center route card display
// ---------------------------------------------------------------------------

export const MOCK_LOADS = [
  { id: 'LD-1001', refNumber: 'LD-1001' },
  { id: 'LD-1002', refNumber: 'LD-1002' },
  { id: 'LD-1003', refNumber: 'LD-1003' },
  { id: 'LD-1004', refNumber: 'LD-1004' },
  { id: 'LD-1005', refNumber: 'LD-1005' },
  { id: 'LD-1006', refNumber: 'LD-1006' },
  { id: 'LD-1007', refNumber: 'LD-1007' },
  { id: 'LD-1008', refNumber: 'LD-1008' },
  { id: 'LD-1009', refNumber: 'LD-1009' },
  { id: 'LD-1010', refNumber: 'LD-1010' },
];

// ---------------------------------------------------------------------------
// Mock Stops (15) — for command center runtime display
// ---------------------------------------------------------------------------

export const MOCK_STOPS = [
  { name: 'Dallas Distribution Center', location: 'Dallas, TX' },
  { name: 'Houston Warehouse', location: 'Houston, TX' },
  { name: 'Atlanta Hub', location: 'Atlanta, GA' },
  { name: 'Chicago Terminal', location: 'Chicago, IL' },
  { name: 'Memphis Depot', location: 'Memphis, TN' },
  { name: 'Nashville Yard', location: 'Nashville, TN' },
  { name: 'Denver Freight Center', location: 'Denver, CO' },
  { name: 'Phoenix Distribution', location: 'Phoenix, AZ' },
  { name: 'Kansas City Hub', location: 'Kansas City, MO' },
  { name: 'St. Louis Terminal', location: 'St. Louis, MO' },
  { name: 'Indianapolis Depot', location: 'Indianapolis, IN' },
  { name: 'Columbus Warehouse', location: 'Columbus, OH' },
  { name: 'Charlotte Hub', location: 'Charlotte, NC' },
  { name: 'Jacksonville Port', location: 'Jacksonville, FL' },
  { name: 'San Antonio Yard', location: 'San Antonio, TX' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Helper to get full name from a mock driver */
export function driverName(driver: (typeof MOCK_DRIVERS)[number]): string {
  return `${driver.firstName} ${driver.lastName}`;
}

// ---------------------------------------------------------------------------
// Deterministic pseudo-random based on tenant + current 30-second window
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function getSeed(tenantId: number): number {
  const timeSlot = Math.floor(Date.now() / 30000);
  return tenantId * 100000 + timeSlot;
}

// ---------------------------------------------------------------------------
// Runtime Generators (for command center)
// ---------------------------------------------------------------------------

export function generateMockActiveRoutes(tenantId: number): ActiveRouteDto[] {
  const rand = seededRandom(getSeed(tenantId));
  const routeCount = 8 + Math.floor(rand() * 4);
  const routes: ActiveRouteDto[] = [];

  for (let i = 0; i < routeCount; i++) {
    const driver = MOCK_DRIVERS[i % MOCK_DRIVERS.length];
    const vehicle = MOCK_VEHICLES[i % MOCK_VEHICLES.length];
    const totalStops = 4 + Math.floor(rand() * 7);
    const completedStops = Math.floor(rand() * totalStops);
    const totalDistance = 200 + Math.floor(rand() * 800);
    const distanceCompleted = Math.floor((completedStops / totalStops) * totalDistance);

    const statusRoll = rand();
    let status: ActiveRouteDto['status'];
    if (statusRoll < 0.50) status = 'in_transit';
    else if (statusRoll < 0.70) status = 'at_dock';
    else if (statusRoll < 0.85) status = 'resting';
    else status = 'completed';

    const driveHours = status === 'completed' ? 0 : 0.5 + rand() * 10;
    const dutyHours = driveHours + 1 + rand() * 3;
    const cycleHours = dutyHours + 10 + rand() * 30;
    const breakHours = rand() * 8;

    let hosStatus: ActiveRouteDto['hos']['status'];
    if (status === 'in_transit') hosStatus = 'driving';
    else if (status === 'at_dock') hosStatus = 'on_duty';
    else if (status === 'resting') hosStatus = rand() > 0.5 ? 'sleeper' : 'off_duty';
    else hosStatus = 'off_duty';

    const now = new Date();
    const hoursToNext = 1 + rand() * 6;
    const hoursToFinal = hoursToNext + 2 + rand() * 10;
    const nextEta = new Date(now.getTime() + hoursToNext * 3600000);
    const finalEta = new Date(now.getTime() + hoursToFinal * 3600000);

    const etaRoll = rand();
    let etaStatus: ActiveRouteDto['eta_status'];
    if (status === 'completed') etaStatus = 'on_time';
    else if (etaRoll < 0.60) etaStatus = 'on_time';
    else if (etaRoll < 0.85) etaStatus = 'at_risk';
    else etaStatus = 'late';

    const hasAppointment = rand() > 0.3;
    const appointmentStart = new Date(nextEta.getTime() - 30 * 60000);
    const appointmentEnd = new Date(nextEta.getTime() + 60 * 60000);

    const alertRoll = rand();
    let alertCount = 0;
    if (alertRoll > 0.7) alertCount = 1;
    if (alertRoll > 0.9) alertCount = 2;

    const nextStopIdx = Math.floor(rand() * MOCK_STOPS.length);
    let finalStopIdx = Math.floor(rand() * MOCK_STOPS.length);
    if (finalStopIdx === nextStopIdx) finalStopIdx = (finalStopIdx + 1) % MOCK_STOPS.length;

    const startedAt = new Date(now.getTime() - (2 + rand() * 12) * 3600000);

    const load = MOCK_LOADS[i % MOCK_LOADS.length];

    routes.push({
      route_id: `RT-${tenantId}-${String(i + 1).padStart(3, '0')}`,
      plan_id: `PLN-${tenantId}-${String(i + 1).padStart(3, '0')}`,
      driver: { driver_id: driver.id, name: driverName(driver) },
      vehicle: { vehicle_id: vehicle.id, identifier: vehicle.unitNumber },
      load: { load_id: load.id, reference_number: load.refNumber },
      status,
      progress: {
        completed_stops: completedStops,
        total_stops: totalStops,
        distance_completed_miles: distanceCompleted,
        total_distance_miles: totalDistance,
      },
      next_stop: status === 'completed' ? null : {
        name: MOCK_STOPS[nextStopIdx].name,
        location: MOCK_STOPS[nextStopIdx].location,
        eta: nextEta.toISOString(),
        ...(hasAppointment ? {
          appointment_window: {
            start: appointmentStart.toISOString(),
            end: appointmentEnd.toISOString(),
          },
        } : {}),
      },
      final_destination: {
        name: MOCK_STOPS[finalStopIdx].name,
        location: MOCK_STOPS[finalStopIdx].location,
        eta: finalEta.toISOString(),
      },
      eta_status: etaStatus,
      hos: {
        drive_hours_remaining: Math.round(driveHours * 10) / 10,
        duty_hours_remaining: Math.round(dutyHours * 10) / 10,
        cycle_hours_remaining: Math.round(cycleHours * 10) / 10,
        break_hours_remaining: Math.round(breakHours * 10) / 10,
        status: hosStatus,
      },
      active_alert_count: alertCount,
      started_at: startedAt.toISOString(),
      updated_at: new Date(now.getTime() - rand() * 300000).toISOString(),
    });
  }

  return routes;
}

export function generateMockKPIs(
  routes: ActiveRouteDto[],
  realAlertStats: { active: number; avgResponseTimeMinutes: number; hosViolations: number },
) {
  const activeRoutes = routes.filter((r) => r.status !== 'completed');
  const onTimeRoutes = activeRoutes.filter((r) => r.eta_status === 'on_time');
  const onTimePercentage = activeRoutes.length > 0
    ? Math.round((onTimeRoutes.length / activeRoutes.length) * 100)
    : 100;

  return {
    active_routes: activeRoutes.length,
    on_time_percentage: onTimePercentage,
    hos_violations: realAlertStats.hosViolations,
    active_alerts: realAlertStats.active,
    avg_response_time_minutes: realAlertStats.avgResponseTimeMinutes,
  };
}

export function generateMockDriverHOS(routes: ActiveRouteDto[]): DriverHOSChipDto[] {
  const activeRoutes = routes.filter((r) => r.status !== 'completed');

  return activeRoutes.map((route) => {
    const nameParts = route.driver.name.split(' ');
    const initials = nameParts.map((p) => p[0]).join('').toUpperCase();

    return {
      driver_id: route.driver.driver_id,
      name: route.driver.name,
      initials,
      drive_hours_remaining: route.hos.drive_hours_remaining,
      duty_hours_remaining: route.hos.duty_hours_remaining,
      status: route.hos.status,
      vehicle_id: route.vehicle.vehicle_id,
      active_route_id: route.route_id,
    };
  }).sort((a, b) => a.drive_hours_remaining - b.drive_hours_remaining);
}

export function generateMockQuickActionCounts(tenantId: number): { unassigned_loads: number; available_drivers: number } {
  const rand = seededRandom(getSeed(tenantId) + 999);
  return {
    unassigned_loads: Math.floor(rand() * 6),
    available_drivers: 2 + Math.floor(rand() * 6),
  };
}
