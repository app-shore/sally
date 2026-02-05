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
import { Project44TMSAdapter } from '../adapters/tms/project44-tms.adapter';
import { McLeodTMSAdapter } from '../adapters/tms/mcleod-tms.adapter';
import { SamsaraELDAdapter } from '../adapters/eld/samsara-eld.adapter';

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
    // Adapter Factory
    AdapterFactoryService,
    // TMS Adapters
    Project44TMSAdapter,
    McLeodTMSAdapter,
    // ELD Adapters
    SamsaraELDAdapter,
  ],
  exports: [SyncService],
})
export class SyncModule {}
