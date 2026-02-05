import { Module } from '@nestjs/common';
import { RoutePlanningController } from './controllers/route-planning.controller';
import { RoutePlanningEngineService } from './services/route-planning-engine.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { HOSComplianceModule } from '../hos-compliance/hos-compliance.module';
import { PredictionModule } from '../prediction/prediction.module';
import { OptimizationModule } from '../optimization/optimization.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

/**
 * RoutePlanningModule handles complete route planning with TSP optimization,
 * HOS compliance checking, and dynamic updates.
 */
@Module({
  imports: [
    PrismaModule,
    HOSComplianceModule,
    PredictionModule,
    OptimizationModule,
    MonitoringModule,
  ],
  controllers: [RoutePlanningController],
  providers: [RoutePlanningEngineService],
  exports: [RoutePlanningEngineService],
})
export class RoutePlanningModule {}
