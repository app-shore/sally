import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { InAppNotificationService } from './notifications.service';
import { NotificationDeliveryService } from './delivery.service';
import { ChannelResolutionService } from './channel-resolution.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [InAppNotificationService, NotificationDeliveryService, ChannelResolutionService],
  exports: [InAppNotificationService, NotificationDeliveryService, ChannelResolutionService],
})
export class InAppNotificationsModule {}
