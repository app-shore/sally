import { Module } from '@nestjs/common';
import { AlertsModule } from './alerts/alerts.module';
import { InAppNotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [AlertsModule, InAppNotificationsModule],
  exports: [AlertsModule, InAppNotificationsModule],
})
export class OperationsModule {}
