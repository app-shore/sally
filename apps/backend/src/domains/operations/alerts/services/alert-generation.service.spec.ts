import { Test, TestingModule } from '@nestjs/testing';
import { AlertGenerationService } from './alert-generation.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';
import { AlertGroupingService } from './alert-grouping.service';

describe('AlertGenerationService', () => {
  let service: AlertGenerationService;

  const mockPrisma = {
    alert: { create: jest.fn() },
  };
  const mockSse = { emitToTenant: jest.fn() };
  const mockGrouping = {
    generateDedupKey: jest.fn().mockReturnValue('1:d1:HOS_VIOLATION'),
    generateGroupKey: jest.fn().mockReturnValue('1:d1:hos'),
    findDuplicate: jest.fn().mockResolvedValue(null),
    findParentAlert: jest.fn().mockResolvedValue(null),
    getGroupingConfig: jest.fn().mockResolvedValue({
      dedupWindowMinutes: 15,
      groupSameTypePerDriver: true,
      smartGroupAcrossDrivers: true,
      linkCascading: true,
    }),
    linkToParent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertGenerationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SseService, useValue: mockSse },
        { provide: AlertGroupingService, useValue: mockGrouping },
      ],
    }).compile();

    service = module.get<AlertGenerationService>(AlertGenerationService);
    jest.clearAllMocks();
  });

  describe('generateAlert', () => {
    it('should create a new alert and emit SSE event', async () => {
      const newAlert = {
        alertId: 'ALT-001',
        tenantId: 1,
        driverId: 'driver-1',
        alertType: 'HOS_VIOLATION',
        category: 'hos',
        priority: 'critical',
        title: 'HOS Violation Detected',
        message: 'Driver exceeded driving hours',
        createdAt: new Date(),
      };
      mockPrisma.alert.create.mockResolvedValue(newAlert);

      const result = await service.generateAlert({
        tenantId: 1,
        driverId: 'driver-1',
        alertType: 'HOS_VIOLATION',
        category: 'hos',
        priority: 'critical',
        title: 'HOS Violation Detected',
        message: 'Driver exceeded driving hours',
      });

      expect(result).toEqual(newAlert);
      expect(mockSse.emitToTenant).toHaveBeenCalledWith(1, 'alert:new', expect.any(Object));
    });

    it('should skip duplicate alerts within dedup window', async () => {
      mockGrouping.findDuplicate.mockResolvedValue({ alertId: 'ALT-EXISTING' });

      const result = await service.generateAlert({
        tenantId: 1,
        driverId: 'driver-1',
        alertType: 'HOS_VIOLATION',
        category: 'hos',
        priority: 'critical',
        title: 'HOS Violation Detected',
        message: 'Duplicate',
      });

      expect(result).toBeNull();
      expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    });
  });
});
