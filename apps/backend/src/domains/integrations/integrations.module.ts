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
import { AdaptersModule } from './adapters/adapters.module';

/**
 * IntegrationsModule handles external system integrations
 *
 * Uses AdaptersModule for adapter access (avoiding circular deps with SyncModule)
 */
@Module({
  imports: [
    PrismaModule,
    AdaptersModule, // ← Import adapters from dedicated module
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
  ],
  exports: [IntegrationsService, IntegrationManagerService],
})
export class IntegrationsModule {}
