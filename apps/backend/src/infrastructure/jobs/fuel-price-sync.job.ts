import { Injectable, Logger } from '@nestjs/common';
// import { Cron } from '@nestjs/schedule';

@Injectable()
export class FuelPriceSyncJob {
  private readonly logger = new Logger(FuelPriceSyncJob.name);

  // Phase 3: Uncomment when fuel price integration is implemented
  // @Cron('0 0 * * * *')
  async syncFuelPrices() {
    this.logger.log('Fuel price sync not yet implemented (Phase 3)');
  }
}
