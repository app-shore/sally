import { Test, TestingModule } from '@nestjs/testing';
import { RouteUpdateHandlerService } from '../services/route-update-handler.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AlertTriggersService } from '../../alerts/services/alert-triggers.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';

describe('RouteUpdateHandlerService', () => {
  let service: RouteUpdateHandlerService;

  const mockPrisma = {
    routePlanUpdate: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    routePlan: { update: jest.fn().mockResolvedValue({}) },
    routeSegment: { updateMany: jest.fn().mockResolvedValue({}) },
  };
  const mockAlertTriggers = { trigger: jest.fn().mockResolvedValue({ alertId: 'ALT-001' }) };
  const mockSse = { emitToTenant: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteUpdateHandlerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AlertTriggersService, useValue: mockAlertTriggers },
        { provide: SseService, useValue: mockSse },
      ],
    }).compile();

    service = module.get(RouteUpdateHandlerService);
    jest.clearAllMocks();
  });

  it('should create RoutePlanUpdate record for alert-only triggers', async () => {
    const triggers = [
      { type: 'HOS_APPROACHING_LIMIT', severity: 'high' as const, requiresReplan: false, etaImpactMinutes: 0, params: { driverName: 'John', remainingMinutes: 45 } },
    ];

    await service.handleTriggers(triggers, { planId: 'RP-001', id: 1, tenantId: 1, planVersion: 1 }, 'driver-1');

    expect(mockPrisma.routePlanUpdate.create).toHaveBeenCalled();
    expect(mockAlertTriggers.trigger).toHaveBeenCalledWith('HOS_APPROACHING_LIMIT', 1, 'driver-1', expect.any(Object));
    expect(mockSse.emitToTenant).toHaveBeenCalledWith(1, 'monitoring:trigger_fired', expect.any(Object));
  });

  it('should record replan info when trigger requires replan', async () => {
    const triggers = [
      { type: 'HOS_VIOLATION', severity: 'critical' as const, requiresReplan: true, etaImpactMinutes: 600, params: { driverName: 'John' } },
    ];

    await service.handleTriggers(triggers, { planId: 'RP-001', id: 1, tenantId: 1, planVersion: 1 }, 'driver-1');

    expect(mockPrisma.routePlanUpdate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ replanTriggered: true }),
      }),
    );
  });

  it('should not process empty triggers array', async () => {
    await service.handleTriggers([], { planId: 'RP-001', id: 1, tenantId: 1, planVersion: 1 }, 'driver-1');

    expect(mockAlertTriggers.trigger).not.toHaveBeenCalled();
    expect(mockPrisma.routePlanUpdate.create).not.toHaveBeenCalled();
  });
});
