import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import configuration from './config/configuration';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { TenantGuard } from './auth/guards/tenant.guard';
import { RolesGuard } from './auth/guards/roles.guard';

// Domain Modules
import { FleetModule } from './domains/fleet/fleet.module';

import { PlatformModule } from './domains/platform/platform.module';
import { IntegrationsModule } from './domains/integrations/integrations.module';
import { OperationsModule } from './domains/operations/operations.module';
import { RoutingModule } from './domains/routing/routing.module';


// Controllers (to be migrated)
import { HealthController } from './health/health.controller';


// Infrastructure Modules
import { CacheModule } from './infrastructure/cache/cache.module';
import { SharedModule } from './shared/shared.module';
import { NotificationModule } from './infrastructure/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env.local',
    }),
    SharedModule,
    CacheModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    NotificationModule,

    // Domain Modules
    FleetModule,

    PlatformModule,
    IntegrationsModule,
    OperationsModule,
    RoutingModule,
  ],
  providers: [
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
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
  ],
  controllers: [
    // Controllers (to be migrated to domains)
    HealthController,
  ],
})
export class AppModule {}
