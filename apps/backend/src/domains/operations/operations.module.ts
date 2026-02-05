import { Module } from '@nestjs/common';
import { AlertsModule } from './alerts/alerts.module';

/**
 * OperationsModule aggregates all operations-related modules:
 * - Alerts: Alert management and notifications
 */
@Module({
  imports: [AlertsModule],
  exports: [AlertsModule],
})
export class OperationsModule {}
