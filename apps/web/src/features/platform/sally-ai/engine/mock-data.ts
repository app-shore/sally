import type { MockDriver, MockAlert, MockRoute, MockFleet } from './types';

export const MOCK_DRIVERS: MockDriver[] = [
  { id: 'D-001', name: 'John Davis', status: 'driving', hos_remaining: 4.2, vehicle: 'V-101', current_route: 'R-456' },
  { id: 'D-002', name: 'Mike Johnson', status: 'at_dock', hos_remaining: 7.8, vehicle: 'V-102', current_route: 'R-789' },
  { id: 'D-003', name: 'Sarah Chen', status: 'resting', hos_remaining: 0, vehicle: 'V-103', current_route: null },
  { id: 'D-004', name: 'Carlos Rivera', status: 'driving', hos_remaining: 6.1, vehicle: 'V-104', current_route: 'R-012' },
  { id: 'D-005', name: 'Lisa Thompson', status: 'off_duty', hos_remaining: 11, vehicle: 'V-105', current_route: null },
];

export const MOCK_ALERTS: MockAlert[] = [
  { id: 'A-101', severity: 'critical', type: 'hos_warning', driver: 'John Davis', message: '2.1 hrs remaining on drive window', route: 'R-456' },
  { id: 'A-102', severity: 'warning', type: 'delay', driver: null, message: '45 min behind ETA', route: 'R-456' },
  { id: 'A-103', severity: 'info', type: 'fuel_low', vehicle: 'V-789', driver: null, message: 'Range: 45 miles', route: 'R-789' },
  { id: 'A-104', severity: 'critical', type: 'driver_not_moving', driver: 'Mike Johnson', message: 'Stationary for 47 minutes at dock', route: 'R-789' },
  { id: 'A-105', severity: 'warning', type: 'weather', driver: null, message: 'Severe thunderstorm warning on I-40', route: 'R-012' },
];

export const MOCK_ROUTES: MockRoute[] = [
  { id: 'R-456', origin: 'Dallas, TX', destination: 'Houston, TX', stops: 3, eta: '3:45 PM', status: 'in_progress', driver: 'John Davis' },
  { id: 'R-789', origin: 'Chicago, IL', destination: 'Memphis, TN', stops: 5, eta: '8:30 PM', status: 'in_progress', driver: 'Mike Johnson' },
  { id: 'R-012', origin: 'Atlanta, GA', destination: 'Miami, FL', stops: 4, eta: 'Tomorrow 6:00 AM', status: 'in_progress', driver: 'Carlos Rivera' },
  { id: 'R-345', origin: 'Los Angeles, CA', destination: 'Phoenix, AZ', stops: 2, eta: 'Tomorrow 10:00 AM', status: 'planned', driver: null },
];

export const MOCK_FLEET: MockFleet = {
  active_vehicles: 12,
  active_routes: 8,
  pending_alerts: 5,
  drivers_available: 4,
  drivers_driving: 6,
  drivers_resting: 2,
};

export const PROSPECT_SUGGESTIONS = [
  'What is SALLY?',
  'See pricing',
  'Book a demo',
  'Integrations',
];

export const DISPATCHER_SUGGESTIONS = [
  'Active alerts',
  'Fleet status',
  'Find a driver',
  'Route updates',
];

export const DRIVER_SUGGESTIONS = [
  'Next break',
  'My ETA',
  'Route status',
  'Report delay',
];
