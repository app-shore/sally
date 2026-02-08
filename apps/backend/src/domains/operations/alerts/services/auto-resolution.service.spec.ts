import { Test, TestingModule } from '@nestjs/testing';
import { AutoResolutionService } from './auto-resolution.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';

describe('AutoResolutionService', () => {
  let service: AutoResolutionService;

  const mockPrisma = {
    alert: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockSse = {
    emitToTenant: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoResolutionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SseService, useValue: mockSse },
      ],
    }).compile();

    service = module.get<AutoResolutionService>(AutoResolutionService);
    jest.clearAllMocks();
  });

  describe('autoResolve', () => {
    it('should auto-resolve an alert with reason', async () => {
      const mockAlert = {
        alertId: 'ALT-001',
        tenantId: 1,
        status: 'auto_resolved',
        autoResolved: true,
        autoResolveReason: 'Driver resumed movement',
      };
      mockPrisma.alert.update.mockResolvedValue(mockAlert);

      const result = await service.autoResolve('ALT-001', 1, 'Driver resumed movement');

      expect(mockPrisma.alert.update).toHaveBeenCalledWith({
        where: { alertId: 'ALT-001' },
        data: {
          status: 'auto_resolved',
          autoResolved: true,
          autoResolveReason: 'Driver resumed movement',
          resolvedAt: expect.any(Date),
        },
      });
      expect(mockSse.emitToTenant).toHaveBeenCalledWith(1, 'alert:resolved', expect.any(Object));
    });
  });

  describe('unsnoozeExpired', () => {
    it('should unsnooze alerts past their snooze time', async () => {
      const expiredSnooze = {
        alertId: 'ALT-002',
        tenantId: 1,
        status: 'snoozed',
        snoozedUntil: new Date(Date.now() - 60000), // expired 1 min ago
      };
      mockPrisma.alert.findMany.mockResolvedValue([expiredSnooze]);
      mockPrisma.alert.update.mockResolvedValue({ ...expiredSnooze, status: 'active' });

      await service.unsnoozeExpired();

      expect(mockPrisma.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { alertId: 'ALT-002' },
          data: expect.objectContaining({ status: 'active', snoozedUntil: null }),
        }),
      );
    });
  });
});
