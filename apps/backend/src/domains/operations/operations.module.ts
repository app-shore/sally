import { Module } from '@nestjs/common';
import { AlertsModule } from './alerts/alerts.module';
import { InAppNotificationsModule } from './notifications/notifications.module';
import { CommandCenterModule } from './command-center/command-center.module';
import { MonitoringModule } from './monitoring/monitoring.module';

@Module({
  imports: [AlertsModule, InAppNotificationsModule, CommandCenterModule, MonitoringModule],
  exports: [AlertsModule, InAppNotificationsModule, CommandCenterModule, MonitoringModule],
})
export class OperationsModule {}
