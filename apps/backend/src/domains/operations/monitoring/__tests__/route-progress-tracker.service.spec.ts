import { Test, TestingModule } from '@nestjs/testing';
import { RouteProgressTrackerService } from '../services/route-progress-tracker.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

describe('RouteProgressTrackerService', () => {
  let service: RouteProgressTrackerService;

  const mockPrisma = {
    routeSegment: { update: jest.fn().mockResolvedValue({}) },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteProgressTrackerService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(RouteProgressTrackerService);
    jest.clearAllMocks();
  });

  describe('determineCurrentSegment', () => {
    it('should find the first in_progress segment', () => {
      const segments = [
        { id: 1, sequenceOrder: 1, status: 'completed', segmentType: 'drive' },
        { id: 2, sequenceOrder: 2, status: 'in_progress', segmentType: 'drive' },
        { id: 3, sequenceOrder: 3, status: 'planned', segmentType: 'dock' },
      ];

      const result = service.determineCurrentSegment(segments);
      expect(result?.id).toBe(2);
    });

    it('should return the first planned segment if none in_progress', () => {
      const segments = [
        { id: 1, sequenceOrder: 1, status: 'completed', segmentType: 'drive' },
        { id: 2, sequenceOrder: 2, status: 'planned', segmentType: 'drive' },
      ];

      const result = service.determineCurrentSegment(segments);
      expect(result?.id).toBe(2);
    });

    it('should return null if all segments are completed', () => {
      const segments = [
        { id: 1, sequenceOrder: 1, status: 'completed', segmentType: 'drive' },
        { id: 2, sequenceOrder: 2, status: 'completed', segmentType: 'dock' },
      ];

      const result = service.determineCurrentSegment(segments);
      expect(result).toBeNull();
    });
  });

  describe('updateSegmentStatuses', () => {
    it('should mark passed drive segments as completed', async () => {
      const segments = [
        { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'in_progress', segmentType: 'drive', toLat: 34.0, toLon: -118.0 },
        { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'planned', segmentType: 'drive', toLat: 35.0, toLon: -117.0 },
      ];
      const gps = { latitude: 34.0, longitude: -118.0 };

      await service.updateSegmentStatuses(segments, gps);

      expect(mockPrisma.routeSegment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ status: 'completed' }),
        }),
      );
    });

    it('should NOT auto-complete dock segments — only transition to in_progress', async () => {
      const segments = [
        { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'in_progress', segmentType: 'drive', toLat: 34.0, toLon: -118.0 },
        { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'planned', segmentType: 'dock', actionType: 'pickup', toLat: 34.0, toLon: -118.0 },
      ];
      const gps = { latitude: 34.0, longitude: -118.0 };

      const result = await service.updateSegmentStatuses(segments, gps);

      // Drive segment should be completed
      expect(mockPrisma.routeSegment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ status: 'completed' }),
        }),
      );
      // Dock segment should transition to in_progress, NOT completed
      expect(mockPrisma.routeSegment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 2 },
          data: expect.objectContaining({ status: 'in_progress' }),
        }),
      );
      // Current segment should be the dock (waiting for driver confirmation)
      expect(result?.id).toBe(2);
      expect(result?.status).toBe('in_progress');
    });

    it('should auto-complete drive segments when GPS < 1 mile', async () => {
      const segments = [
        { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'in_progress', segmentType: 'drive', toLat: 34.0, toLon: -118.0 },
      ];
      const gps = { latitude: 34.0, longitude: -118.0 };

      await service.updateSegmentStatuses(segments, gps);

      expect(mockPrisma.routeSegment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ status: 'completed' }),
        }),
      );
    });

    it('should leave in_progress dock segment alone when GPS is still nearby', async () => {
      const segments = [
        { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'completed', segmentType: 'drive', toLat: 34.0, toLon: -118.0 },
        { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'in_progress', segmentType: 'dock', actionType: 'pickup', toLat: 34.0, toLon: -118.0 },
      ];
      const gps = { latitude: 34.0, longitude: -118.0 };

      const result = await service.updateSegmentStatuses(segments, gps);

      // Dock segment stays in_progress (no update call for it)
      expect(result?.id).toBe(2);
      expect(result?.status).toBe('in_progress');
    });
  });
});
