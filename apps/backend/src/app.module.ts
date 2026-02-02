import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { TenantGuard } from './auth/guards/tenant.guard';
import { RolesGuard } from './auth/guards/roles.guard';

// Services
import { HOSRuleEngineService } from './services/hos-rule-engine/hos-rule-engine.service';
import { RestOptimizationService } from './services/rest-optimization/rest-optimization.service';
import { PredictionEngineService } from './services/prediction-engine/prediction-engine.service';
import { RestStopFinderService } from './services/rest-stop-finder/rest-stop-finder.service';
import { FuelStopOptimizerService } from './services/fuel-stop-optimizer/fuel-stop-optimizer.service';
import { RoutePlanningEngineService } from './services/route-planning-engine/route-planning-engine.service';
import { DynamicUpdateHandlerService } from './services/dynamic-update-handler/dynamic-update-handler.service';
import { DriversActivationService } from './api/drivers/drivers-activation.service';

// Controllers
import { HealthController } from './health/health.controller';
import { HOSRulesController } from './api/hos-rules/hos-rules.controller';
import { OptimizationController } from './api/optimization/optimization.controller';
import { PredictionController } from './api/prediction/prediction.controller';
import { RoutePlanningController } from './api/route-planning/route-planning.controller';
import { DriversController } from './api/drivers/drivers.controller';
import { VehiclesController } from './api/vehicles/vehicles.controller';
import { LoadsController } from './api/loads/loads.controller';
import { ScenariosController } from './api/scenarios/scenarios.controller';
import { ExternalMockController } from './api/external-mock/external-mock.controller';
import { AlertsController } from './api/alerts/alerts.controller';
import { SessionController } from './api/session/session.controller';
import { IntegrationsModule } from './api/integrations/integrations.module';
import { PreferencesModule } from './api/preferences/preferences.module';
import { TenantsModule } from './api/tenants/tenants.module';
import { UserInvitationsModule } from './api/user-invitations/user-invitations.module';
import { UsersModule } from './api/users/users.module';
import { ServicesModule } from './common/services/services.module';
import { OnboardingModule } from './api/onboarding/onboarding.module';
import { FeatureFlagsModule } from './api/feature-flags/feature-flags.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    PrismaModule,
    DatabaseModule,
    AuthModule,
    ServicesModule,
    IntegrationsModule,
    PreferencesModule,
    TenantsModule,
    UserInvitationsModule,
    UsersModule,
    OnboardingModule,
    FeatureFlagsModule,
  ],
  providers: [
    // Global guards (applied to all routes by default)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Services
    HOSRuleEngineService,
    RestOptimizationService,
    PredictionEngineService,
    RestStopFinderService,
    FuelStopOptimizerService,
    RoutePlanningEngineService,
    DynamicUpdateHandlerService,
    DriversActivationService,
  ],
  controllers: [
    HealthController,
    HOSRulesController,
    OptimizationController,
    PredictionController,
    RoutePlanningController,
    DriversController,
    VehiclesController,
    LoadsController,
    ScenariosController,
    ExternalMockController,
    AlertsController,
    SessionController,
  ],
})
export class AppModule {}
