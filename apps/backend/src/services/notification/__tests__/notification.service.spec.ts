import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../notification.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from '../../../common/services/email.service';
import { NotificationType, NotificationStatus } from '@prisma/client';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: PrismaService;
  let emailService: EmailService;

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'TENANT_BASE_URL') return 'sally.appshore.in';
      if (key === 'USE_TENANT_SUBDOMAINS') return true;
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAndSendNotification', () => {
    it('should create notification, send email, and update status to SENT', async () => {
      const mockNotification = {
        id: 1,
        notificationId: 'notif_123',
        type: NotificationType.TENANT_REGISTRATION_CONFIRMATION,
        recipient: 'test@example.com',
        status: NotificationStatus.PENDING,
        tenantId: 1,
        metadata: { companyName: 'Test Co' },
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue({
        ...mockNotification,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      // Access private method via reflection for testing
      const result = await (service as any).createAndSendNotification(
        NotificationType.TENANT_REGISTRATION_CONFIRMATION,
        'test@example.com',
        { companyName: 'Test Co', tenantId: 1 },
        async () => {
          await emailService.sendEmail({
            to: 'test@example.com',
            subject: 'Test',
            html: '<p>Test</p>',
          });
        },
      );

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.TENANT_REGISTRATION_CONFIRMATION,
          recipient: 'test@example.com',
          status: NotificationStatus.PENDING,
          channel: 'EMAIL',
        }),
      });

      expect(mockEmailService.sendEmail).toHaveBeenCalled();
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotification.id },
        data: expect.objectContaining({
          status: NotificationStatus.SENT,
          sentAt: expect.any(Date),
        }),
      });

      expect(result.status).toBe(NotificationStatus.SENT);
    });

    it('should mark notification as FAILED if email sending fails', async () => {
      const mockNotification = {
        id: 1,
        notificationId: 'notif_123',
        type: NotificationType.TENANT_REGISTRATION_CONFIRMATION,
        recipient: 'test@example.com',
        status: NotificationStatus.PENDING,
        tenantId: 1,
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue({
        ...mockNotification,
        status: NotificationStatus.FAILED,
        errorMessage: 'Email service error',
      });
      mockEmailService.sendEmail.mockRejectedValue(
        new Error('Email service error'),
      );

      const result = await (service as any).createAndSendNotification(
        NotificationType.TENANT_REGISTRATION_CONFIRMATION,
        'test@example.com',
        { companyName: 'Test Co', tenantId: 1 },
        async () => {
          await emailService.sendEmail({
            to: 'test@example.com',
            subject: 'Test',
            html: '<p>Test</p>',
          });
        },
      );

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotification.id },
        data: expect.objectContaining({
          status: NotificationStatus.FAILED,
          errorMessage: 'Email service error',
        }),
      });

      expect(result.status).toBe(NotificationStatus.FAILED);
    });
  });
});
