import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { HOSComplianceModule } from '../hos-compliance/hos-compliance.module';
import { RoutingProviderModule } from '../providers/routing/routing-provider.module';
import { WeatherProviderModule } from '../providers/weather/weather-provider.module';
import { FuelProviderModule } from '../providers/fuel/fuel-provider.module';
import { RoutePlanningEngineService } from './services/route-planning-engine.service';
import { RoutePlanPersistenceService } from './services/route-plan-persistence.service';
import { RoutePlanningController } from './controllers/route-planning.controller';

@Module({
  imports: [
    PrismaModule,
    HOSComplianceModule,
    RoutingProviderModule,
    WeatherProviderModule,
    FuelProviderModule,
    ConfigModule,
  ],
  controllers: [RoutePlanningController],
  providers: [RoutePlanningEngineService, RoutePlanPersistenceService],
  exports: [RoutePlanningEngineService, RoutePlanPersistenceService],
})
export class RoutePlanningModule {}
