export interface AlertTypeDefinition {
  type: string;
  category: string;
  defaultPriority: string;
  title: (params: Record<string, any>) => string;
  message: (params: Record<string, any>) => string;
  recommendedAction: (params: Record<string, any>) => string;
  autoResolveCondition?: string;
}

export const ALERT_TYPES: Record<string, AlertTypeDefinition> = {
  // HOS Compliance (6 types)
  HOS_VIOLATION: {
    type: 'HOS_VIOLATION',
    category: 'hos',
    defaultPriority: 'critical',
    title: (p) => `HOS Violation — ${p.driverName || p.driverId}`,
    message: (p) => `Driver ${p.driverName || p.driverId} has exceeded ${p.hoursType || 'driving'} hours limit. Current: ${p.currentHours || '?'}h, Limit: ${p.limitHours || '?'}h.`,
    recommendedAction: (p) => `Immediately contact driver to stop driving. Review route ${p.routePlanId || ''} for required rest stop.`,
  },
  HOS_APPROACHING_LIMIT: {
    type: 'HOS_APPROACHING_LIMIT',
    category: 'hos',
    defaultPriority: 'high',
    title: (p) => `HOS Approaching Limit — ${p.driverName || p.driverId}`,
    message: (p) => `Driver has ${p.remainingMinutes || '?'} minutes of ${p.hoursType || 'driving'} time remaining.`,
    recommendedAction: () => `Review remaining stops. Consider inserting rest stop if needed.`,
    autoResolveCondition: 'Driver takes required rest',
  },
  BREAK_REQUIRED: {
    type: 'BREAK_REQUIRED',
    category: 'hos',
    defaultPriority: 'high',
    title: (p) => `30-Min Break Required — ${p.driverName || p.driverId}`,
    message: (p) => `Driver must take a 30-minute break within ${p.remainingMinutes || '?'} minutes.`,
    recommendedAction: () => `Identify nearest safe stopping point for break.`,
    autoResolveCondition: 'Driver takes break',
  },
  CYCLE_APPROACHING_LIMIT: {
    type: 'CYCLE_APPROACHING_LIMIT',
    category: 'hos',
    defaultPriority: 'medium',
    title: (p) => `Cycle Limit Approaching — ${p.driverName || p.driverId}`,
    message: (p) => `Driver approaching ${p.cycleType || '70-hour'} cycle limit. ${p.remainingHours || '?'}h remaining.`,
    recommendedAction: () => `Plan for 34-hour restart if needed within next assignments.`,
    autoResolveCondition: 'Cycle resets',
  },
  RECAP_HOURS_AVAILABLE: {
    type: 'RECAP_HOURS_AVAILABLE',
    category: 'hos',
    defaultPriority: 'low',
    title: (p) => `Recap Hours Available — ${p.driverName || p.driverId}`,
    message: (p) => `${p.hoursAvailable || '?'} recap hours became available for driver.`,
    recommendedAction: () => `No action needed. Informational only.`,
  },
  DUTY_STATUS_CHANGE: {
    type: 'DUTY_STATUS_CHANGE',
    category: 'hos',
    defaultPriority: 'low',
    title: (p) => `Duty Status Change — ${p.driverName || p.driverId}`,
    message: (p) => `Driver status changed from ${p.fromStatus || '?'} to ${p.toStatus || '?'}.`,
    recommendedAction: () => `Review if status change is expected per route plan.`,
  },

  // Route Progress (5 types)
  MISSED_APPOINTMENT: {
    type: 'MISSED_APPOINTMENT',
    category: 'route',
    defaultPriority: 'critical',
    title: (p) => `Missed Appointment — ${p.stopName || p.driverId}`,
    message: (p) => `Appointment at ${p.stopName || 'stop'} was missed. Scheduled: ${p.scheduledTime || '?'}.`,
    recommendedAction: (p) => `Contact receiver at ${p.stopName || 'stop'}. Reschedule appointment.`,
  },
  APPOINTMENT_AT_RISK: {
    type: 'APPOINTMENT_AT_RISK',
    category: 'route',
    defaultPriority: 'high',
    title: (p) => `Appointment At Risk — ${p.stopName || p.driverId}`,
    message: (p) => `ETA ${p.etaDelay || '?'} minutes late for ${p.stopName || 'next stop'}.`,
    recommendedAction: () => `Evaluate alternate routing or contact receiver to adjust window.`,
    autoResolveCondition: 'ETA recovers within window',
  },
  DOCK_TIME_EXCEEDED: {
    type: 'DOCK_TIME_EXCEEDED',
    category: 'route',
    defaultPriority: 'medium',
    title: (p) => `Dock Time Exceeded — ${p.stopName || p.driverId}`,
    message: (p) => `Driver has been at dock for ${p.dockMinutes || '?'} min (expected: ${p.expectedMinutes || '?'} min).`,
    recommendedAction: () => `Contact driver or facility to check on loading status.`,
    autoResolveCondition: 'Driver departs dock',
  },
  ROUTE_DELAY: {
    type: 'ROUTE_DELAY',
    category: 'route',
    defaultPriority: 'medium',
    title: (p) => `Route Delay — ${p.driverName || p.driverId}`,
    message: (p) => `Route delayed by ${p.delayMinutes || '?'} minutes due to ${p.reason || 'unknown cause'}.`,
    recommendedAction: () => `Review route for re-planning options.`,
    autoResolveCondition: 'Delay resolves',
  },
  ROUTE_COMPLETED: {
    type: 'ROUTE_COMPLETED',
    category: 'route',
    defaultPriority: 'low',
    title: (p) => `Route Completed — ${p.driverName || p.driverId}`,
    message: (p) => `Route ${p.routePlanId || ''} completed successfully.`,
    recommendedAction: () => `No action needed.`,
  },

  // Driver Behavior (3 types)
  DRIVER_NOT_MOVING: {
    type: 'DRIVER_NOT_MOVING',
    category: 'driver',
    defaultPriority: 'high',
    title: (p) => `Driver Not Moving — ${p.driverName || p.driverId}`,
    message: (p) => `Driver has been stationary for ${p.stationaryMinutes || '?'} minutes at ${p.location || 'unknown location'}.`,
    recommendedAction: () => `Contact driver to check status. May indicate breakdown or rest.`,
    autoResolveCondition: 'Driver resumes movement',
  },
  SPEEDING: {
    type: 'SPEEDING',
    category: 'driver',
    defaultPriority: 'medium',
    title: (p) => `Speeding — ${p.driverName || p.driverId}`,
    message: (p) => `Driver traveling at ${p.speed || '?'} mph in ${p.speedLimit || '?'} mph zone.`,
    recommendedAction: () => `Contact driver if speed continues above threshold.`,
    autoResolveCondition: 'Speed returns to normal',
  },
  UNAUTHORIZED_STOP: {
    type: 'UNAUTHORIZED_STOP',
    category: 'driver',
    defaultPriority: 'medium',
    title: (p) => `Unauthorized Stop — ${p.driverName || p.driverId}`,
    message: (p) => `Driver stopped at unplanned location: ${p.location || 'unknown'}.`,
    recommendedAction: () => `Contact driver to verify reason for stop.`,
    autoResolveCondition: 'Driver departs',
  },

  // Vehicle State (2 types)
  FUEL_LOW: {
    type: 'FUEL_LOW',
    category: 'vehicle',
    defaultPriority: 'high',
    title: (p) => `Fuel Low — ${p.vehicleId || p.driverId}`,
    message: (p) => `Fuel level at ${p.fuelPercent || '?'}%. Estimated range: ${p.rangeEstimateMiles || '?'} miles.`,
    recommendedAction: () => `Route includes fuel stop. Verify driver plans to refuel.`,
    autoResolveCondition: 'Fuel level increases',
  },
  MAINTENANCE_DUE: {
    type: 'MAINTENANCE_DUE',
    category: 'vehicle',
    defaultPriority: 'low',
    title: (p) => `Maintenance Due — ${p.vehicleId || p.driverId}`,
    message: (p) => `Vehicle ${p.vehicleId || '?'} has maintenance due: ${p.maintenanceType || 'scheduled'}.`,
    recommendedAction: () => `Schedule maintenance at next available time.`,
  },

  // External Conditions (2 types)
  WEATHER_ALERT: {
    type: 'WEATHER_ALERT',
    category: 'external',
    defaultPriority: 'medium',
    title: (p) => `Weather Alert — ${p.area || p.driverId}`,
    message: (p) => `${p.weatherType || 'Severe weather'} reported on route: ${p.description || 'Check conditions'}.`,
    recommendedAction: () => `Monitor conditions. Consider alternate routing if severe.`,
    autoResolveCondition: 'Weather clears',
  },
  ROAD_CLOSURE: {
    type: 'ROAD_CLOSURE',
    category: 'external',
    defaultPriority: 'high',
    title: (p) => `Road Closure — ${p.road || p.driverId}`,
    message: (p) => `${p.road || 'Road'} is closed: ${p.reason || 'Check for details'}. Detour may be needed.`,
    recommendedAction: () => `Re-plan route to avoid closure.`,
    autoResolveCondition: 'Road reopens',
  },

  // System (2 types)
  INTEGRATION_FAILURE: {
    type: 'INTEGRATION_FAILURE',
    category: 'system',
    defaultPriority: 'high',
    title: (p) => `Integration Failure — ${p.integrationName || 'Unknown'}`,
    message: (p) => `${p.integrationName || 'Integration'} sync failed: ${p.error || 'Unknown error'}.`,
    recommendedAction: () => `Check integration settings. Retry sync manually if needed.`,
    autoResolveCondition: 'Sync succeeds',
  },
  SYSTEM_ERROR: {
    type: 'SYSTEM_ERROR',
    category: 'system',
    defaultPriority: 'critical',
    title: (p) => `System Error — ${p.component || 'SALLY'}`,
    message: (p) => `System error in ${p.component || 'unknown component'}: ${p.error || 'Unknown'}.`,
    recommendedAction: () => `Contact support if error persists.`,
  },

  // Lifecycle (2 types)
  UNCONFIRMED_PICKUP: {
    type: 'UNCONFIRMED_PICKUP',
    category: 'route',
    defaultPriority: 'high',
    title: (p) => `Unconfirmed Pickup — ${p.driverName || p.driverId}`,
    message: (p) => `Driver departed ${p.stopName || 'dock'} without confirming pickup. Load may be on truck without confirmation.`,
    recommendedAction: (p) => `Contact driver to confirm pickup, or confirm on their behalf for ${p.stopName || 'this stop'}.`,
  },
  UNCONFIRMED_DELIVERY: {
    type: 'UNCONFIRMED_DELIVERY',
    category: 'route',
    defaultPriority: 'high',
    title: (p) => `Unconfirmed Delivery — ${p.driverName || p.driverId}`,
    message: (p) => `Driver departed ${p.stopName || 'dock'} without confirming delivery. Load status not updated.`,
    recommendedAction: (p) => `Contact driver to confirm delivery, or confirm on their behalf for ${p.stopName || 'this stop'}.`,
  },
};
