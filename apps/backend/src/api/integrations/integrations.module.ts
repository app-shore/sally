import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CredentialsService } from '../../services/credentials/credentials.service';
import { IntegrationManagerService } from '../../services/integration-manager/integration-manager.service';
import { IntegrationSchedulerService } from '../../services/integration-manager/integration-scheduler.service';
import { SamsaraHOSAdapter } from '../../services/adapters/hos/samsara-hos.adapter';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    IntegrationManagerService,
    IntegrationSchedulerService,
    CredentialsService,
    SamsaraHOSAdapter,
  ],
  exports: [IntegrationsService, IntegrationManagerService],
})
export class IntegrationsModule {}
