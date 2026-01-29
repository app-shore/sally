import { Controller, Get, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../config/configuration';

@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly configService: ConfigService<Configuration>) {}

  @Get('health')
  healthCheck() {
    return {
      status: 'healthy',
      environment: this.configService.get('environment'),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
