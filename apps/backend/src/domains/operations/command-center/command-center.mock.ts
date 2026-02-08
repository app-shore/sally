import type { ActiveRouteDto, DriverHOSChipDto } from './command-center.types';

// ---------------------------------------------------------------------------
// Constants — realistic seed data
// ---------------------------------------------------------------------------

const DRIVERS = [
  { id: 'DRV-001', name: 'Mike Johnson' },
  { id: 'DRV-002', name: 'Sarah Chen' },
  { id: 'DRV-003', name: 'James Williams' },
  { id: 'DRV-004', name: 'Maria Garcia' },
  { id: 'DRV-005', name: 'Robert Davis' },
  { id: 'DRV-006', name: 'Emily Wilson' },
  { id: 'DRV-007', name: 'David Martinez' },
  { id: 'DRV-008', name: 'Lisa Anderson' },
  { id: 'DRV-009', name: 'Thomas Brown' },
  { id: 'DRV-010', name: 'Jennifer Taylor' },
];

const VEHICLES = [
  'TRK-001', 'TRK-002', 'TRK-003', 'TRK-004', 'TRK-005',
  'TRK-006', 'TRK-007', 'TRK-008', 'TRK-009', 'TRK-010',
];

const STOPS = [
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
  // Changes every 30 seconds so data refreshes but is stable within a window
  const timeSlot = Math.floor(Date.now() / 30000);
  return tenantId * 100000 + timeSlot;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

export function generateMockActiveRoutes(tenantId: number): ActiveRouteDto[] {
  const rand = seededRandom(getSeed(tenantId));
  const routeCount = 8 + Math.floor(rand() * 4); // 8-11 routes
  const routes: ActiveRouteDto[] = [];

  for (let i = 0; i < routeCount; i++) {
    const driver = DRIVERS[i % DRIVERS.length];
    const vehicle = VEHICLES[i % VEHICLES.length];
    const totalStops = 4 + Math.floor(rand() * 7); // 4-10 stops
    const completedStops = Math.floor(rand() * totalStops);
    const totalDistance = 200 + Math.floor(rand() * 800); // 200-1000 miles
    const distanceCompleted = Math.floor((completedStops / totalStops) * totalDistance);

    // Determine status distribution: ~50% in_transit, ~20% at_dock, ~15% resting, ~15% completed
    const statusRoll = rand();
    let status: ActiveRouteDto['status'];
    if (statusRoll < 0.50) status = 'in_transit';
    else if (statusRoll < 0.70) status = 'at_dock';
    else if (statusRoll < 0.85) status = 'resting';
    else status = 'completed';

    // HOS values
    const driveHours = status === 'completed' ? 0 : 0.5 + rand() * 10; // 0.5-10.5h
    const dutyHours = driveHours + 1 + rand() * 3;
    const cycleHours = dutyHours + 10 + rand() * 30;
    const breakHours = rand() * 8;

    // Driver HOS status matches route status
    let hosStatus: ActiveRouteDto['hos']['status'];
    if (status === 'in_transit') hosStatus = 'driving';
    else if (status === 'at_dock') hosStatus = 'on_duty';
    else if (status === 'resting') hosStatus = rand() > 0.5 ? 'sleeper' : 'off_duty';
    else hosStatus = 'off_duty';

    // ETA calculations
    const now = new Date();
    const hoursToNext = 1 + rand() * 6;
    const hoursToFinal = hoursToNext + 2 + rand() * 10;
    const nextEta = new Date(now.getTime() + hoursToNext * 3600000);
    const finalEta = new Date(now.getTime() + hoursToFinal * 3600000);

    // ETA status: ~60% on_time, ~25% at_risk, ~15% late
    const etaRoll = rand();
    let etaStatus: ActiveRouteDto['eta_status'];
    if (status === 'completed') etaStatus = 'on_time';
    else if (etaRoll < 0.60) etaStatus = 'on_time';
    else if (etaRoll < 0.85) etaStatus = 'at_risk';
    else etaStatus = 'late';

    // Appointment window (some stops have them)
    const hasAppointment = rand() > 0.3;
    const appointmentStart = new Date(nextEta.getTime() - 30 * 60000);
    const appointmentEnd = new Date(nextEta.getTime() + 60 * 60000);

    // Alert count: most routes have 0, a few have 1-2
    const alertRoll = rand();
    let alertCount = 0;
    if (alertRoll > 0.7) alertCount = 1;
    if (alertRoll > 0.9) alertCount = 2;

    // Pick stops for next and final destination
    const nextStopIdx = Math.floor(rand() * STOPS.length);
    let finalStopIdx = Math.floor(rand() * STOPS.length);
    if (finalStopIdx === nextStopIdx) finalStopIdx = (finalStopIdx + 1) % STOPS.length;

    const startedAt = new Date(now.getTime() - (2 + rand() * 12) * 3600000);

    routes.push({
      route_id: `RT-${tenantId}-${String(i + 1).padStart(3, '0')}`,
      plan_id: `PLN-${tenantId}-${String(i + 1).padStart(3, '0')}`,
      driver: { driver_id: driver.id, name: driver.name },
      vehicle: { vehicle_id: `VH-${vehicle}`, identifier: vehicle },
      status,
      progress: {
        completed_stops: completedStops,
        total_stops: totalStops,
        distance_completed_miles: distanceCompleted,
        total_distance_miles: totalDistance,
      },
      next_stop: status === 'completed' ? null : {
        name: STOPS[nextStopIdx].name,
        location: STOPS[nextStopIdx].location,
        eta: nextEta.toISOString(),
        ...(hasAppointment ? {
          appointment_window: {
            start: appointmentStart.toISOString(),
            end: appointmentEnd.toISOString(),
          },
        } : {}),
      },
      final_destination: {
        name: STOPS[finalStopIdx].name,
        location: STOPS[finalStopIdx].location,
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
  // Extract driver HOS data from active routes
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
    unassigned_loads: Math.floor(rand() * 6), // 0-5
    available_drivers: 2 + Math.floor(rand() * 6), // 2-7
  };
}
