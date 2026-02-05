import { Module } from '@nestjs/common';
import { LoadsController } from './controllers/loads.controller';
import { LoadsService } from './services/loads.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

/**
 * LoadsModule encapsulates all load-related functionality.
 * Part of the Fleet domain.
 */
@Module({
  imports: [PrismaModule],
  controllers: [LoadsController],
  providers: [LoadsService],
  exports: [LoadsService],
})
export class LoadsModule {}
