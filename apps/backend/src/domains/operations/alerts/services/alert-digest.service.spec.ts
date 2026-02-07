import { Test, TestingModule } from '@nestjs/testing';
import { AlertDigestService } from './alert-digest.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { EmailService } from '../../../../infrastructure/notification/services/email.service';
import { AlertAnalyticsService } from './alert-analytics.service';

describe('AlertDigestService', () => {
  let service: AlertDigestService;

  const mockPrisma = {
    user: { findMany: jest.fn() },
    tenant: { findMany: jest.fn() },
    alert: { findMany: jest.fn(), count: jest.fn() },
  };
  const mockEmail = { sendEmail: jest.fn() };
  const mockAnalytics = {
    getResolutionRates: jest.fn().mockResolvedValue({ total: 10, resolved: 8, autoResolved: 1, escalated: 1, resolutionRate: 90, escalationRate: 10 }),
    getVolumeByCategory: jest.fn().mockResolvedValue([{ category: 'hos', count: 5 }]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertDigestService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmail },
        { provide: AlertAnalyticsService, useValue: mockAnalytics },
      ],
    }).compile();

    service = module.get<AlertDigestService>(AlertDigestService);
    jest.clearAllMocks();
  });

  describe('generateDailyDigest', () => {
    it('should generate digest for each tenant with dispatchers', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([{ id: 1, companyName: 'Test Corp' }]);
      mockPrisma.user.findMany.mockResolvedValue([
        { email: 'dispatcher@test.com', firstName: 'John' },
      ]);
      mockPrisma.alert.findMany.mockResolvedValue([]);
      mockPrisma.alert.count.mockResolvedValue(3);

      await service.generateDailyDigest();

      expect(mockEmail.sendEmail).toHaveBeenCalled();
    });
  });
});
