import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertService } from './services/alert.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { NotificationModule } from '../../../infrastructure/notification/notification.module';

/**
 * AlertsModule handles alert management and notifications
 */
@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [AlertsController],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertsModule {}
