import { Test, TestingModule } from '@nestjs/testing';
import { AlertService, AlertSeverity } from './alert.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

describe('AlertService', () => {
  let service: AlertService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should format alert email correctly', async () => {
    const alert = {
      title: 'Integration Failing',
      message: 'HOS sync has failed 3 times',
      severity: AlertSeverity.ERROR,
      context: { tenantId: 1, failureCount: 3 },
    };

    // We can't easily test email sending, so we test the format method
    const html = (service as any).formatAlertEmail(alert);

    expect(html).toContain('Integration Failing');
    expect(html).toContain('HOS sync has failed 3 times');
    expect(html).toContain('ERROR');
  });
});
