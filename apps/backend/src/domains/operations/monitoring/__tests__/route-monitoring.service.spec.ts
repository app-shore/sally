import { Test, TestingModule } from '@nestjs/testing';
import { RouteMonitoringService } from '../services/route-monitoring.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IntegrationManagerService } from '../../../integrations/services/integration-manager.service';
import { MonitoringChecksService } from '../services/monitoring-checks.service';
import { RouteProgressTrackerService } from '../services/route-progress-tracker.service';
import { RouteUpdateHandlerService } from '../services/route-update-handler.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';

describe('RouteMonitoringService', () => {
  let service: RouteMonitoringService;

  const mockPrisma = {
    routePlan: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const mockIntegrationManager = {
    getDriverHOS: jest.fn().mockResolvedValue({ driveTimeRemainingMs: 5 * 3600000 }),
    getVehicleLocation: jest.fn().mockResolvedValue({ vehicleId: 'veh-1', latitude: 34.05, longitude: -118.24, speed: 65, heading: 270, timestamp: new Date().toISOString() }),
  };
  const mockChecks = { runAllChecks: jest.fn().mockReturnValue([]) };
  const mockProgressTracker = {
    updateSegmentStatuses: jest.fn().mockResolvedValue(null),
    determineCurrentSegment: jest.fn().mockReturnValue(null),
  };
  const mockUpdateHandler = { handleTriggers: jest.fn().mockResolvedValue(undefined) };
  const mockSse = { emitToTenant: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteMonitoringService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IntegrationManagerService, useValue: mockIntegrationManager },
        { provide: MonitoringChecksService, useValue: mockChecks },
        { provide: RouteProgressTrackerService, useValue: mockProgressTracker },
        { provide: RouteUpdateHandlerService, useValue: mockUpdateHandler },
        { provide: SseService, useValue: mockSse },
      ],
    }).compile();

    service = module.get(RouteMonitoringService);
    jest.clearAllMocks();
  });

  it('should query active route plans and process each one', async () => {
    const mockPlan = {
      id: 1,
      planId: 'RP-001',
      tenantId: 1,
      planVersion: 1,
      driver: { driverId: 'drv-1', name: 'John Doe' },
      vehicle: { vehicleId: 'veh-1' },
      segments: [{ id: 1, sequenceOrder: 1, status: 'in_progress', segmentType: 'drive' }],
    };
    mockPrisma.routePlan.findMany.mockResolvedValue([mockPlan]);
    mockProgressTracker.updateSegmentStatuses.mockResolvedValue(mockPlan.segments[0]);

    await service.monitorActiveRoutes();

    expect(mockPrisma.routePlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, status: 'active' },
      }),
    );
    expect(mockIntegrationManager.getDriverHOS).toHaveBeenCalledWith(1, 'drv-1');
    expect(mockChecks.runAllChecks).toHaveBeenCalled();
  });

  it('should not fail when no active routes exist', async () => {
    mockPrisma.routePlan.findMany.mockResolvedValue([]);
    await expect(service.monitorActiveRoutes()).resolves.not.toThrow();
  });

  it('should isolate errors per route', async () => {
    const plans = [
      { id: 1, planId: 'RP-001', tenantId: 1, planVersion: 1, driver: { driverId: 'drv-1', name: 'John' }, vehicle: { vehicleId: 'veh-1' }, segments: [] },
      { id: 2, planId: 'RP-002', tenantId: 1, planVersion: 1, driver: { driverId: 'drv-2', name: 'Jane' }, vehicle: { vehicleId: 'veh-2' }, segments: [] },
    ];
    mockPrisma.routePlan.findMany.mockResolvedValue(plans);
    mockIntegrationManager.getDriverHOS
      .mockRejectedValueOnce(new Error('HOS fetch failed'))
      .mockResolvedValueOnce({ driveTimeRemainingMs: 5 * 3600000 });

    await expect(service.monitorActiveRoutes()).resolves.not.toThrow();
    // Second route should still be processed
    expect(mockIntegrationManager.getDriverHOS).toHaveBeenCalledTimes(2);
  });
});
