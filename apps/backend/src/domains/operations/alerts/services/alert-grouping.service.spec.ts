import { Test, TestingModule } from '@nestjs/testing';
import { AlertGroupingService } from './alert-grouping.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

describe('AlertGroupingService', () => {
  let service: AlertGroupingService;

  const mockPrisma = {
    alert: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    alertConfiguration: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertGroupingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AlertGroupingService>(AlertGroupingService);
    jest.clearAllMocks();
  });

  describe('generateDedupKey', () => {
    it('should generate dedup key from tenant, driver, and alert type', () => {
      const key = service.generateDedupKey(1, 'driver-1', 'HOS_VIOLATION');
      expect(key).toBe('1:driver-1:HOS_VIOLATION');
    });
  });

  describe('generateGroupKey', () => {
    it('should generate group key from tenant, driver, and category', () => {
      const key = service.generateGroupKey(1, 'driver-1', 'hos');
      expect(key).toBe('1:driver-1:hos');
    });
  });

  describe('findDuplicate', () => {
    it('should find existing active alert with same dedup key', async () => {
      const existingAlert = { alertId: 'ALT-001', status: 'active', dedupKey: '1:d1:HOS_VIOLATION' };
      mockPrisma.alert.findFirst.mockResolvedValue(existingAlert);

      const result = await service.findDuplicate('1:d1:HOS_VIOLATION', 15);

      expect(result).toEqual(existingAlert);
      expect(mockPrisma.alert.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dedupKey: '1:d1:HOS_VIOLATION',
            status: { in: ['active', 'acknowledged'] },
          }),
        }),
      );
    });

    it('should return null when no duplicate exists', async () => {
      mockPrisma.alert.findFirst.mockResolvedValue(null);

      const result = await service.findDuplicate('1:d1:NEW_TYPE', 15);

      expect(result).toBeNull();
    });
  });

  describe('findParentAlert', () => {
    it('should find parent alert for cascading linking', async () => {
      const parentAlert = { alertId: 'ALT-001', alertType: 'HOS_APPROACHING_LIMIT' };
      mockPrisma.alert.findFirst.mockResolvedValue(parentAlert);

      const result = await service.findParentAlert(1, 'driver-1', 'HOS_VIOLATION');

      expect(result).toEqual(parentAlert);
    });
  });
});
