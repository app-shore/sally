import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CommandCenterService } from './command-center.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('CommandCenterService', () => {
  let service: CommandCenterService;

  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockPrismaService = {
    alert: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    driver: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    load: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    shiftNote: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 1 }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandCenterService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<CommandCenterService>(CommandCenterService);
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('should return overview with all sections', async () => {
      const result = await service.getOverview(1);

      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('active_routes');
      expect(result).toHaveProperty('quick_action_counts');
      expect(result).toHaveProperty('driver_hos_strip');
    });

    it('should include KPI fields', async () => {
      const result = await service.getOverview(1);

      expect(result.kpis).toHaveProperty('active_routes');
      expect(result.kpis).toHaveProperty('on_time_percentage');
      expect(result.kpis).toHaveProperty('hos_violations');
      expect(result.kpis).toHaveProperty('active_alerts');
      expect(result.kpis).toHaveProperty('avg_response_time_minutes');
    });

    it('should return empty active routes when no route plans exist', async () => {
      const result = await service.getOverview(1);

      expect(result.active_routes).toEqual([]);
    });

    it('should return empty driver HOS strip when no active routes', async () => {
      const result = await service.getOverview(1);

      expect(result.driver_hos_strip).toEqual([]);
    });

    it('should query real drivers and loads from DB', async () => {
      await service.getOverview(1);

      expect(mockPrismaService.driver.findMany).toHaveBeenCalledWith({
        where: { tenantId: 1, isActive: true },
      });
      expect(mockPrismaService.load.count).toHaveBeenCalledWith({
        where: { tenantId: 1, status: 'UNASSIGNED' },
      });
    });

    it('should use cache on second call', async () => {
      const result = await service.getOverview(1);
      mockCacheManager.get.mockResolvedValueOnce(result);

      const cached = await service.getOverview(1);
      expect(cached).toEqual(result);
    });
  });

  describe('getShiftNotes', () => {
    it('should return notes array', async () => {
      const result = await service.getShiftNotes(1);
      expect(result).toHaveProperty('notes');
      expect(Array.isArray(result.notes)).toBe(true);
    });
  });

  describe('deleteShiftNote', () => {
    it('should soft-delete by setting deletedAt', async () => {
      await service.deleteShiftNote(1, 'note-123');

      expect(mockPrismaService.shiftNote.updateMany).toHaveBeenCalledWith({
        where: { noteId: 'note-123', tenantId: 1, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
