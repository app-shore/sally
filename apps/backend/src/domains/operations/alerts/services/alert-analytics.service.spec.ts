import { Test, TestingModule } from '@nestjs/testing';
import { AlertAnalyticsService } from './alert-analytics.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

describe('AlertAnalyticsService', () => {
  let service: AlertAnalyticsService;

  const mockPrisma = {
    alert: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertAnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AlertAnalyticsService>(AlertAnalyticsService);
    jest.clearAllMocks();
  });

  describe('getVolumeByCategory', () => {
    it('should return alert counts grouped by category', async () => {
      mockPrisma.alert.groupBy.mockResolvedValue([
        { category: 'hos', _count: { id: 15 } },
        { category: 'route', _count: { id: 8 } },
      ]);

      const result = await service.getVolumeByCategory(1, 7);

      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('hos');
      expect(result[0].count).toBe(15);
    });
  });

  describe('getResponseTimeTrend', () => {
    it('should return daily average response times', async () => {
      mockPrisma.alert.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-02-05T10:00:00Z'),
          acknowledgedAt: new Date('2026-02-05T10:05:00Z'),
        },
        {
          createdAt: new Date('2026-02-05T11:00:00Z'),
          acknowledgedAt: new Date('2026-02-05T11:10:00Z'),
        },
      ]);

      const result = await service.getResponseTimeTrend(1, 7);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getAlertHistory', () => {
    it('should return paginated alert history', async () => {
      mockPrisma.alert.findMany.mockResolvedValue([]);
      mockPrisma.alert.count.mockResolvedValue(0);

      const result = await service.getAlertHistory(1, { page: 1, limit: 20 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
