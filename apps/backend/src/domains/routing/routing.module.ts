import { Module } from '@nestjs/common';
import { RoutePlanningModule } from './route-planning/route-planning.module';
import { HOSComplianceModule } from './hos-compliance/hos-compliance.module';
import { RoutingProviderModule } from './providers/routing/routing-provider.module';
import { WeatherProviderModule } from './providers/weather/weather-provider.module';
import { FuelProviderModule } from './providers/fuel/fuel-provider.module';

@Module({
  imports: [
    RoutePlanningModule,
    HOSComplianceModule,
    RoutingProviderModule,
    WeatherProviderModule,
    FuelProviderModule,
  ],
  exports: [RoutePlanningModule, HOSComplianceModule],
})
export class RoutingModule {}
