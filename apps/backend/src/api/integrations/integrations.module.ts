import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CredentialsService } from '../../services/credentials/credentials.service';
import { IntegrationManagerService } from '../../services/integration-manager/integration-manager.service';
import { IntegrationSchedulerService } from '../../services/integration-manager/integration-scheduler.service';
import { RetryModule } from '../../services/retry/retry.module';
import { AlertModule } from '../../services/alerts/alert.module';
import { SamsaraHOSAdapter } from '../../services/adapters/hos/samsara-hos.adapter';
import { McLeodTMSAdapter } from '../../services/adapters/tms/mcleod-tms.adapter';
import { Project44TMSAdapter } from '../../services/adapters/tms/project44-tms.adapter';
import { GasBuddyFuelAdapter } from '../../services/adapters/fuel/gasbuddy-fuel.adapter';
import { FuelFinderAdapter } from '../../services/adapters/fuel/fuelfinder-fuel.adapter';
import { OpenWeatherAdapter } from '../../services/adapters/weather/openweather.adapter';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot(), RetryModule, AlertModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    IntegrationManagerService,
    IntegrationSchedulerService,
    CredentialsService,
    // Adapters
    SamsaraHOSAdapter,
    McLeodTMSAdapter,
    Project44TMSAdapter,
    GasBuddyFuelAdapter,
    FuelFinderAdapter,
    OpenWeatherAdapter,
  ],
  exports: [IntegrationsService, IntegrationManagerService],
})
export class IntegrationsModule {}
