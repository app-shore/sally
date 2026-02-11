import { Test, TestingModule } from '@nestjs/testing';
import { RouteMonitoringService } from '../services/route-monitoring.service';
import { MonitoringChecksService } from '../services/monitoring-checks.service';
import { RouteProgressTrackerService } from '../services/route-progress-tracker.service';
import { RouteUpdateHandlerService } from '../services/route-update-handler.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IntegrationManagerService } from '../../../integrations/services/integration-manager.service';
import { AlertTriggersService } from '../../alerts/services/alert-triggers.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';

describe('Monitoring Integration', () => {
  let monitoringService: RouteMonitoringService;
  let mockPrisma: any;
  let mockIntegration: any;
  let mockAlertTriggers: any;
  let mockSse: any;

  beforeEach(async () => {
    mockPrisma = {
      routePlan: { findMany: jest.fn().mockResolvedValue([]) },
      routeSegment: { update: jest.fn().mockResolvedValue({}) },
      routePlanUpdate: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    };
    mockIntegration = {
      getDriverHOS: jest.fn(),
      getVehicleLocation: jest.fn(),
    };
    mockAlertTriggers = { trigger: jest.fn().mockResolvedValue({ alertId: 'ALT-001' }) };
    mockSse = { emitToTenant: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteMonitoringService,
        MonitoringChecksService,
        RouteProgressTrackerService,
        {
          provide: RouteUpdateHandlerService,
          useFactory: () => {
            const handler = Object.create(RouteUpdateHandlerService.prototype);
            handler.prisma = mockPrisma;
            handler.alertTriggers = mockAlertTriggers;
            handler.sse = mockSse;
            handler.logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() };
            return handler;
          },
        },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IntegrationManagerService, useValue: mockIntegration },
        { provide: SseService, useValue: mockSse },
      ],
    }).compile();

    monitoringService = module.get(RouteMonitoringService);
  });

  it('should fire HOS_APPROACHING_LIMIT when drive time is low', async () => {
    const plan = {
      id: 1, planId: 'RP-001', tenantId: 1, planVersion: 1,
      driver: { driverId: 'drv-1', name: 'John Doe' },
      vehicle: { vehicleId: 'veh-1' },
      segments: [
        { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'in_progress', segmentType: 'drive', toLat: 35.0, toLon: -117.0 },
      ],
    };
    mockPrisma.routePlan.findMany.mockResolvedValue([plan]);

    // 30 min of drive time remaining — should trigger HOS_APPROACHING_LIMIT
    mockIntegration.getDriverHOS.mockResolvedValue({
      currentDutyStatus: 'driving',
      driveTimeRemainingMs: 30 * 60000,
      shiftTimeRemainingMs: 5 * 3600000,
      cycleTimeRemainingMs: 50 * 3600000,
      timeUntilBreakMs: 3 * 3600000,
    });
    mockIntegration.getVehicleLocation.mockResolvedValue({
      vehicleId: 'veh-1', latitude: 34.5, longitude: -117.5, speed: 65, heading: 90, timestamp: new Date().toISOString(),
    });

    await monitoringService.monitorActiveRoutes();

    expect(mockAlertTriggers.trigger).toHaveBeenCalledWith(
      'HOS_APPROACHING_LIMIT',
      1,
      'drv-1',
      expect.objectContaining({ hoursType: 'driving' }),
    );
    expect(mockPrisma.routePlanUpdate.create).toHaveBeenCalled();
    expect(mockSse.emitToTenant).toHaveBeenCalledWith(1, 'monitoring:trigger_fired', expect.any(Object));
  });

  it('should emit cycle_complete after processing all routes', async () => {
    mockPrisma.routePlan.findMany.mockResolvedValue([
      {
        id: 1, planId: 'RP-001', tenantId: 1, planVersion: 1,
        driver: { driverId: 'drv-1', name: 'John' },
        vehicle: { vehicleId: 'veh-1' },
        segments: [],
      },
    ]);
    mockIntegration.getDriverHOS.mockResolvedValue({
      currentDutyStatus: 'driving',
      driveTimeRemainingMs: 8 * 3600000,
      shiftTimeRemainingMs: 10 * 3600000,
      cycleTimeRemainingMs: 50 * 3600000,
      timeUntilBreakMs: 5 * 3600000,
    });
    mockIntegration.getVehicleLocation.mockRejectedValue(new Error('No GPS'));

    await monitoringService.monitorActiveRoutes();

    expect(mockSse.emitToTenant).toHaveBeenCalledWith(
      1,
      'monitoring:cycle_complete',
      expect.objectContaining({ routesMonitored: 1 }),
    );
  });
});
