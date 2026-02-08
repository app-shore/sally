import { Module } from '@nestjs/common';
import { AlertsModule } from './alerts/alerts.module';
import { InAppNotificationsModule } from './notifications/notifications.module';
import { CommandCenterModule } from './command-center/command-center.module';

@Module({
  imports: [AlertsModule, InAppNotificationsModule, CommandCenterModule],
  exports: [AlertsModule, InAppNotificationsModule, CommandCenterModule],
})
export class OperationsModule {}
