import { Module } from '@nestjs/common';
import { SamsaraELDAdapter } from './eld/samsara-eld.adapter';
import { McLeodTMSAdapter } from './tms/mcleod-tms.adapter';
import { Project44TMSAdapter } from './tms/project44-tms.adapter';
import { GasBuddyFuelAdapter } from './fuel/gasbuddy-fuel.adapter';
import { OpenWeatherAdapter } from './weather/openweather.adapter';
import { AdapterFactoryService } from './adapter-factory.service';

/**
 * AdaptersModule provides all external system adapters
 *
 * This module exists to avoid circular dependencies between
 * IntegrationsModule and SyncModule. Both can import this module
 * to access adapters without creating a cycle.
 */
@Module({
  providers: [
    // Adapters
    SamsaraELDAdapter,
    McLeodTMSAdapter,
    Project44TMSAdapter,
    GasBuddyFuelAdapter,
    OpenWeatherAdapter,
    // Factory
    AdapterFactoryService,
  ],
  exports: [
    // Export adapters for use by other modules
    SamsaraELDAdapter,
    McLeodTMSAdapter,
    Project44TMSAdapter,
    GasBuddyFuelAdapter,
    OpenWeatherAdapter,
    // Export factory
    AdapterFactoryService,
  ],
})
export class AdaptersModule {}
