# Backend Domain Architecture Review & Refactoring Plan

**Date:** February 5, 2026
**Author:** Architecture Review
**Status:** Design Phase
**Reading Time:** 25 minutes

---

## Executive Summary

This document presents a comprehensive architecture review of the SALLY NestJS backend with a focus on:
1. **Domain-Driven Design** reorganization for enterprise scalability
2. **Code quality improvements** (eliminating duplication, unused code)
3. **NestJS best practices** compliance
4. **Clean break refactoring** with zero API breaking changes

### Key Findings

**Critical Issues:**
- ✅ **Duplicate Prisma Services**: Two different implementations (`database/` and `prisma/`)
- ✅ **Missing Modules**: Controllers (drivers, vehicles, loads) directly in AppModule without feature modules
- ✅ **Code Duplication**: Tenant validation repeated 31 times across 8 files
- ✅ **Poor Domain Separation**: Business logic mixed with infrastructure concerns
- ✅ **Empty Files**: `app.controller.ts` and `app.service.ts` are effectively empty

**Positive Findings:**
- ✅ Good use of DTOs with class-validator in most modules
- ✅ Proper authentication guards (JWT, Tenant, Roles)
- ✅ Swagger/OpenAPI documentation
- ✅ Good test coverage structure

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Proposed Domain Structure](#2-proposed-domain-structure)
3. [Code Quality Issues](#3-code-quality-issues)
4. [NestJS Best Practices Review](#4-nestjs-best-practices-review)
5. [Migration Plan](#5-migration-plan)
6. [File Movement Mappings](#6-file-movement-mappings)
7. [Shared Abstractions Design](#7-shared-abstractions-design)
8. [Implementation Checklist](#8-implementation-checklist)
9. [Validation Strategy](#9-validation-strategy)

---

## 1. Current Architecture Analysis

### 1.1 Directory Structure (Current)

```
src/
├── api/                    # Mixed concerns (20 folders)
│   ├── alerts/            # Operations concern
│   ├── drivers/           # Fleet domain (NO MODULE)
│   ├── vehicles/          # Fleet domain (NO MODULE)
│   ├── loads/             # Fleet domain (NO MODULE)
│   ├── route-planning/    # Routing domain (NO MODULE)
│   ├── optimization/      # Routing domain (NO MODULE)
│   ├── prediction/        # Routing domain (NO MODULE)
│   ├── hos-rules/         # Routing domain (NO MODULE)
│   ├── scenarios/         # Testing (NO MODULE)
│   ├── tenants/           # Platform domain (HAS MODULE)
│   ├── users/             # Platform domain (HAS MODULE)
│   ├── user-invitations/  # Platform domain (HAS MODULE)
│   ├── preferences/       # Platform domain (HAS MODULE)
│   ├── integrations/      # Platform domain (HAS MODULE)
│   ├── feature-flags/     # Platform domain (HAS MODULE)
│   ├── onboarding/        # Platform domain (HAS MODULE)
│   ├── external-mock/     # Testing (HAS MODULE)
│   ├── mock-external/     # Testing (HAS MODULE) - DUPLICATE?
│   └── session/           # Auth concern (NO MODULE)
│
├── services/              # Mixed business logic + infrastructure
│   ├── hos-rule-engine/          # Routing domain logic
│   ├── rest-optimization/        # Routing domain logic
│   ├── route-planning-engine/    # Routing domain logic
│   ├── prediction-engine/        # Routing domain logic
│   ├── tsp-optimizer/            # Routing domain logic
│   ├── fuel-stop-optimizer/      # Routing domain logic
│   ├── rest-stop-finder/         # Routing domain logic
│   ├── dynamic-update-handler/   # Operations domain logic
│   ├── alerts/                   # Operations domain (HAS MODULE)
│   ├── sync/                     # Infrastructure (HAS MODULE)
│   ├── notification/             # Infrastructure (HAS MODULE)
│   ├── retry/                    # Infrastructure (HAS MODULE)
│   ├── integration-manager/      # Should be in integrations/
│   ├── credentials/              # Should be in integrations/
│   └── adapters/                 # Should be in integrations/
│
├── auth/                  # Auth module (GOOD)
├── database/              # Prisma service (DUPLICATE #1)
├── prisma/                # Prisma service (DUPLICATE #2)
├── cache/                 # Infrastructure
├── common/                # Shared utilities
├── config/                # Configuration
├── health/                # Health check
├── jobs/                  # Background jobs
├── models/                # Schemas (unused?)
├── utils/                 # Utilities
├── app.module.ts          # Root module
├── app.controller.ts      # EMPTY
├── app.service.ts         # EMPTY
└── main.ts                # Bootstrap
```

### 1.2 Dependency Analysis

**AppModule Imports (11 modules):**
```typescript
ConfigModule, CacheModule, ScheduleModule, PrismaModule, DatabaseModule,
AuthModule, ServicesModule, SyncModule, IntegrationsModule, PreferencesModule,
TenantsModule, UserInvitationsModule, UsersModule, OnboardingModule,
FeatureFlagsModule, MockExternalModule, NotificationModule
```

**AppModule Providers (9 services - SHOULD BE IN MODULES):**
```typescript
HOSRuleEngineService, RestOptimizationService, PredictionEngineService,
RestStopFinderService, FuelStopOptimizerService, RoutePlanningEngineService,
DynamicUpdateHandlerService, DriversActivationService
```

**AppModule Controllers (10 controllers - SHOULD BE IN MODULES):**
```typescript
HealthController, HOSRulesController, OptimizationController,
PredictionController, RoutePlanningController, DriversController,
VehiclesController, LoadsController, ScenariosController,
ExternalMockController, AlertsController, SessionController
```

### 1.3 Issues Identified

#### Critical Issues

1. **Duplicate Prisma Services**
   - `src/database/prisma.service.ts` (used by controllers via DatabaseModule)
   - `src/prisma/prisma.service.ts` (used by services via PrismaModule)
   - **Different implementations**: database/ uses Logger, prisma/ uses pg.Pool
   - **Risk**: Potential connection pool exhaustion, inconsistent behavior

2. **Missing Feature Modules**
   - 12 controllers declared directly in AppModule instead of feature modules
   - Violates NestJS modular architecture principles
   - Makes testing, scaling, and maintenance difficult

3. **Poor Separation of Concerns**
   - Business domain logic mixed with infrastructure in `/services`
   - No clear domain boundaries
   - Difficult to scale teams or extract microservices

#### Major Issues

4. **Code Duplication (Repeated 31 times)**
   ```typescript
   // This pattern appears in 8 files:
   const tenant = await this.prisma.tenant.findUnique({
     where: { tenantId: user.tenantId },
   });
   ```

5. **validateNotExternal Duplication**
   - Identical method in `drivers.controller.ts` and `vehicles.controller.ts`
   - ~30 lines of duplicated code

6. **Error Handling Duplication**
   - 65 instances of `throw new HttpException` across 11 controller files
   - No centralized exception handling strategy

#### Minor Issues

7. **Empty Files**
   - `app.controller.ts` - only import statement
   - `app.service.ts` - only import statement
   - Should be deleted

8. **Potential Duplicate Mock APIs**
   - `api/external-mock/` (route: `/external`)
   - `api/mock-external/` (route: `/mock/tms`)
   - Need to verify if both are needed

---

## 2. Proposed Domain Structure

### 2.1 Target Architecture (Domain-Driven Design)

```
src/
├── domains/                           # Business Domains
│   │
│   ├── fleet/                        # Fleet Management Domain
│   │   ├── drivers/
│   │   │   ├── controllers/
│   │   │   │   └── drivers.controller.ts       # @Controller('drivers')
│   │   │   ├── services/
│   │   │   │   ├── drivers.service.ts
│   │   │   │   └── drivers-activation.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-driver.dto.ts
│   │   │   │   └── update-driver.dto.ts
│   │   │   ├── entities/
│   │   │   │   └── driver.entity.ts
│   │   │   ├── drivers.module.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── vehicles/
│   │   │   ├── controllers/
│   │   │   │   └── vehicles.controller.ts      # @Controller('vehicles')
│   │   │   ├── services/
│   │   │   │   └── vehicles.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-vehicle.dto.ts
│   │   │   │   └── update-vehicle.dto.ts
│   │   │   ├── entities/
│   │   │   │   └── vehicle.entity.ts
│   │   │   ├── vehicles.module.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── loads/
│   │   │   ├── controllers/
│   │   │   │   └── loads.controller.ts         # @Controller('loads')
│   │   │   ├── services/
│   │   │   │   └── loads.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-load.dto.ts
│   │   │   │   └── load-stop.dto.ts
│   │   │   ├── entities/
│   │   │   │   └── load.entity.ts
│   │   │   ├── loads.module.ts
│   │   │   └── __tests__/
│   │   │
│   │   └── fleet.module.ts                    # Aggregate module
│   │
│   ├── routing/                              # Route Planning Domain
│   │   ├── route-planning/
│   │   │   ├── controllers/
│   │   │   │   └── route-planning.controller.ts # @Controller('route-planning')
│   │   │   ├── services/
│   │   │   │   └── route-planning-engine.service.ts
│   │   │   ├── dto/
│   │   │   ├── route-planning.module.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── optimization/
│   │   │   ├── controllers/
│   │   │   │   └── optimization.controller.ts  # @Controller('optimization')
│   │   │   ├── services/
│   │   │   │   ├── rest-optimization.service.ts
│   │   │   │   ├── tsp-optimizer.service.ts
│   │   │   │   ├── fuel-stop-optimizer.service.ts
│   │   │   │   └── rest-stop-finder.service.ts
│   │   │   ├── dto/
│   │   │   ├── optimization.module.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── hos-compliance/
│   │   │   ├── controllers/
│   │   │   │   └── hos-rules.controller.ts     # @Controller('hos-rules')
│   │   │   ├── services/
│   │   │   │   └── hos-rule-engine.service.ts
│   │   │   ├── dto/
│   │   │   ├── hos-compliance.module.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── prediction/
│   │   │   ├── controllers/
│   │   │   │   └── prediction.controller.ts    # @Controller('prediction')
│   │   │   ├── services/
│   │   │   │   └── prediction-engine.service.ts
│   │   │   ├── dto/
│   │   │   ├── prediction.module.ts
│   │   │   └── __tests__/
│   │   │
│   │   └── routing.module.ts                  # Aggregate module
│   │
│   ├── operations/                           # Operations Management Domain
│   │   ├── alerts/
│   │   │   ├── controllers/
│   │   │   │   └── alerts.controller.ts        # @Controller('alerts')
│   │   │   ├── services/
│   │   │   │   └── alert.service.ts
│   │   │   ├── dto/
│   │   │   ├── alerts.module.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── monitoring/
│   │   │   ├── services/
│   │   │   │   └── dynamic-update-handler.service.ts
│   │   │   ├── monitoring.module.ts
│   │   │   └── __tests__/
│   │   │
│   │   └── operations.module.ts              # Aggregate module
│   │
│   └── platform/                             # Platform/Tenant Management Domain
│       ├── tenants/
│       │   ├── controllers/
│       │   │   └── tenants.controller.ts       # @Controller('tenants')
│       │   ├── services/
│       │   │   └── tenants.service.ts
│       │   ├── dto/
│       │   ├── tenants.module.ts
│       │   └── __tests__/
│       │
│       ├── users/
│       │   ├── controllers/
│       │   │   └── users.controller.ts         # @Controller('users')
│       │   ├── services/
│       │   │   └── users.service.ts
│       │   ├── dto/
│       │   ├── users.module.ts
│       │   └── __tests__/
│       │
│       ├── user-invitations/
│       │   ├── controllers/
│       │   │   └── user-invitations.controller.ts # @Controller('invitations')
│       │   ├── services/
│       │   │   └── user-invitations.service.ts
│       │   ├── dto/
│       │   ├── user-invitations.module.ts
│       │   └── __tests__/
│       │
│       ├── preferences/
│       │   ├── controllers/
│       │   │   └── preferences.controller.ts   # @Controller('preferences')
│       │   ├── services/
│       │   │   └── preferences.service.ts
│       │   ├── dto/
│       │   ├── preferences.module.ts
│       │   └── __tests__/
│       │
│       ├── feature-flags/
│       │   ├── controllers/
│       │   │   └── feature-flags.controller.ts # @Controller('feature-flags')
│       │   ├── services/
│       │   │   └── feature-flags.service.ts
│       │   ├── dto/
│       │   ├── feature-flags.module.ts
│       │   └── __tests__/
│       │
│       ├── onboarding/
│       │   ├── controllers/
│       │   │   └── onboarding.controller.ts    # @Controller('onboarding')
│       │   ├── services/
│       │   │   └── onboarding.service.ts
│       │   ├── dto/
│       │   ├── onboarding.module.ts
│       │   └── __tests__/
│       │
│       └── platform.module.ts                 # Aggregate module
│
├── auth/                                     # Top-level: Authentication & Authorization
│   ├── controllers/
│   │   ├── auth.controller.ts                 # @Controller('auth')
│   │   └── session.controller.ts              # @Controller('session')
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── jwt.service.ts
│   │   └── firebase-auth.service.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── refresh-jwt-auth.guard.ts
│   │   ├── tenant.guard.ts
│   │   └── roles.guard.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   └── refresh-jwt.strategy.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   ├── roles.decorator.ts
│   │   ├── tenant-id.decorator.ts
│   │   └── tenant-db-id.decorator.ts
│   ├── dto/
│   │   ├── login.dto.ts
│   │   └── firebase-exchange.dto.ts
│   ├── auth.module.ts
│   └── __tests__/
│
├── integrations/                             # Top-level: External System Integrations
│   ├── controllers/
│   │   └── integrations.controller.ts         # @Controller('integrations')
│   ├── services/
│   │   ├── integrations.service.ts
│   │   ├── integration-manager.service.ts
│   │   ├── integration-scheduler.service.ts
│   │   └── credentials.service.ts
│   ├── adapters/
│   │   ├── adapter-factory.service.ts
│   │   ├── hos/
│   │   │   ├── hos-adapter.interface.ts
│   │   │   ├── samsara-hos.adapter.ts
│   │   │   └── geotab-hos.adapter.ts
│   │   ├── tms/
│   │   │   ├── tms-adapter.interface.ts
│   │   │   ├── mcleod-tms.adapter.ts
│   │   │   └── project44-tms.adapter.ts
│   │   ├── fuel/
│   │   │   ├── fuel-adapter.interface.ts
│   │   │   ├── gasbuddy-fuel.adapter.ts
│   │   │   └── fuelfinder-fuel.adapter.ts
│   │   ├── weather/
│   │   │   ├── weather-adapter.interface.ts
│   │   │   └── openweather.adapter.ts
│   │   └── eld/
│   │       ├── eld-adapter.interface.ts
│   │       └── samsara-eld.adapter.ts
│   ├── dto/
│   │   ├── create-integration.dto.ts
│   │   └── update-integration.dto.ts
│   ├── vendor-registry.ts
│   ├── integrations.module.ts
│   └── __tests__/
│
├── infrastructure/                           # Infrastructure Layer
│   ├── database/
│   │   ├── prisma.service.ts                  # SINGLE Prisma service
│   │   ├── prisma.module.ts
│   │   └── __tests__/
│   │
│   ├── cache/
│   │   ├── cache.module.ts
│   │   └── __tests__/
│   │
│   ├── notification/
│   │   ├── services/
│   │   │   └── notification.service.ts
│   │   ├── dto/
│   │   ├── notification.module.ts
│   │   └── __tests__/
│   │
│   ├── sync/
│   │   ├── services/
│   │   │   ├── sync.service.ts
│   │   │   ├── eld-sync.service.ts
│   │   │   └── tms-sync.service.ts
│   │   ├── matching/
│   │   │   ├── driver-matcher.ts
│   │   │   └── vehicle-matcher.ts
│   │   ├── merging/
│   │   ├── sync.module.ts
│   │   └── __tests__/
│   │
│   ├── retry/
│   │   ├── services/
│   │   │   └── retry.service.ts
│   │   ├── retry.module.ts
│   │   └── __tests__/
│   │
│   ├── jobs/
│   │   ├── auto-sync.job.ts
│   │   ├── jobs.module.ts
│   │   └── __tests__/
│   │
│   └── infrastructure.module.ts              # Aggregate module
│
├── shared/                                   # Shared Code
│   ├── base/
│   │   ├── base.controller.ts                 # NEW: Shared controller logic
│   │   ├── base.service.ts                    # NEW: Shared service logic
│   │   └── base-tenant.controller.ts          # NEW: Tenant-aware controller
│   │
│   ├── decorators/
│   │   └── (shared decorators if any)
│   │
│   ├── pipes/
│   │   └── (shared pipes)
│   │
│   ├── filters/
│   │   └── http-exception.filter.ts           # NEW: Centralized exception handling
│   │
│   ├── interceptors/
│   │   └── (shared interceptors)
│   │
│   ├── guards/
│   │   └── external-source.guard.ts           # NEW: Extracted from controllers
│   │
│   ├── dto/
│   │   └── pagination.dto.ts
│   │
│   ├── interfaces/
│   │   └── (shared interfaces)
│   │
│   ├── utils/
│   │   ├── validators.ts
│   │   ├── distance-calculator.ts
│   │   └── id-generator.ts
│   │
│   └── shared.module.ts
│
├── testing/                                  # Testing Utilities
│   ├── scenarios/
│   │   ├── controllers/
│   │   │   └── scenarios.controller.ts        # @Controller('scenarios')
│   │   ├── scenarios.module.ts
│   │   └── __tests__/
│   │
│   ├── mocks/
│   │   ├── external-apis/
│   │   │   ├── controllers/
│   │   │   │   ├── external-mock.controller.ts # @Controller('external')
│   │   │   │   └── mock-tms.controller.ts      # @Controller('mock/tms')
│   │   │   └── external-mock.module.ts
│   │   └── __tests__/
│   │
│   └── testing.module.ts
│
├── config/
│   ├── configuration.ts
│   └── firebase.config.ts
│
├── health/
│   ├── health.controller.ts                   # @Controller('health')
│   └── health.module.ts
│
├── app.module.ts                             # Root module (MUCH CLEANER)
└── main.ts                                   # Bootstrap
```

### 2.2 New AppModule Structure

```typescript
// app.module.ts (AFTER refactoring)
@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env.local',
    }),
    ScheduleModule.forRoot(),

    // Infrastructure (Global)
    InfrastructureModule,

    // Top-level concerns
    AuthModule,
    IntegrationsModule,

    // Business Domains
    FleetModule,
    RoutingModule,
    OperationsModule,
    PlatformModule,

    // Development/Testing
    ...(process.env.NODE_ENV !== 'production' ? [TestingModule] : []),

    // Health Check
    HealthModule,
  ],
  providers: [
    // Global guards only
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },

    // Global filters
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
  controllers: [], // NO controllers here anymore!
})
export class AppModule {}
```

### 2.3 Benefits of New Structure

1. **Clear Domain Boundaries**: Easy to understand which code handles which business capability
2. **Team Scalability**: Different teams can own different domains
3. **Microservice Ready**: Can extract domains to microservices easily
4. **Easier Testing**: Domain modules are independently testable
5. **Better Code Discovery**: Developers know exactly where to find code
6. **Reduced Coupling**: Domains communicate through well-defined interfaces

---

## 3. Code Quality Issues

### 3.1 Duplicate Prisma Services

**Problem:**
```typescript
// src/database/prisma.service.ts (Version 1)
- Uses Logger
- Uses Configuration type
- Sets process.env.DATABASE_URL
- Creates adapter with { connectionString }

// src/prisma/prisma.service.ts (Version 2)
- No Logger
- Uses ConfigService directly
- Creates pg.Pool
- Creates adapter with pool
- Manages pool.end() on destroy
```

**Solution:**
- Keep `src/prisma/prisma.service.ts` (Version 2 is better - manages pool lifecycle)
- Delete `src/database/` folder entirely
- Update all imports to use `infrastructure/database/prisma.service.ts`

### 3.2 Tenant Validation Duplication

**Current (31 occurrences):**
```typescript
// Repeated in drivers, vehicles, loads, alerts, etc.
const tenant = await this.prisma.tenant.findUnique({
  where: { tenantId: user.tenantId },
});

if (!tenant) {
  throw new HttpException(
    { detail: 'Tenant not found' },
    HttpStatus.NOT_FOUND,
  );
}
```

**Solution: BaseTenantController**
```typescript
// shared/base/base-tenant.controller.ts
export abstract class BaseTenantController {
  constructor(protected readonly prisma: PrismaService) {}

  protected async getTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  protected async getTenantDbId(user: any): Promise<number> {
    const tenant = await this.getTenant(user.tenantId);
    return tenant.id;
  }
}

// Usage in controllers:
export class DriversController extends BaseTenantController {
  constructor(
    prisma: PrismaService,
    private readonly driversService: DriversService,
  ) {
    super(prisma);
  }

  @Get()
  async listDrivers(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user); // ONE LINE!
    return this.driversService.findAll(tenantDbId);
  }
}
```

**Impact**: Eliminates 31 instances of duplicate code across 8 files.

### 3.3 External Source Validation Duplication

**Current (identical in drivers.controller.ts and vehicles.controller.ts):**
```typescript
private async validateNotExternal(
  entityId: string,
  tenantId: number,
  operation: string,
) {
  const entity = await this.prisma.{driver|vehicle}.findFirst({
    where: { {driverId|vehicleId}: entityId, tenantId },
  });

  if (!entity) {
    throw new HttpException(
      { detail: `{Driver|Vehicle} not found: ${entityId}` },
      HttpStatus.NOT_FOUND,
    );
  }

  if (entity.externalSource) {
    throw new HttpException(
      {
        detail: `Cannot ${operation} {driver|vehicle} from external source: ${entity.externalSource}...`,
        external_source: entity.externalSource,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
```

**Solution: ExternalSourceGuard**
```typescript
// shared/guards/external-source.guard.ts
@Injectable()
export class ExternalSourceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { resourceType, resourceId, tenantId } = this.extractParams(request);

    const resource = await this.findResource(resourceType, resourceId, tenantId);

    if (!resource) {
      throw new NotFoundException(`${resourceType} not found`);
    }

    if (resource.externalSource) {
      throw new ForbiddenException(
        `Cannot modify ${resourceType} from external source: ${resource.externalSource}. This is a read-only integration record.`
      );
    }

    return true;
  }

  private async findResource(type: string, id: string, tenantId: number) {
    switch (type) {
      case 'driver':
        return this.prisma.driver.findFirst({ where: { driverId: id, tenantId } });
      case 'vehicle':
        return this.prisma.vehicle.findFirst({ where: { vehicleId: id, tenantId } });
      default:
        throw new BadRequestException(`Unknown resource type: ${type}`);
    }
  }
}

// Usage:
@Put(':driver_id')
@UseGuards(ExternalSourceGuard)
@SetMetadata('resourceType', 'driver')
async updateDriver(/*...*/) {
  // Guard already validated - no duplication!
}
```

**Impact**: Eliminates ~60 lines of duplicate code.

### 3.4 Error Handling Duplication

**Current (65 instances):**
```typescript
throw new HttpException(
  { detail: 'Some error message' },
  HttpStatus.INTERNAL_SERVER_ERROR,
);
```

**Solution: Centralized Exception Filter**
```typescript
// shared/filters/http-exception.filter.ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : { detail: 'Internal server error' };

    // Log error
    this.logger.error(
      `${request.method} ${request.url} - ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(typeof message === 'string' ? { detail: message } : message),
    });
  }
}

// Usage in controllers:
// Just throw standard NestJS exceptions:
throw new NotFoundException('Driver not found');
throw new ForbiddenException('Cannot modify external resource');
throw new BadRequestException('Invalid input');
// Filter handles the formatting!
```

**Impact**: Simplifies error handling across all controllers.

### 3.5 Empty Files to Delete

```
src/app.controller.ts  (1 line - empty)
src/app.service.ts     (1 line - empty)
```

**Action**: Delete both files.

---

## 4. NestJS Best Practices Review

### 4.1 Module Organization

**❌ Current Issues:**
- 12 controllers declared directly in AppModule
- Services declared in AppModule instead of feature modules
- Tight coupling - hard to test in isolation

**✅ Best Practice:**
- Each feature should be a self-contained module
- Controllers, services, and related code in same module
- AppModule only imports feature modules

**✅ After Refactoring:**
```typescript
// domains/fleet/drivers/drivers.module.ts
@Module({
  imports: [InfrastructureModule], // For PrismaService
  controllers: [DriversController],
  providers: [DriversService, DriversActivationService],
  exports: [DriversService],
})
export class DriversModule {}

// domains/fleet/fleet.module.ts
@Module({
  imports: [DriversModule, VehiclesModule, LoadsModule],
  exports: [DriversModule, VehiclesModule, LoadsModule],
})
export class FleetModule {}
```

### 4.2 Dependency Injection

**✅ Good:**
- Using constructor injection consistently
- Proper use of `@Injectable()` decorator

**⚠️ Needs Improvement:**
- Some services use `@Inject(IntegrationManagerService)` unnecessarily
- Can just use constructor injection

**Example:**
```typescript
// ❌ Before:
constructor(
  private readonly prisma: PrismaService,
  @Inject(IntegrationManagerService)
  private readonly integrationManager: IntegrationManagerService,
) {}

// ✅ After:
constructor(
  private readonly prisma: PrismaService,
  private readonly integrationManager: IntegrationManagerService,
) {}
```

### 4.3 Global vs Scoped Providers

**Current:**
```typescript
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**✅ Good:** PrismaService should be global (used everywhere)

**✅ Keep Global:**
- PrismaService
- ConfigService (already global)
- CacheService

**✅ Should NOT be Global:**
- Domain services (should be scoped to their modules)

### 4.4 DTO Validation

**✅ Good:**
- Using `class-validator` decorators in existing DTOs
- Proper use of `@ApiProperty()` for Swagger

**⚠️ Needs Improvement:**
- Many controllers use inline body objects instead of DTOs
- Need to create DTOs for all endpoints

**Example - Drivers Controller:**
```typescript
// ❌ Before:
@Post()
async createDriver(
  @CurrentUser() user: any,
  @Body() body: { driver_id: string; name: string },
) {
  // ...
}

// ✅ After:
@Post()
async createDriver(
  @CurrentUser() user: any,
  @Body() createDriverDto: CreateDriverDto,
) {
  return this.driversService.create(user.tenantId, createDriverDto);
}

// domains/fleet/drivers/dto/create-driver.dto.ts
export class CreateDriverDto {
  @ApiProperty({ example: 'DRV-001' })
  @IsString()
  @IsNotEmpty()
  driver_id: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

### 4.5 Swagger Documentation

**✅ Good:**
- Using `@ApiTags()`, `@ApiOperation()`
- Bearer auth configured

**⚠️ Needs Improvement:**
- Inline schemas in `@ApiBody()` should be replaced with DTO classes
- Response types should use `@ApiResponse()` with DTO classes

### 4.6 Testing Structure

**✅ Good:**
- Test files colocated with source files
- Using `*.spec.ts` naming convention

**⚠️ Needs Improvement:**
- With domain reorganization, ensure all tests are moved with their modules
- Add integration tests for domain modules

---

## 5. Migration Plan

### Phase 1: Preparation (No Breaking Changes)

**Step 1.1: Create New Directory Structure**
```bash
mkdir -p src/domains/{fleet,routing,operations,platform}
mkdir -p src/domains/fleet/{drivers,vehicles,loads}
mkdir -p src/domains/routing/{route-planning,optimization,hos-compliance,prediction}
mkdir -p src/domains/operations/{alerts,monitoring}
mkdir -p src/domains/platform/{tenants,users,user-invitations,preferences,feature-flags,onboarding}
mkdir -p src/infrastructure/{database,cache,notification,sync,retry,jobs}
mkdir -p src/shared/{base,decorators,pipes,filters,interceptors,guards,dto,interfaces,utils}
mkdir -p src/testing/{scenarios,mocks}
```

**Step 1.2: Create Shared Base Classes**
```bash
# Create before moving controllers
src/shared/base/base-tenant.controller.ts
src/shared/guards/external-source.guard.ts
src/shared/filters/http-exception.filter.ts
```

**Step 1.3: Fix Prisma Service Duplication**
```bash
# Move prisma/ to infrastructure/database/
mv src/prisma src/infrastructure/database

# Update all imports (automated with script)
# Delete src/database/ folder
```

### Phase 2: Domain Migration (Parallel Work)

Each domain can be migrated independently by different team members.

**Step 2.1: Fleet Domain**
```bash
# Drivers
mv src/api/drivers/drivers.controller.ts src/domains/fleet/drivers/controllers/
mv src/api/drivers/drivers-activation.service.ts src/domains/fleet/drivers/services/
# Create drivers.module.ts
# Create drivers.service.ts (extract logic from controller)
# Create DTOs

# Vehicles
mv src/api/vehicles/vehicles.controller.ts src/domains/fleet/vehicles/controllers/
# Create vehicles.module.ts
# Create vehicles.service.ts
# Create DTOs

# Loads
mv src/api/loads/loads.controller.ts src/domains/fleet/loads/controllers/
# Create loads.module.ts
# Create loads.service.ts (extract logic from controller)
# Create DTOs

# Create fleet.module.ts (aggregate)
```

**Step 2.2: Routing Domain**
```bash
# Route Planning
mv src/api/route-planning/route-planning.controller.ts src/domains/routing/route-planning/controllers/
mv src/services/route-planning-engine/route-planning-engine.service.ts src/domains/routing/route-planning/services/
# Create route-planning.module.ts

# Optimization
mv src/api/optimization/optimization.controller.ts src/domains/routing/optimization/controllers/
mv src/services/rest-optimization/rest-optimization.service.ts src/domains/routing/optimization/services/
mv src/services/tsp-optimizer/tsp-optimizer.service.ts src/domains/routing/optimization/services/
mv src/services/fuel-stop-optimizer/fuel-stop-optimizer.service.ts src/domains/routing/optimization/services/
mv src/services/rest-stop-finder/rest-stop-finder.service.ts src/domains/routing/optimization/services/
# Create optimization.module.ts

# HOS Compliance
mv src/api/hos-rules/hos-rules.controller.ts src/domains/routing/hos-compliance/controllers/
mv src/services/hos-rule-engine/hos-rule-engine.service.ts src/domains/routing/hos-compliance/services/
# Create hos-compliance.module.ts

# Prediction
mv src/api/prediction/prediction.controller.ts src/domains/routing/prediction/controllers/
mv src/services/prediction-engine/prediction-engine.service.ts src/domains/routing/prediction/services/
# Create prediction.module.ts

# Create routing.module.ts (aggregate)
```

**Step 2.3: Operations Domain**
```bash
# Alerts
mv src/api/alerts/alerts.controller.ts src/domains/operations/alerts/controllers/
mv src/services/alerts/alert.service.ts src/domains/operations/alerts/services/
mv src/services/alerts/alert.module.ts src/domains/operations/alerts/
# Update imports

# Monitoring
mv src/services/dynamic-update-handler/dynamic-update-handler.service.ts src/domains/operations/monitoring/services/
# Create monitoring.module.ts

# Create operations.module.ts (aggregate)
```

**Step 2.4: Platform Domain**
```bash
# Tenants, Users, UserInvitations, Preferences, FeatureFlags, Onboarding
# These already have modules - just move them
mv src/api/tenants src/domains/platform/
mv src/api/users src/domains/platform/
mv src/api/user-invitations src/domains/platform/
mv src/api/preferences src/domains/platform/
mv src/api/feature-flags src/domains/platform/
mv src/api/onboarding src/domains/platform/

# Update imports in each module
# Create platform.module.ts (aggregate)
```

### Phase 3: Top-Level Concerns

**Step 3.1: Auth (Already Good Structure)**
```bash
# Just move session controller into auth/
mv src/api/session/session.controller.ts src/auth/controllers/
# Update auth.module.ts to include SessionController
```

**Step 3.2: Integrations**
```bash
# Move existing integrations module
mv src/api/integrations src/integrations/controllers
mv src/api/integrations/integrations.module.ts src/integrations/

# Move integration-related services
mv src/services/integration-manager src/integrations/services/
mv src/services/credentials src/integrations/services/
mv src/services/adapters src/integrations/

# Update integrations.module.ts
```

### Phase 4: Infrastructure

```bash
# Database (already done in Phase 1)
# Cache
mv src/cache src/infrastructure/

# Notification
mv src/services/notification src/infrastructure/

# Sync
mv src/services/sync src/infrastructure/

# Retry
mv src/services/retry src/infrastructure/

# Jobs
mv src/jobs src/infrastructure/

# Create infrastructure.module.ts (aggregate)
```

### Phase 5: Testing & Cleanup

```bash
# Testing utilities
mv src/api/scenarios src/testing/scenarios/
mv src/api/external-mock src/testing/mocks/external-apis/
mv src/api/mock-external src/testing/mocks/external-apis/
# Merge external-mock and mock-external if redundant
# Create testing.module.ts

# Cleanup
rm src/app.controller.ts
rm src/app.service.ts
rm -rf src/api/  # Should be empty now
rm -rf src/services/  # Should be empty now

# Update app.module.ts to import domain modules
```

### Phase 6: Testing & Validation

```bash
# Run tests
npm run test
npm run test:e2e

# Start server and verify all endpoints
npm run start:dev

# Test API routes (all should still work):
curl http://localhost:8000/api/v1/drivers
curl http://localhost:8000/api/v1/vehicles
curl http://localhost:8000/api/v1/route-planning
# ... etc
```

---

## 6. File Movement Mappings

### 6.1 Fleet Domain

| From | To | Notes |
|------|----|----|
| `api/drivers/drivers.controller.ts` | `domains/fleet/drivers/controllers/drivers.controller.ts` | Keep @Controller('drivers') |
| `api/drivers/drivers-activation.service.ts` | `domains/fleet/drivers/services/drivers-activation.service.ts` | - |
| N/A (create new) | `domains/fleet/drivers/services/drivers.service.ts` | Extract business logic from controller |
| N/A (create new) | `domains/fleet/drivers/drivers.module.ts` | New module |
| `api/vehicles/vehicles.controller.ts` | `domains/fleet/vehicles/controllers/vehicles.controller.ts` | Keep @Controller('vehicles') |
| N/A (create new) | `domains/fleet/vehicles/services/vehicles.service.ts` | Extract business logic |
| N/A (create new) | `domains/fleet/vehicles/vehicles.module.ts` | New module |
| `api/loads/loads.controller.ts` | `domains/fleet/loads/controllers/loads.controller.ts` | Keep @Controller('loads') |
| N/A (create new) | `domains/fleet/loads/services/loads.service.ts` | Extract business logic |
| N/A (create new) | `domains/fleet/loads/loads.module.ts` | New module |

### 6.2 Routing Domain

| From | To | Notes |
|------|----|----|
| `api/route-planning/route-planning.controller.ts` | `domains/routing/route-planning/controllers/route-planning.controller.ts` | Keep @Controller('route-planning') |
| `services/route-planning-engine/route-planning-engine.service.ts` | `domains/routing/route-planning/services/route-planning-engine.service.ts` | - |
| N/A (create new) | `domains/routing/route-planning/route-planning.module.ts` | New module |
| `api/optimization/optimization.controller.ts` | `domains/routing/optimization/controllers/optimization.controller.ts` | Keep @Controller('optimization') |
| `services/rest-optimization/rest-optimization.service.ts` | `domains/routing/optimization/services/rest-optimization.service.ts` | - |
| `services/tsp-optimizer/tsp-optimizer.service.ts` | `domains/routing/optimization/services/tsp-optimizer.service.ts` | - |
| `services/fuel-stop-optimizer/fuel-stop-optimizer.service.ts` | `domains/routing/optimization/services/fuel-stop-optimizer.service.ts` | - |
| `services/rest-stop-finder/rest-stop-finder.service.ts` | `domains/routing/optimization/services/rest-stop-finder.service.ts` | - |
| N/A (create new) | `domains/routing/optimization/optimization.module.ts` | New module |
| `api/hos-rules/hos-rules.controller.ts` | `domains/routing/hos-compliance/controllers/hos-rules.controller.ts` | Keep @Controller('hos-rules') |
| `services/hos-rule-engine/hos-rule-engine.service.ts` | `domains/routing/hos-compliance/services/hos-rule-engine.service.ts` | - |
| N/A (create new) | `domains/routing/hos-compliance/hos-compliance.module.ts` | New module |
| `api/prediction/prediction.controller.ts` | `domains/routing/prediction/controllers/prediction.controller.ts` | Keep @Controller('prediction') |
| `services/prediction-engine/prediction-engine.service.ts` | `domains/routing/prediction/services/prediction-engine.service.ts` | - |
| N/A (create new) | `domains/routing/prediction/prediction.module.ts` | New module |

### 6.3 Operations Domain

| From | To | Notes |
|------|----|----|
| `api/alerts/alerts.controller.ts` | `domains/operations/alerts/controllers/alerts.controller.ts` | Keep @Controller('alerts') |
| `services/alerts/alert.service.ts` | `domains/operations/alerts/services/alert.service.ts` | - |
| `services/alerts/alert.module.ts` | `domains/operations/alerts/alerts.module.ts` | Rename module |
| `services/dynamic-update-handler/dynamic-update-handler.service.ts` | `domains/operations/monitoring/services/dynamic-update-handler.service.ts` | - |
| N/A (create new) | `domains/operations/monitoring/monitoring.module.ts` | New module |

### 6.4 Platform Domain

| From | To | Notes |
|------|----|----|
| `api/tenants/*` | `domains/platform/tenants/*` | Already has module |
| `api/users/*` | `domains/platform/users/*` | Already has module |
| `api/user-invitations/*` | `domains/platform/user-invitations/*` | Already has module |
| `api/preferences/*` | `domains/platform/preferences/*` | Already has module |
| `api/feature-flags/*` | `domains/platform/feature-flags/*` | Already has module |
| `api/onboarding/*` | `domains/platform/onboarding/*` | Already has module |

### 6.5 Auth (Top-Level)

| From | To | Notes |
|------|----|----|
| `auth/*` | `auth/*` | Keep as-is (already good) |
| `api/session/session.controller.ts` | `auth/controllers/session.controller.ts` | Move into auth module |

### 6.6 Integrations (Top-Level)

| From | To | Notes |
|------|----|----|
| `api/integrations/integrations.controller.ts` | `integrations/controllers/integrations.controller.ts` | - |
| `api/integrations/integrations.service.ts` | `integrations/services/integrations.service.ts` | - |
| `api/integrations/*` | `integrations/*` | Move entire module |
| `services/integration-manager/*` | `integrations/services/integration-manager/*` | Merge into integrations |
| `services/credentials/*` | `integrations/services/credentials/*` | Move to integrations |
| `services/adapters/*` | `integrations/adapters/*` | Move to integrations |

### 6.7 Infrastructure

| From | To | Notes |
|------|----|----|
| `prisma/*` | `infrastructure/database/*` | Rename prisma to database |
| `database/*` | DELETE | Remove duplicate |
| `cache/*` | `infrastructure/cache/*` | - |
| `services/notification/*` | `infrastructure/notification/*` | - |
| `services/sync/*` | `infrastructure/sync/*` | - |
| `services/retry/*` | `infrastructure/retry/*` | - |
| `jobs/*` | `infrastructure/jobs/*` | - |

### 6.8 Shared

| From | To | Notes |
|------|----|----|
| `common/services/*` | `shared/services/*` OR delete | ServicesModule only has EmailService - move to infrastructure/notification |
| `common/utils/*` | `shared/utils/*` | - |
| `utils/*` | `shared/utils/*` | Merge with common/utils |
| N/A (create new) | `shared/base/base-tenant.controller.ts` | NEW: Base class |
| N/A (create new) | `shared/guards/external-source.guard.ts` | NEW: Extract from controllers |
| N/A (create new) | `shared/filters/http-exception.filter.ts` | NEW: Centralized error handling |

### 6.9 Testing

| From | To | Notes |
|------|----|----|
| `api/scenarios/*` | `testing/scenarios/*` | - |
| `api/external-mock/*` | `testing/mocks/external-apis/*` | - |
| `api/mock-external/*` | `testing/mocks/external-apis/*` | Merge with external-mock if duplicate |

### 6.10 Delete

| File | Reason |
|------|--------|
| `app.controller.ts` | Empty - not used |
| `app.service.ts` | Empty - not used |
| `database/` (entire folder) | Duplicate of prisma/ |

---

## 7. Shared Abstractions Design

### 7.1 BaseTenantController

**Location:** `src/shared/base/base-tenant.controller.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Tenant } from '@prisma/client';

@Injectable()
export abstract class BaseTenantController {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Get tenant by tenantId (string)
   * Throws NotFoundException if not found
   */
  protected async getTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  /**
   * Get tenant database ID from user
   * Convenience method for most common use case
   */
  protected async getTenantDbId(user: any): Promise<number> {
    const tenant = await this.getTenant(user.tenantId);
    return tenant.id;
  }

  /**
   * Validate tenant access for a resource
   * Ensures resource belongs to user's tenant
   */
  protected async validateTenantAccess(
    resourceTenantId: number,
    userTenantId: string,
  ): Promise<void> {
    const tenant = await this.getTenant(userTenantId);

    if (resourceTenantId !== tenant.id) {
      throw new ForbiddenException(
        'You do not have access to this resource',
      );
    }
  }
}
```

**Usage Example:**
```typescript
@Controller('drivers')
export class DriversController extends BaseTenantController {
  constructor(
    prisma: PrismaService,
    private readonly driversService: DriversService,
  ) {
    super(prisma);
  }

  @Get()
  async listDrivers(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user); // ONE LINE!
    return this.driversService.findAll(tenantDbId);
  }

  @Get(':driver_id')
  async getDriver(
    @Param('driver_id') driverId: string,
    @CurrentUser() user: any,
  ) {
    const driver = await this.driversService.findOne(driverId);
    await this.validateTenantAccess(driver.tenantId, user.tenantId);
    return driver;
  }
}
```

### 7.2 ExternalSourceGuard

**Location:** `src/shared/guards/external-source.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export const EXTERNAL_SOURCE_KEY = 'externalSource';
export const ExternalSourceCheck = (resourceType: 'driver' | 'vehicle') =>
  SetMetadata(EXTERNAL_SOURCE_KEY, resourceType);

@Injectable()
export class ExternalSourceGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resourceType = this.reflector.get<string>(
      EXTERNAL_SOURCE_KEY,
      context.getHandler(),
    );

    if (!resourceType) {
      return true; // No check needed
    }

    const request = context.switchToHttp().getRequest();
    const { params, user } = request;

    const resourceId = params.driver_id || params.vehicle_id;
    const tenantId = user?.tenantDbId; // Should be set by TenantGuard

    if (!resourceId || !tenantId) {
      throw new BadRequestException('Missing required parameters');
    }

    const resource = await this.findResource(resourceType, resourceId, tenantId);

    if (!resource) {
      throw new NotFoundException(`${resourceType} not found`);
    }

    if (resource.externalSource) {
      throw new ForbiddenException(
        `Cannot modify ${resourceType} from external source: ${resource.externalSource}. This is a read-only integration record.`,
      );
    }

    return true;
  }

  private async findResource(
    type: string,
    id: string,
    tenantId: number,
  ): Promise<any> {
    switch (type) {
      case 'driver':
        return this.prisma.driver.findFirst({
          where: { driverId: id, tenantId },
        });
      case 'vehicle':
        return this.prisma.vehicle.findFirst({
          where: { vehicleId: id, tenantId },
        });
      default:
        throw new BadRequestException(`Unknown resource type: ${type}`);
    }
  }
}
```

**Usage Example:**
```typescript
@Controller('drivers')
export class DriversController {
  @Put(':driver_id')
  @UseGuards(ExternalSourceGuard)
  @ExternalSourceCheck('driver')
  async updateDriver(
    @Param('driver_id') driverId: string,
    @Body() updateDriverDto: UpdateDriverDto,
  ) {
    // Guard already validated external source - no duplication needed!
    return this.driversService.update(driverId, updateDriverDto);
  }

  @Delete(':driver_id')
  @UseGuards(ExternalSourceGuard)
  @ExternalSourceCheck('driver')
  async deleteDriver(@Param('driver_id') driverId: string) {
    // Guard already validated - clean!
    return this.driversService.remove(driverId);
  }
}
```

### 7.3 HttpExceptionFilter

**Location:** `src/shared/filters/http-exception.filter.ts`

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { detail: 'Internal server error' };

    // Log error with context
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    // Format response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(typeof message === 'string' ? { detail: message } : message),
    };

    response.status(status).json(errorResponse);
  }
}
```

**Registration in AppModule:**
```typescript
@Module({
  // ...
  providers: [
    // Global filters
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // ...
  ],
})
export class AppModule {}
```

**Usage in Controllers (Simplified):**
```typescript
// Before (manual error handling):
try {
  const driver = await this.prisma.driver.findUnique({ where: { id } });
  if (!driver) {
    throw new HttpException(
      { detail: 'Driver not found' },
      HttpStatus.NOT_FOUND,
    );
  }
  return driver;
} catch (error) {
  this.logger.error(`Get driver failed: ${error.message}`);
  throw new HttpException(
    { detail: 'Failed to fetch driver' },
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}

// After (centralized error handling):
const driver = await this.prisma.driver.findUnique({ where: { id } });
if (!driver) {
  throw new NotFoundException('Driver not found');
}
return driver;
// Filter handles logging and formatting automatically!
```

### 7.4 Domain Service Base Class (Optional)

**Location:** `src/shared/base/base.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(
    protected readonly prisma: PrismaService,
    loggerContext: string,
  ) {
    this.logger = new Logger(loggerContext);
  }

  /**
   * Generic find with tenant scoping
   */
  protected async findManyWithTenant<T>(
    model: any,
    tenantId: number,
    options?: any,
  ): Promise<T[]> {
    return model.findMany({
      where: {
        tenantId,
        ...(options?.where || {}),
      },
      ...(options || {}),
    });
  }

  /**
   * Generic findOne with tenant scoping
   */
  protected async findOneWithTenant<T>(
    model: any,
    tenantId: number,
    where: any,
  ): Promise<T | null> {
    return model.findFirst({
      where: {
        tenantId,
        ...where,
      },
    });
  }
}
```

**Usage Example:**
```typescript
@Injectable()
export class DriversService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma, DriversService.name);
  }

  async findAll(tenantId: number): Promise<Driver[]> {
    return this.findManyWithTenant(
      this.prisma.driver,
      tenantId,
      { where: { isActive: true } },
    );
  }

  async findOne(tenantId: number, driverId: string): Promise<Driver> {
    const driver = await this.findOneWithTenant(
      this.prisma.driver,
      tenantId,
      { driverId },
    );

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }
}
```

---

## 8. Implementation Checklist

### Phase 1: Preparation
- [ ] Create new directory structure
- [ ] Create shared base classes
  - [ ] BaseTenantController
  - [ ] BaseService (optional)
- [ ] Create shared guards
  - [ ] ExternalSourceGuard
- [ ] Create shared filters
  - [ ] HttpExceptionFilter
- [ ] Fix Prisma service duplication
  - [ ] Move `src/prisma` to `src/infrastructure/database`
  - [ ] Delete `src/database` folder
  - [ ] Update all imports (use find-replace or script)
- [ ] Register global filter in AppModule

### Phase 2: Fleet Domain
- [ ] **Drivers Module**
  - [ ] Create `domains/fleet/drivers/drivers.module.ts`
  - [ ] Create `domains/fleet/drivers/services/drivers.service.ts`
  - [ ] Move controller to `domains/fleet/drivers/controllers/`
  - [ ] Move activation service to `domains/fleet/drivers/services/`
  - [ ] Update controller to extend BaseTenantController
  - [ ] Update controller to use ExternalSourceGuard
  - [ ] Extract business logic from controller to service
  - [ ] Create DTOs
  - [ ] Move tests
  - [ ] Update imports in AppModule

- [ ] **Vehicles Module**
  - [ ] Create `domains/fleet/vehicles/vehicles.module.ts`
  - [ ] Create `domains/fleet/vehicles/services/vehicles.service.ts`
  - [ ] Move controller to `domains/fleet/vehicles/controllers/`
  - [ ] Update controller to extend BaseTenantController
  - [ ] Update controller to use ExternalSourceGuard
  - [ ] Extract business logic to service
  - [ ] Create DTOs
  - [ ] Move tests
  - [ ] Update imports in AppModule

- [ ] **Loads Module**
  - [ ] Create `domains/fleet/loads/loads.module.ts`
  - [ ] Create `domains/fleet/loads/services/loads.service.ts`
  - [ ] Move controller to `domains/fleet/loads/controllers/`
  - [ ] Update controller to extend BaseTenantController
  - [ ] Extract business logic to service
  - [ ] Create DTOs
  - [ ] Move tests
  - [ ] Update imports in AppModule

- [ ] **Fleet Aggregate Module**
  - [ ] Create `domains/fleet/fleet.module.ts`
  - [ ] Import all fleet sub-modules
  - [ ] Update AppModule to import FleetModule instead of individual modules

### Phase 3: Routing Domain
- [ ] **Route Planning Module**
  - [ ] Create `domains/routing/route-planning/route-planning.module.ts`
  - [ ] Move controller to `domains/routing/route-planning/controllers/`
  - [ ] Move route-planning-engine service to `domains/routing/route-planning/services/`
  - [ ] Create DTOs (if missing)
  - [ ] Move tests
  - [ ] Update imports

- [ ] **Optimization Module**
  - [ ] Create `domains/routing/optimization/optimization.module.ts`
  - [ ] Move controller to `domains/routing/optimization/controllers/`
  - [ ] Move services:
    - [ ] rest-optimization.service.ts
    - [ ] tsp-optimizer.service.ts
    - [ ] fuel-stop-optimizer.service.ts
    - [ ] rest-stop-finder.service.ts
  - [ ] Create DTOs
  - [ ] Move tests
  - [ ] Update imports

- [ ] **HOS Compliance Module**
  - [ ] Create `domains/routing/hos-compliance/hos-compliance.module.ts`
  - [ ] Move controller to `domains/routing/hos-compliance/controllers/`
  - [ ] Move hos-rule-engine service
  - [ ] Create DTOs
  - [ ] Move tests
  - [ ] Update imports

- [ ] **Prediction Module**
  - [ ] Create `domains/routing/prediction/prediction.module.ts`
  - [ ] Move controller to `domains/routing/prediction/controllers/`
  - [ ] Move prediction-engine service
  - [ ] Create DTOs
  - [ ] Move tests
  - [ ] Update imports

- [ ] **Routing Aggregate Module**
  - [ ] Create `domains/routing/routing.module.ts`
  - [ ] Import all routing sub-modules
  - [ ] Update AppModule

### Phase 4: Operations Domain
- [ ] **Alerts Module**
  - [ ] Move to `domains/operations/alerts/`
  - [ ] Update imports
  - [ ] Rename AlertModule to AlertsModule (if needed)

- [ ] **Monitoring Module**
  - [ ] Create `domains/operations/monitoring/monitoring.module.ts`
  - [ ] Move dynamic-update-handler service
  - [ ] Update imports

- [ ] **Operations Aggregate Module**
  - [ ] Create `domains/operations/operations.module.ts`
  - [ ] Update AppModule

### Phase 5: Platform Domain
- [ ] Move existing modules (already have modules):
  - [ ] tenants → `domains/platform/tenants/`
  - [ ] users → `domains/platform/users/`
  - [ ] user-invitations → `domains/platform/user-invitations/`
  - [ ] preferences → `domains/platform/preferences/`
  - [ ] feature-flags → `domains/platform/feature-flags/`
  - [ ] onboarding → `domains/platform/onboarding/`
- [ ] Create `domains/platform/platform.module.ts`
- [ ] Update AppModule

### Phase 6: Auth (Top-Level)
- [ ] Move session controller to `auth/controllers/`
- [ ] Update auth.module.ts to include SessionController
- [ ] Update imports in AppModule

### Phase 7: Integrations (Top-Level)
- [ ] Move `api/integrations/` to `integrations/controllers/`
- [ ] Move `services/integration-manager/` to `integrations/services/`
- [ ] Move `services/credentials/` to `integrations/services/`
- [ ] Move `services/adapters/` to `integrations/adapters/`
- [ ] Update integrations.module.ts
- [ ] Update imports in AppModule

### Phase 8: Infrastructure
- [ ] **Database** (already done in Phase 1)
- [ ] **Cache**
  - [ ] Move to `infrastructure/cache/`
  - [ ] Update imports
- [ ] **Notification**
  - [ ] Move to `infrastructure/notification/`
  - [ ] Update imports
- [ ] **Sync**
  - [ ] Move to `infrastructure/sync/`
  - [ ] Update imports
- [ ] **Retry**
  - [ ] Move to `infrastructure/retry/`
  - [ ] Update imports
- [ ] **Jobs**
  - [ ] Move to `infrastructure/jobs/`
  - [ ] Update imports
- [ ] **Create InfrastructureModule**
  - [ ] Create `infrastructure/infrastructure.module.ts`
  - [ ] Make it global
  - [ ] Export PrismaService, CacheModule, etc.
  - [ ] Update AppModule

### Phase 9: Shared
- [ ] Move `common/utils/` to `shared/utils/`
- [ ] Move `utils/` to `shared/utils/` (merge)
- [ ] Move EmailService to `infrastructure/notification/` (or delete if redundant)
- [ ] Delete `common/services/` if empty
- [ ] Create `shared/shared.module.ts` if needed

### Phase 10: Testing
- [ ] Move scenarios to `testing/scenarios/`
- [ ] Move external-mock to `testing/mocks/external-apis/`
- [ ] Move mock-external to `testing/mocks/external-apis/`
- [ ] Verify if external-mock and mock-external are duplicates
  - [ ] If yes, merge them
  - [ ] If no, keep both but document purpose
- [ ] Create `testing/testing.module.ts`
- [ ] Update AppModule (only import in dev/test)

### Phase 11: Cleanup
- [ ] Delete `src/app.controller.ts`
- [ ] Delete `src/app.service.ts`
- [ ] Delete `src/api/` (should be empty)
- [ ] Delete `src/services/` (should be empty)
- [ ] Delete `src/database/` (duplicate Prisma)
- [ ] Delete `src/common/services/` if empty

### Phase 12: Update AppModule
- [ ] Remove all controller declarations
- [ ] Remove all service providers (move to feature modules)
- [ ] Update imports to use aggregate modules:
  - [ ] InfrastructureModule (global)
  - [ ] AuthModule
  - [ ] IntegrationsModule
  - [ ] FleetModule
  - [ ] RoutingModule
  - [ ] OperationsModule
  - [ ] PlatformModule
  - [ ] TestingModule (conditional)
  - [ ] HealthModule

### Phase 13: Testing & Validation
- [ ] Run unit tests: `npm run test`
- [ ] Run e2e tests: `npm run test:e2e`
- [ ] Fix any broken tests
- [ ] Start dev server: `npm run start:dev`
- [ ] Test all API endpoints manually or with Postman/Swagger:
  - [ ] GET /api/v1/drivers
  - [ ] POST /api/v1/drivers
  - [ ] PUT /api/v1/drivers/:id
  - [ ] DELETE /api/v1/drivers/:id
  - [ ] (repeat for all controllers)
- [ ] Verify Swagger docs are still correct: http://localhost:8000/api
- [ ] Run integration tests against real database
- [ ] Check logs for any errors

### Phase 14: Documentation
- [ ] Update README.md with new structure
- [ ] Update architecture diagrams
- [ ] Document domain boundaries
- [ ] Document shared abstractions usage
- [ ] Create CONTRIBUTING.md with domain guidelines

---

## 9. Validation Strategy

### 9.1 Pre-Migration Checklist

Before starting migration:
- [ ] All tests passing
- [ ] Branch created from main
- [ ] Team notified of migration plan
- [ ] Migration script reviewed

### 9.2 During Migration Validation

After each domain migration:
- [ ] Unit tests passing for that domain
- [ ] Controller routes unchanged (verify @Controller decorators)
- [ ] Imports updated correctly
- [ ] No console errors when starting server

### 9.3 Post-Migration Validation

#### Automated Tests
```bash
# Run all tests
npm run test

# Run e2e tests
npm run test:e2e

# Check for type errors
npm run build
```

#### Manual API Testing
```bash
# Start server
npm run start:dev

# Test each domain's endpoints
curl -X GET http://localhost:8000/api/v1/drivers \
  -H "Authorization: Bearer <token>"

curl -X GET http://localhost:8000/api/v1/vehicles \
  -H "Authorization: Bearer <token>"

curl -X GET http://localhost:8000/api/v1/route-planning \
  -H "Authorization: Bearer <token>"

# ... test all endpoints
```

#### Swagger Validation
1. Open http://localhost:8000/api
2. Verify all endpoints are documented
3. Verify all tags are correct
4. Test endpoints through Swagger UI

#### Database Validation
```bash
# Verify Prisma migrations still work
npm run prisma:migrate:status

# Verify Prisma Studio works
npm run prisma:studio
```

#### Integration Tests
```bash
# Run specific integration tests
npm run test:e2e -- integrations.e2e-spec.ts
npm run test:e2e -- drivers.e2e-spec.ts
npm run test:e2e -- route-planning.e2e-spec.ts
```

### 9.4 Rollback Plan

If issues are found after migration:

1. **Immediate Rollback**
   ```bash
   git reset --hard HEAD~1
   git clean -fd
   npm install
   npm run start:dev
   ```

2. **Partial Rollback**
   - Keep shared abstractions (they're improvements)
   - Revert domain structure changes
   - Keep Prisma service fix

3. **Documentation**
   - Document what went wrong
   - Update migration plan
   - Schedule re-attempt

### 9.5 Success Criteria

Migration is successful when:
- [ ] All unit tests passing (100% of previous coverage)
- [ ] All e2e tests passing
- [ ] All API endpoints return correct responses
- [ ] No console errors in dev server
- [ ] Swagger documentation complete and correct
- [ ] Build succeeds without errors
- [ ] No TypeScript errors
- [ ] No performance degradation (response times similar)
- [ ] All domain modules can be imported independently
- [ ] Code coverage maintained or improved

---

## 10. Timeline & Effort Estimation

### Development Effort

**Estimated Total Effort:** 4-5 developer days (32-40 hours)

**Breakdown by Phase:**

| Phase | Description | Effort | Can Parallelize? |
|-------|-------------|--------|------------------|
| Phase 1 | Preparation (base classes, guards, filters, Prisma fix) | 6 hours | No |
| Phase 2 | Fleet Domain (3 modules) | 8 hours | Yes (3 devs) |
| Phase 3 | Routing Domain (4 modules) | 10 hours | Yes (4 devs) |
| Phase 4 | Operations Domain (2 modules) | 3 hours | Yes (2 devs) |
| Phase 5 | Platform Domain (6 modules) | 4 hours | Yes (move only) |
| Phase 6 | Auth (move session) | 1 hour | No |
| Phase 7 | Integrations | 3 hours | No |
| Phase 8 | Infrastructure | 3 hours | No |
| Phase 9 | Shared | 1 hour | No |
| Phase 10 | Testing modules | 2 hours | Yes |
| Phase 11 | Cleanup | 1 hour | No |
| Phase 12 | Update AppModule | 2 hours | No |
| Phase 13 | Testing & Validation | 8 hours | No |
| Phase 14 | Documentation | 3 hours | No |

**With Parallel Work (3-4 developers):**
- Phase 1: 6 hours (Day 1)
- Phases 2-5 (domains): 10 hours in parallel (Day 1-2)
- Phases 6-11: 10 hours (Day 2-3)
- Phase 12-14: 13 hours (Day 3-4)

**Total Calendar Time: 3-4 days with team of 3-4 developers**

---

## 11. Benefits Summary

### Immediate Benefits
1. **Zero API Breaking Changes**: All endpoints remain the same
2. **Eliminated Duplicate Code**: 31+ instances of tenant validation removed
3. **Single Source of Truth**: One Prisma service instead of two
4. **Cleaner Error Handling**: Centralized exception filter
5. **Better Security**: Reusable guards for external source validation

### Long-term Benefits
1. **Scalable Architecture**: Clear domain boundaries for team growth
2. **Microservice Ready**: Domains can be extracted to separate services
3. **Easier Testing**: Domain modules are independently testable
4. **Better Onboarding**: New developers can understand structure quickly
5. **Reduced Technical Debt**: Clean, maintainable codebase
6. **Faster Feature Development**: Less code duplication means faster changes

### Business Impact
1. **Reduced Maintenance Costs**: Fewer bugs from duplicate code
2. **Faster Time to Market**: Cleaner architecture = faster features
3. **Better Team Productivity**: Clear ownership and boundaries
4. **Lower Risk**: Better separation of concerns = easier to change
5. **Improved Quality**: Shared abstractions enforce best practices

---

## 12. Risk Mitigation

### Identified Risks

1. **Risk: Breaking API endpoints during migration**
   - **Mitigation**: Keep all @Controller() decorators unchanged
   - **Validation**: Test all endpoints after each domain migration

2. **Risk: Import path hell (many files to update)**
   - **Mitigation**: Use automated find-replace scripts
   - **Validation**: TypeScript compiler will catch broken imports

3. **Risk: Merge conflicts during parallel work**
   - **Mitigation**: Each developer works on separate domain
   - **Validation**: Clear ownership, minimal overlap

4. **Risk: Tests breaking after migration**
   - **Mitigation**: Move tests with their modules
   - **Validation**: Run tests after each phase

5. **Risk: Performance degradation**
   - **Mitigation**: No changes to business logic, only structure
   - **Validation**: Load test before/after

### Risk Response Plan

**If API breaks:**
- Identify which endpoint(s) affected
- Check @Controller() decorator
- Verify module imports in AppModule
- Check Swagger docs for clues

**If tests fail:**
- Check if test files moved correctly
- Update test imports
- Verify test database setup

**If server won't start:**
- Check for circular dependencies
- Verify all modules are imported
- Check for TypeScript errors

---

## 13. Post-Migration Tasks

### Code Quality
- [ ] Run ESLint: `npm run lint`
- [ ] Fix any linting issues
- [ ] Run Prettier: `npm run format`
- [ ] Add any missing DTOs
- [ ] Add any missing tests

### Documentation
- [ ] Update README.md
- [ ] Update .docs/ARCHITECTURE.md (create if missing)
- [ ] Update CLAUDE.md with new structure
- [ ] Create domain-specific READMEs
- [ ] Update Swagger descriptions

### CI/CD
- [ ] Verify CI pipeline still works
- [ ] Update build scripts if needed
- [ ] Update deployment scripts
- [ ] Update Docker build (if paths changed)

### Team
- [ ] Present new structure to team
- [ ] Create domain ownership matrix
- [ ] Update team documentation
- [ ] Schedule architecture review meeting

---

## Appendix A: Automated Migration Script

```typescript
// scripts/migrate-to-domains.ts
import * as fs from 'fs';
import * as path from 'path';

interface FileMoveMapping {
  from: string;
  to: string;
}

const moves: FileMoveMapping[] = [
  // Fleet
  {
    from: 'src/api/drivers/drivers.controller.ts',
    to: 'src/domains/fleet/drivers/controllers/drivers.controller.ts',
  },
  // ... (rest of mappings from section 6)
];

function moveFile(from: string, to: string): void {
  const fromPath = path.join(__dirname, '..', from);
  const toPath = path.join(__dirname, '..', to);

  // Create directory if not exists
  fs.mkdirSync(path.dirname(toPath), { recursive: true });

  // Move file
  fs.renameSync(fromPath, toPath);

  console.log(`Moved: ${from} -> ${to}`);
}

function updateImports(filePath: string, oldPath: string, newPath: string): void {
  // Read file
  const content = fs.readFileSync(filePath, 'utf8');

  // Replace imports
  const updated = content.replace(
    new RegExp(oldPath.replace(/\//g, '\\/'), 'g'),
    newPath,
  );

  // Write back
  fs.writeFileSync(filePath, updated, 'utf8');

  console.log(`Updated imports in: ${filePath}`);
}

async function main() {
  console.log('Starting migration...');

  // Phase 1: Create directory structure
  console.log('\nPhase 1: Creating directory structure...');
  // ... (create directories)

  // Phase 2: Move files
  console.log('\nPhase 2: Moving files...');
  moves.forEach((move) => moveFile(move.from, move.to));

  // Phase 3: Update imports
  console.log('\nPhase 3: Updating imports...');
  // ... (update imports in all TypeScript files)

  console.log('\nMigration complete!');
  console.log('Next steps:');
  console.log('1. Run: npm run build');
  console.log('2. Run: npm run test');
  console.log('3. Run: npm run start:dev');
  console.log('4. Manually test API endpoints');
}

main().catch(console.error);
```

---

## Appendix B: Import Update Script

```bash
#!/bin/bash
# scripts/update-imports.sh

# Update Prisma imports
find src -type f -name "*.ts" -exec sed -i '' \
  's|from '"'"'../../prisma/prisma.service'"'"'|from '"'"'../../infrastructure/database/prisma.service'"'"'|g' {} +

find src -type f -name "*.ts" -exec sed -i '' \
  's|from '"'"'../prisma/prisma.service'"'"'|from '"'"'../infrastructure/database/prisma.service'"'"'|g' {} +

# Update PrismaModule imports
find src -type f -name "*.ts" -exec sed -i '' \
  's|from '"'"'../../prisma/prisma.module'"'"'|from '"'"'../../infrastructure/database/prisma.module'"'"'|g' {} +

echo "Import updates complete!"
```

---

## Conclusion

This refactoring plan provides a comprehensive path to transform the SALLY backend into a clean, domain-driven architecture that follows NestJS best practices. The migration is designed to be:

- **Safe**: Zero API breaking changes
- **Incremental**: Can be done in phases
- **Parallelizable**: Multiple developers can work simultaneously
- **Testable**: Validation at each step
- **Reversible**: Clear rollback plan

By following this plan, the SALLY backend will be:
- Easier to maintain
- Easier to scale (both code and team)
- Easier to test
- Easier to understand
- Ready for microservices extraction (if needed)

The investment of 3-4 developer days will pay dividends in reduced maintenance costs, faster feature development, and better code quality for years to come.
