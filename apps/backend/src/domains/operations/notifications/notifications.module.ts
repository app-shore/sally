import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { InAppNotificationService } from './notifications.service';
import { NotificationDeliveryService } from './delivery.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [InAppNotificationService, NotificationDeliveryService],
  exports: [InAppNotificationService, NotificationDeliveryService],
})
export class InAppNotificationsModule {}
