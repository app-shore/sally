import { Test, TestingModule } from '@nestjs/testing';
import { NotificationDeliveryService } from './delivery.service';
import { InAppNotificationService } from './notifications.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SseService } from '../../../infrastructure/sse/sse.service';
import { PushService } from '../../../infrastructure/push/push.service';
import { SmsService } from '../../../infrastructure/sms/sms.service';
import { EmailService } from '../../../infrastructure/notification/services/email.service';

describe('NotificationDeliveryService', () => {
  let service: NotificationDeliveryService;

  const mockInApp = { create: jest.fn() };
  const mockPrisma = { userNotificationPreferences: { findUnique: jest.fn() } };
  const mockSse = { emitToUser: jest.fn() };
  const mockPush = { sendPushToUser: jest.fn() };
  const mockSms = { sendSms: jest.fn(), getIsConfigured: jest.fn().mockReturnValue(false) };
  const mockEmail = { sendEmail: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDeliveryService,
        { provide: InAppNotificationService, useValue: mockInApp },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SseService, useValue: mockSse },
        { provide: PushService, useValue: mockPush },
        { provide: SmsService, useValue: mockSms },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get<NotificationDeliveryService>(NotificationDeliveryService);
    jest.clearAllMocks();
  });

  describe('deliver', () => {
    it('should always deliver in-app and emit SSE', async () => {
      mockInApp.create.mockResolvedValue({ notificationId: 'ntf-1' });

      await service.deliver({
        recipientUserId: 'user-1',
        recipientDbId: 100,
        tenantId: 1,
        type: 'ROUTE_PLANNED',
        category: 'OPERATIONS',
        title: 'Route Planned',
        message: 'Your route has been planned',
        channels: ['in_app'],
      });

      expect(mockInApp.create).toHaveBeenCalled();
      expect(mockSse.emitToUser).toHaveBeenCalled();
    });

    it('should deliver to push when requested', async () => {
      mockInApp.create.mockResolvedValue({ notificationId: 'ntf-2' });
      mockPush.sendPushToUser.mockResolvedValue(undefined);

      await service.deliver({
        recipientUserId: 'user-1',
        recipientDbId: 100,
        tenantId: 1,
        type: 'ROUTE_PLANNED',
        category: 'OPERATIONS',
        title: 'Route Planned',
        message: 'Your route has been planned',
        channels: ['in_app', 'push'],
      });

      expect(mockPush.sendPushToUser).toHaveBeenCalledWith(100, expect.objectContaining({
        title: 'Route Planned',
        body: 'Your route has been planned',
      }));
    });

    it('should deliver SMS when phone is provided', async () => {
      mockSms.sendSms.mockResolvedValue(true);

      await service.deliver({
        recipientUserId: 'user-1',
        recipientDbId: 100,
        tenantId: 1,
        type: 'ROUTE_PLANNED',
        category: 'OPERATIONS',
        title: 'Route Planned',
        message: 'Your route has been planned',
        channels: ['sms'],
        recipientPhone: '+15551234567',
      });

      expect(mockSms.sendSms).toHaveBeenCalledWith(
        '+15551234567',
        expect.stringContaining('Route Planned'),
      );
    });
  });
});
