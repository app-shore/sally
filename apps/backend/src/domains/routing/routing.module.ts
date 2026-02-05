import { Module } from '@nestjs/common';
import { RoutePlanningModule } from './route-planning/route-planning.module';
import { OptimizationModule } from './optimization/optimization.module';
import { HOSComplianceModule } from './hos-compliance/hos-compliance.module';
import { PredictionModule } from './prediction/prediction.module';
import { MonitoringModule } from './monitoring/monitoring.module';

/**
 * RoutingModule is an aggregate module that combines all routing-related functionality.
 * This is the core business logic domain for SALLY.
 *
 * Subdomains:
 * - Route Planning: Complete route planning with TSP optimization
 * - Optimization: REST optimization, fuel stops, TSP solver
 * - HOS Compliance: Hours of Service rule validation
 * - Prediction: Drive demand predictions
 * - Monitoring: Dynamic route monitoring and updates
 */
@Module({
  imports: [
    RoutePlanningModule,
    OptimizationModule,
    HOSComplianceModule,
    PredictionModule,
    MonitoringModule,
  ],
  exports: [
    RoutePlanningModule,
    OptimizationModule,
    HOSComplianceModule,
    PredictionModule,
    MonitoringModule,
  ],
})
export class RoutingModule {}
