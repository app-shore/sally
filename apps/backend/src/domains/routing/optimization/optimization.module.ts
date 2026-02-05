import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { HOSComplianceModule } from '../hos-compliance/hos-compliance.module';
import { OptimizationController } from './controllers/optimization.controller';
import { RestOptimizationService } from './services/rest-optimization.service';
import { TSPOptimizerService } from './services/tsp-optimizer.service';
import { FuelStopOptimizerService } from './services/fuel-stop-optimizer.service';
import { RestStopFinderService } from './services/rest-stop-finder.service';

@Module({
  imports: [PrismaModule, HOSComplianceModule],
  controllers: [OptimizationController],
  providers: [
    RestOptimizationService,
    {
      provide: TSPOptimizerService,
      useFactory: () => {
        // Initialize with empty distance matrix
        // In production, this would be loaded from a service or database
        return new TSPOptimizerService(new Map<string, number>());
      },
    },
    FuelStopOptimizerService,
    RestStopFinderService,
  ],
  exports: [
    RestOptimizationService,
    TSPOptimizerService,
    FuelStopOptimizerService,
    RestStopFinderService,
  ],
})
export class OptimizationModule {}
