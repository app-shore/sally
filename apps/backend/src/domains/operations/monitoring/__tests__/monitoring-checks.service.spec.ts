import { MonitoringChecksService } from '../services/monitoring-checks.service';
import { DEFAULT_THRESHOLDS, MonitoringContext } from '../monitoring.types';

describe('MonitoringChecksService', () => {
  let service: MonitoringChecksService;

  beforeEach(() => {
    service = new MonitoringChecksService();
  });

  function buildContext(overrides: Partial<MonitoringContext> = {}): MonitoringContext {
    return {
      plan: { planId: 'RP-001', id: 1, estimatedArrival: new Date('2026-02-10T18:00:00Z') },
      segments: [],
      currentSegment: { segmentType: 'drive', status: 'in_progress', estimatedArrival: new Date('2026-02-09T14:00:00Z') },
      hosData: {
        driveTimeRemainingMs: 5 * 3600000, // 5 hours
        shiftTimeRemainingMs: 8 * 3600000,
        cycleTimeRemainingMs: 50 * 3600000,
        timeUntilBreakMs: 4 * 3600000,
        currentDutyStatus: 'driving',
      },
      gpsData: { vehicleId: 'veh-1', latitude: 34.05, longitude: -118.24, speed: 65, heading: 270, timestamp: new Date().toISOString() },
      thresholds: { ...DEFAULT_THRESHOLDS },
      driverName: 'John Doe',
      ...overrides,
    };
  }

  describe('HOS checks', () => {
    it('should trigger HOS_APPROACHING_LIMIT when drive time < threshold', () => {
      const ctx = buildContext({
        hosData: { ...buildContext().hosData, driveTimeRemainingMs: 30 * 60000 }, // 30 min
      });

      const triggers = service.runAllChecks(ctx);
      const hosApproaching = triggers.filter((t) => t.type === 'HOS_APPROACHING_LIMIT');

      expect(hosApproaching.length).toBeGreaterThanOrEqual(1);
      expect(hosApproaching[0].requiresReplan).toBe(false);
    });

    it('should trigger HOS_VIOLATION when drive time is 0', () => {
      const ctx = buildContext({
        hosData: { ...buildContext().hosData, driveTimeRemainingMs: 0, currentDutyStatus: 'driving' },
      });

      const triggers = service.runAllChecks(ctx);
      const violation = triggers.find((t) => t.type === 'HOS_VIOLATION');

      expect(violation).toBeDefined();
      expect(violation!.requiresReplan).toBe(true);
      expect(violation!.severity).toBe('critical');
    });

    it('should trigger BREAK_REQUIRED when break timer expired', () => {
      const ctx = buildContext({
        hosData: { ...buildContext().hosData, timeUntilBreakMs: 0 },
      });

      const triggers = service.runAllChecks(ctx);
      expect(triggers.find((t) => t.type === 'BREAK_REQUIRED')).toBeDefined();
    });

    it('should not trigger HOS alerts when all values are healthy', () => {
      const ctx = buildContext();
      const triggers = service.runAllChecks(ctx);
      const hosAlerts = triggers.filter((t) => ['HOS_APPROACHING_LIMIT', 'HOS_VIOLATION', 'BREAK_REQUIRED', 'CYCLE_APPROACHING_LIMIT'].includes(t.type));

      expect(hosAlerts).toHaveLength(0);
    });
  });

  describe('checkUnconfirmedDockEvent', () => {
    it('should trigger UNCONFIRMED_PICKUP when dock is in_progress but driver has moved past it', () => {
      const triggers = service.runAllChecks({
        plan: { estimatedArrival: null },
        segments: [
          { segmentId: 'seg-1', sequenceOrder: 1, status: 'completed', segmentType: 'drive' },
          { segmentId: 'seg-2', sequenceOrder: 2, status: 'in_progress', segmentType: 'dock', actionType: 'pickup', toLocation: 'Warehouse A' },
          { segmentId: 'seg-3', sequenceOrder: 3, status: 'in_progress', segmentType: 'drive' },
        ],
        currentSegment: { segmentId: 'seg-3', sequenceOrder: 3, segmentType: 'drive', status: 'in_progress' },
        hosData: { driveTimeRemainingMs: 36000000, shiftTimeRemainingMs: 36000000, cycleTimeRemainingMs: 180000000, timeUntilBreakMs: 36000000, currentDutyStatus: 'driving' },
        gpsData: { speed: 65 },
        thresholds: DEFAULT_THRESHOLDS,
        driverName: 'John',
      } as any);

      const unconfirmed = triggers.find((t) => t.type === 'UNCONFIRMED_PICKUP');
      expect(unconfirmed).toBeDefined();
      expect(unconfirmed?.severity).toBe('high');
      expect(unconfirmed?.params.segmentId).toBe('seg-2');
    });
  });

  describe('Driver behavior', () => {
    it('should trigger DRIVER_NOT_MOVING when speed is 0 for too long', () => {
      const stoppedSince = new Date(Date.now() - 130 * 60000).toISOString(); // 130 min ago
      const ctx = buildContext({
        gpsData: { vehicleId: 'veh-1', latitude: 34.05, longitude: -118.24, speed: 0, heading: 0, timestamp: stoppedSince },
        currentSegment: { segmentType: 'drive', status: 'in_progress', estimatedDeparture: new Date(Date.now() - 130 * 60000) },
      });

      const triggers = service.runAllChecks(ctx);
      expect(triggers.find((t) => t.type === 'DRIVER_NOT_MOVING')).toBeDefined();
    });
  });
});
