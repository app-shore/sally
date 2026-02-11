import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { SyncService } from './sync.service';
import { TmsSyncService } from './tms-sync.service';
import { EldSyncService } from './eld-sync.service';
import { VehicleMatcher } from './matching/vehicle-matcher';
import { DriverMatcher } from './matching/driver-matcher';
import { VehicleMerger } from './merging/vehicle-merger';
import { DriverMerger } from './merging/driver-merger';
import { DriversSyncJob } from '../../../infrastructure/jobs/drivers-sync.job';
import { VehiclesSyncJob } from '../../../infrastructure/jobs/vehicles-sync.job';
import { LoadsSyncJob } from '../../../infrastructure/jobs/loads-sync.job';
import { TelematicsSyncJob } from '../../../infrastructure/jobs/telematics-sync.job';
import { SyncLogCleanupJob } from '../../../infrastructure/jobs/sync-log-cleanup.job';
import { FuelPriceSyncJob } from '../../../infrastructure/jobs/fuel-price-sync.job';
import { WeatherSyncJob } from '../../../infrastructure/jobs/weather-sync.job';
import { CredentialsService } from '../credentials/credentials.service';
import { AdaptersModule } from '../adapters/adapters.module';

/**
 * SyncModule handles data synchronization from external systems.
 *
 * Jobs are organized by data type (not integration source):
 * - DriversSyncJob: TMS creates → ELD enriches (every 15 min)
 * - VehiclesSyncJob: TMS creates → ELD enriches (every 15 min)
 * - LoadsSyncJob: TMS only (every 15 min)
 * - TelematicsSyncJob: ELD vehicle locations (every 2 min)
 *
 * Note: HosSyncJob is registered in IntegrationsModule (depends on IntegrationManagerService)
 * Note: Adapters are imported from AdaptersModule (shared with IntegrationsModule)
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
    DriversSyncJob,
    VehiclesSyncJob,
    LoadsSyncJob,
    TelematicsSyncJob,
    SyncLogCleanupJob,
    FuelPriceSyncJob,
    WeatherSyncJob,
    CredentialsService,
  ],
  exports: [SyncService],
})
export class SyncModule {}
