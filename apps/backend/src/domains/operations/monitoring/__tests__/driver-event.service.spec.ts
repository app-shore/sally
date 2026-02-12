import { Test, TestingModule } from '@nestjs/testing';
import { DriverEventService } from '../services/driver-event.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { RouteEventService } from '../services/route-event.service';

describe('DriverEventService', () => {
  let service: DriverEventService;
  let mockPrisma: any;
  let mockRouteEventService: any;

  beforeEach(async () => {
    mockPrisma = {
      routeSegment: {
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      routePlan: { update: jest.fn().mockResolvedValue({}) },
      routePlanLoad: { findMany: jest.fn().mockResolvedValue([]) },
      load: { update: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((fn: any) => fn(mockPrisma)),
    };
    mockRouteEventService = {
      recordEvent: jest.fn().mockResolvedValue({ eventId: 'EVT-test' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverEventService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RouteEventService, useValue: mockRouteEventService },
      ],
    }).compile();

    service = module.get(DriverEventService);
    jest.clearAllMocks();
  });

  describe('handleStartRoute', () => {
    const makePlan = (segments: any[]) => ({
      id: 1, planId: 'RP-001', segments,
    });

    it('should start first planned segment', async () => {
      const plan = makePlan([
        { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'planned', segmentType: 'drive' },
        { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'planned', segmentType: 'dock' },
      ]);

      const result = await service.handleStartRoute(plan, {}, 1);

      expect(result.status).toBe('started');
      expect(result.currentSegment).toBe('seg-1');
      expect(mockPrisma.routeSegment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ status: 'in_progress' }),
        }),
      );
      expect(mockRouteEventService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'ROUTE_STARTED', source: 'driver' }),
      );
    });

    it('should be idempotent if already started', async () => {
      const plan = makePlan([
        { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'in_progress', segmentType: 'drive' },
      ]);

      const result = await service.handleStartRoute(plan, {}, 1);

      expect(result.status).toBe('already_started');
      expect(mockPrisma.routeSegment.update).not.toHaveBeenCalled();
    });

    it('should throw if no planned segments', async () => {
      const plan = makePlan([
        { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'completed', segmentType: 'drive' },
      ]);

      await expect(service.handleStartRoute(plan, {}, 1)).rejects.toThrow('No planned segments to start');
    });
  });

  describe('handlePickupComplete', () => {
    it('should complete dock segment and update load to in_transit', async () => {
      const plan = {
        id: 1, planId: 'RP-001',
        segments: [
          { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'completed', segmentType: 'drive' },
          { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'in_progress', segmentType: 'dock', actionType: 'pickup', stopId: 10 },
          { id: 3, segmentId: 'seg-3', sequenceOrder: 3, status: 'planned', segmentType: 'drive' },
        ],
      };

      mockPrisma.routePlanLoad.findMany.mockResolvedValue([
        { load: { id: 100, loadId: 'LOAD-001', stops: [{ stopId: 10 }] } },
      ]);
      // For checkAndCompletePlan: not all segments done
      mockPrisma.routeSegment.findMany.mockResolvedValue([
        { status: 'completed' }, { status: 'completed' }, { status: 'in_progress' },
      ]);

      const result = await service.handlePickupComplete(plan, { segmentId: 'seg-2' }, 1);

      expect(result.status).toBe('pickup_confirmed');
      // Dock segment completed
      expect(mockPrisma.routeSegment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 2 }, data: expect.objectContaining({ status: 'completed' }) }),
      );
      // Next drive segment started
      expect(mockPrisma.routeSegment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 3 }, data: expect.objectContaining({ status: 'in_progress' }) }),
      );
      // Load updated to in_transit
      expect(mockPrisma.load.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 100 }, data: { status: 'in_transit' } }),
      );
      // Event recorded
      expect(mockRouteEventService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'PICKUP_CONFIRMED', source: 'driver' }),
      );
    });

    it('should throw if segment is not a pickup dock', async () => {
      const plan = {
        id: 1, planId: 'RP-001',
        segments: [
          { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'in_progress', segmentType: 'drive' },
        ],
      };

      await expect(service.handlePickupComplete(plan, { segmentId: 'seg-1' }, 1))
        .rejects.toThrow('Pickup can only be confirmed on dock segments');
    });

    it('should be idempotent if already completed', async () => {
      const plan = {
        id: 1, planId: 'RP-001',
        segments: [
          { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'completed', segmentType: 'dock', actionType: 'pickup' },
        ],
      };

      const result = await service.handlePickupComplete(plan, { segmentId: 'seg-2' }, 1);
      expect(result.status).toBe('already_completed');
    });
  });

  describe('handleDeliveryComplete', () => {
    it('should complete dock segment, update load to delivered, and trigger plan completion', async () => {
      const plan = {
        id: 1, planId: 'RP-001',
        segments: [
          { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'completed', segmentType: 'drive' },
          { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'in_progress', segmentType: 'dock', actionType: 'dropoff', stopId: 20 },
        ],
      };

      mockPrisma.routePlanLoad.findMany.mockResolvedValue([
        { load: { id: 200, loadId: 'LOAD-002', stops: [{ stopId: 20 }] } },
      ]);
      // All segments completed after this one
      mockPrisma.routeSegment.findMany.mockResolvedValue([
        { status: 'completed' }, { status: 'completed' },
      ]);

      const result = await service.handleDeliveryComplete(plan, { segmentId: 'seg-2' }, 1);

      expect(result.status).toBe('delivery_confirmed');
      // Load updated to delivered
      expect(mockPrisma.load.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'delivered' } }),
      );
      // Plan should be marked completed (all segments done)
      expect(mockPrisma.routePlan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'completed', isActive: false }),
        }),
      );
    });
  });

  describe('handleDispatcherOverride', () => {
    it('should change segment status and record reason', async () => {
      const plan = {
        id: 1, planId: 'RP-001',
        segments: [
          { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'in_progress', segmentType: 'dock', actionType: 'pickup' },
        ],
      };
      mockPrisma.routeSegment.findMany.mockResolvedValue([{ status: 'completed' }]);

      const result = await service.handleDispatcherOverride(
        plan,
        { segmentId: 'seg-2', newStatus: 'completed', reason: 'Confirmed by phone' },
        1,
        'user-dispatch-1',
      );

      expect(result.status).toBe('overridden');
      expect(result.previousStatus).toBe('in_progress');
      expect(result.newStatus).toBe('completed');
      expect(mockRouteEventService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'DISPATCHER_OVERRIDE',
          source: 'dispatcher',
          eventData: expect.objectContaining({ reason: 'Confirmed by phone', dispatcherUserId: 'user-dispatch-1' }),
        }),
      );
    });

    it('should confirm pickup on driver behalf with confirmPickup flag', async () => {
      const plan = {
        id: 1, planId: 'RP-001',
        segments: [
          { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'in_progress', segmentType: 'dock', actionType: 'pickup', stopId: 10 },
        ],
      };
      mockPrisma.routePlanLoad.findMany.mockResolvedValue([
        { load: { id: 100, loadId: 'LOAD-001', stops: [{ stopId: 10 }] } },
      ]);
      mockPrisma.routeSegment.findMany.mockResolvedValue([{ status: 'completed' }]);

      await service.handleDispatcherOverride(
        plan,
        { segmentId: 'seg-2', newStatus: 'completed', reason: 'Driver forgot', confirmPickup: true },
        1,
        'user-dispatch-1',
      );

      expect(mockPrisma.load.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'in_transit' } }),
      );
    });
  });

  describe('plan auto-completion (via handleDeliveryComplete)', () => {
    it('should NOT complete plan if segments remain', async () => {
      const plan = {
        id: 1, planId: 'RP-001',
        segments: [
          { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'completed', segmentType: 'drive' },
          { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'in_progress', segmentType: 'dock', actionType: 'dropoff', stopId: 20 },
          { id: 3, segmentId: 'seg-3', sequenceOrder: 3, status: 'planned', segmentType: 'drive' },
        ],
      };

      mockPrisma.routePlanLoad.findMany.mockResolvedValue([]);
      // Not all done — seg-3 still in_progress after being started
      mockPrisma.routeSegment.findMany.mockResolvedValue([
        { status: 'completed' }, { status: 'completed' }, { status: 'in_progress' },
      ]);

      await service.handleDeliveryComplete(plan, { segmentId: 'seg-2' }, 1);

      // Plan should NOT be marked completed
      expect(mockPrisma.routePlan.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'completed' }),
        }),
      );
    });

    it('should complete plan with skipped segments', async () => {
      const plan = {
        id: 1, planId: 'RP-001',
        segments: [
          { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'completed', segmentType: 'drive' },
          { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'in_progress', segmentType: 'dock', actionType: 'dropoff', stopId: 20 },
        ],
      };

      mockPrisma.routePlanLoad.findMany.mockResolvedValue([]);
      // All done (mix of completed + skipped)
      mockPrisma.routeSegment.findMany.mockResolvedValue([
        { status: 'completed' }, { status: 'skipped' },
      ]);

      await service.handleDeliveryComplete(plan, { segmentId: 'seg-2' }, 1);

      // Plan should be marked completed
      expect(mockPrisma.routePlan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'completed', isActive: false }),
        }),
      );
      expect(mockRouteEventService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'ROUTE_COMPLETED', source: 'system' }),
      );
    });
  });
});
