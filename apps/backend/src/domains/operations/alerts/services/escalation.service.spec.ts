import { Test, TestingModule } from '@nestjs/testing';
import { EscalationService } from './escalation.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';

describe('EscalationService', () => {
  let service: EscalationService;

  const mockPrisma = {
    alert: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    alertConfiguration: {
      findMany: jest.fn(),
    },
  };

  const mockSse = {
    emitToTenant: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscalationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SseService, useValue: mockSse },
      ],
    }).compile();

    service = module.get<EscalationService>(EscalationService);
    jest.clearAllMocks();
  });

  describe('checkEscalations', () => {
    it('should escalate alerts that exceed SLA', async () => {
      const tenantConfig = {
        tenantId: 1,
        escalationPolicy: {
          critical: { acknowledgeSlaMinutes: 5, escalateTo: 'supervisors', channels: ['email'] },
        },
      };
      mockPrisma.alertConfiguration.findMany.mockResolvedValue([tenantConfig]);

      const overdueAlert = {
        alertId: 'ALT-001',
        tenantId: 1,
        priority: 'critical',
        status: 'active',
        escalationLevel: 0,
        createdAt: new Date(Date.now() - 10 * 60000), // 10 min ago (exceeds 5 min SLA)
      };
      mockPrisma.alert.findMany.mockResolvedValue([overdueAlert]);
      mockPrisma.alert.update.mockResolvedValue({ ...overdueAlert, escalationLevel: 1 });

      await service.checkEscalations();

      expect(mockPrisma.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { alertId: 'ALT-001' },
          data: expect.objectContaining({ escalationLevel: 1 }),
        }),
      );
      expect(mockSse.emitToTenant).toHaveBeenCalledWith(1, 'alert:escalated', expect.any(Object));
    });
  });
});
