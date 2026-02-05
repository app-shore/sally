import { Module } from '@nestjs/common';
import { DriversController } from './controllers/drivers.controller';
import { DriversService } from './services/drivers.service';
import { DriversActivationService } from './services/drivers-activation.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { IntegrationsModule } from '../../integrations/integrations.module';

/**
 * DriversModule encapsulates all driver-related functionality.
 * Part of the Fleet domain.
 */
@Module({
  imports: [PrismaModule, IntegrationsModule],
  controllers: [DriversController],
  providers: [DriversService, DriversActivationService],
  exports: [DriversService, DriversActivationService],
})
export class DriversModule {}
