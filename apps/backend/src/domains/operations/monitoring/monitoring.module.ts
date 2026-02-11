import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { RouteMonitoringService } from './services/route-monitoring.service';
import { MonitoringChecksService } from './services/monitoring-checks.service';
import { RouteProgressTrackerService } from './services/route-progress-tracker.service';
import { RouteUpdateHandlerService } from './services/route-update-handler.service';
import { AlertsModule } from '../alerts/alerts.module';
import { IntegrationsModule } from '../../integrations/integrations.module';

@Module({
  imports: [AlertsModule, IntegrationsModule],
  controllers: [MonitoringController],
  providers: [
    RouteMonitoringService,
    MonitoringChecksService,
    RouteProgressTrackerService,
    RouteUpdateHandlerService,
  ],
  exports: [RouteMonitoringService],
})
export class MonitoringModule {}
