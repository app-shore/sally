import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { SyncService } from './sync.service';
import { TmsSyncService } from './tms-sync.service';
import { EldSyncService } from './eld-sync.service';
import { VehicleMatcher } from './matching/vehicle-matcher';
import { DriverMatcher } from './matching/driver-matcher';
import { VehicleMerger } from './merging/vehicle-merger';
import { DriverMerger } from './merging/driver-merger';
import { AutoSyncJob } from '../../../infrastructure/jobs/auto-sync.job';
import { CredentialsService } from '../credentials/credentials.service';
import { AdaptersModule } from '../adapters/adapters.module';

/**
 * SyncModule handles data synchronization from external systems.
 *
 * Note: Adapters are imported from AdaptersModule (shared with IntegrationsModule)
 * to avoid duplicate registration and circular dependency issues.
 */
@Module({
  imports: [PrismaModule, AdaptersModule],
  providers: [
    SyncService,
    TmsSyncService,
    EldSyncService,
    VehicleMatcher,
    DriverMatcher,
    VehicleMerger,
    DriverMerger,
    AutoSyncJob,
    CredentialsService,
  ],
  exports: [SyncService],
})
export class SyncModule {}
