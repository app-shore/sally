import { Injectable, Logger } from '@nestjs/common';
// import { Cron } from '@nestjs/schedule';

@Injectable()
export class WeatherSyncJob {
  private readonly logger = new Logger(WeatherSyncJob.name);

  // Phase 3: Uncomment when weather integration is implemented
  // @Cron('0 */30 * * * *')
  async syncWeather() {
    this.logger.log('Weather sync not yet implemented (Phase 3)');
  }
}
