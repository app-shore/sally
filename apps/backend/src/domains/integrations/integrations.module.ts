import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { SyncModule } from './sync/sync.module';
import { CredentialsService } from './credentials/credentials.service';
import { IntegrationManagerService } from './services/integration-manager.service';
import { IntegrationSchedulerService } from './services/integration-scheduler.service';
import { RetryModule } from '../../infrastructure/retry/retry.module';
import { AlertsModule } from '../operations/alerts/alerts.module';
import { McLeodTMSAdapter } from './adapters/tms/mcleod-tms.adapter';
import { Project44TMSAdapter } from './adapters/tms/project44-tms.adapter';
import { SamsaraELDAdapter } from './adapters/eld/samsara-eld.adapter';
import { GasBuddyFuelAdapter } from './adapters/fuel/gasbuddy-fuel.adapter';
import { OpenWeatherAdapter } from './adapters/weather/openweather.adapter';

@Module({
  imports: [
    PrismaModule,
    SyncModule,
    ScheduleModule.forRoot(),
    RetryModule,
    AlertsModule,
  ],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    IntegrationManagerService,
    IntegrationSchedulerService,
    CredentialsService,
    // Adapters (registered here to avoid duplicate DI in SyncModule)
    SamsaraELDAdapter,
    McLeodTMSAdapter,
    Project44TMSAdapter,
    GasBuddyFuelAdapter,
    OpenWeatherAdapter,
  ],
  exports: [IntegrationsService, IntegrationManagerService],
})
export class IntegrationsModule {}
