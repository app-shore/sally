import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { SyncModule } from './sync/sync.module';
import { CredentialsService } from './credentials/credentials.service';
import { IntegrationManagerService } from './services/integration-manager.service';
import { HosSyncJob } from '../../infrastructure/jobs/hos-sync.job';
import { RetryModule } from '../../infrastructure/retry/retry.module';
import { AlertsModule } from '../operations/alerts/alerts.module';
import { AdaptersModule } from './adapters/adapters.module';

/**
 * IntegrationsModule handles external system integrations
 *
 * HosSyncJob is registered here (not SyncModule) because it depends on
 * IntegrationManagerService which lives in this module.
 *
 * Uses AdaptersModule for adapter access (avoiding circular deps with SyncModule)
 * Note: ScheduleModule.forRoot() is registered in AppModule (root)
 */
@Module({
  imports: [
    PrismaModule,
    AdaptersModule,
    SyncModule,
    RetryModule,
    AlertsModule,
  ],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    IntegrationManagerService,
    CredentialsService,
    HosSyncJob,
  ],
  exports: [IntegrationsService, IntegrationManagerService],
})
export class IntegrationsModule {}
