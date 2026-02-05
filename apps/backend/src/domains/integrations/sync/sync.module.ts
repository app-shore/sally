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
import { AdapterFactoryService } from '../adapters/adapter-factory.service';

/**
 * SyncModule handles data synchronization from external systems.
 *
 * Note: Adapters are registered in IntegrationsModule (parent module)
 * to avoid duplicate registration and DI conflicts.
 */
@Module({
  imports: [PrismaModule],
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
    // Adapter Factory (uses adapters from parent IntegrationsModule)
    AdapterFactoryService,
  ],
  exports: [SyncService],
})
export class SyncModule {}
