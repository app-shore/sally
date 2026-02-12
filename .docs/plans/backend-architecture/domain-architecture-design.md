# Backend Domain-Driven Architecture Design

> **Status:** ✅ Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-05-backend-domain-architecture-review.md`, `2026-02-05-architecture-refactor-final.md`, `2026-02-05-architecture-complete.md`, `2026-02-05-architecture-audit-cleanup.md`

---

## 1. Overview

The SALLY NestJS backend follows a **Domain-Driven Design (DDD)** architecture, organizing all business logic into bounded domain contexts with a clean separation between business domains, infrastructure services, shared utilities, and cross-cutting concerns.

### Key Architectural Decisions

1. **Infrastructure at root level** -- not inside domains. Database, cache, notification, retry, etc. are shared utilities used BY domains.
2. **Integrations as a business domain** -- manages external system relationships (TMS, ELD, fuel, weather) with sync, adapters, and credentials.
3. **Notification in infrastructure** -- cross-cutting concern used by multiple domains.
4. **Auth at root level** -- cross-cutting authentication/authorization concern.
5. **Shared abstractions** -- BaseTenantController, ExternalSourceGuard, HttpExceptionFilter eliminate code duplication.

---

## 2. Architecture Diagram

```
src/
├── app.module.ts                     # Clean root module (5 domain imports)
├── main.ts
│
├── auth/                             # Cross-cutting: Authentication & Authorization
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   └── session.controller.ts
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
│   └── auth.module.ts
│
├── infrastructure/                   # Shared Infrastructure (Root Level)
│   ├── database/                     # Prisma ORM (single source of truth)
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   ├── cache/                        # Redis
│   │   └── cache.module.ts
│   ├── notification/                 # Email/SMS/Push (@Global)
│   │   ├── services/
│   │   │   └── email.service.ts
│   │   ├── dto/
│   │   └── notification.module.ts
│   ├── retry/                        # Retry utility
│   │   └── retry.module.ts
│   ├── jobs/                         # Background jobs
│   │   └── auto-sync.job.ts
│   ├── mock/                         # Mock data layer
│   │   ├── mock.config.ts            # MOCK_MODE flag
│   │   └── mock.dataset.ts           # All mock entities
│   ├── push/                         # Web Push notifications
│   ├── sms/                          # SMS notifications (Twilio)
│   ├── sse/                          # Server-Sent Events
│   └── websocket/                    # WebSocket (Socket.io)
│
├── domains/                          # Business Domains
│   ├── fleet/                        # Fleet Management Domain
│   ├── routing/                      # Route Planning & Optimization Domain
│   ├── operations/                   # Operations Management Domain
│   ├── platform/                     # Platform Services Domain
│   └── integrations/                 # External Integrations Domain
│
├── shared/                           # Shared Utilities
│   ├── base/
│   │   └── base-tenant.controller.ts # Eliminates tenant validation duplication
│   ├── guards/
│   │   └── external-source.guard.ts  # Prevents external-source modification
│   ├── filters/
│   │   └── http-exception.filter.ts  # Centralized error handling
│   ├── utils/
│   │   ├── validators.ts
│   │   ├── distance-calculator.ts
│   │   ├── data-sources.ts
│   │   └── id-generator.ts
│   └── shared.module.ts              # @Global module
│
├── health/                           # Health check endpoint
│   └── health.controller.ts
│
└── config/                           # Configuration
    └── configuration.ts
```

---

## 3. Domain Details (Validated Against Code)

### 3.1 Fleet Domain (`domains/fleet/`)

Manages drivers, vehicles, loads, and customers.

```
fleet/
├── fleet.module.ts           # Aggregate module
├── drivers/
│   ├── drivers.module.ts
│   ├── controllers/          # @Controller('drivers')
│   ├── services/
│   │   ├── drivers.service.ts
│   │   └── drivers-activation.service.ts
│   ├── dto/
│   └── __tests__/
├── vehicles/
│   ├── vehicles.module.ts
│   ├── controllers/          # @Controller('vehicles')
│   ├── services/
│   ├── dto/
│   └── __tests__/
├── loads/
│   ├── loads.module.ts
│   ├── controllers/          # @Controller('loads')
│   ├── services/
│   └── dto/
└── customers/                # Added post-migration (undocumented in original plans)
    ├── customers.module.ts
    ├── controllers/
    └── services/
```

**Note:** The `customers` sub-module was added after the original architecture migration and is not documented in the archive plans. **Status: Built (undocumented in original plans).**

### 3.2 Routing Domain (`domains/routing/`)

Complete route planning, optimization, HOS compliance, and external routing/fuel/weather providers.

```
routing/
├── routing.module.ts           # Aggregate module
├── route-planning/
│   ├── route-planning.module.ts
│   ├── controllers/            # @Controller('route-planning')
│   ├── services/
│   │   └── route-planning-engine.service.ts
│   └── dto/
├── hos-compliance/
│   ├── hos-compliance.module.ts
│   └── services/
│       └── hos-rule-engine.service.ts
├── providers/                  # External routing providers (post-migration addition)
│   ├── fuel/
│   │   └── fuel-provider.module.ts
│   ├── routing/
│   │   └── routing-provider.module.ts
│   └── weather/
│       └── weather-provider.module.ts
└── __tests__/
```

**Differences from original plan:**
- The `optimization/` and `prediction/` sub-modules from the original plan are **not present** in current code. These may have been consolidated into `route-planning/` or removed.
- `providers/` directory with fuel, routing, and weather sub-modules was **added post-migration**. **Status: Built (not in original plan).**

### 3.3 Operations Domain (`domains/operations/`)

Alerts, command center, monitoring, and notifications.

```
operations/
├── operations.module.ts        # Aggregate module
├── alerts/
│   ├── alerts.module.ts
│   ├── services/
│   │   └── alert.module.ts
│   └── dto/
├── command-center/             # Post-migration addition
│   ├── command-center.module.ts
│   └── dto/
├── monitoring/
│   ├── monitoring.module.ts
│   ├── services/
│   ├── dto/
│   └── __tests__/
└── notifications/              # Post-migration addition
    └── notifications.module.ts
```

**Differences from original plan:**
- `command-center/` and `notifications/` sub-modules are **post-migration additions not in original plans**.
- Original plan only had `alerts/` under operations.

### 3.4 Platform Domain (`domains/platform/`)

Multi-tenancy, users, preferences, feature flags, onboarding, settings, API keys, and Sally AI.

```
platform/
├── platform.module.ts          # Aggregate module
├── tenants/
│   ├── tenants.module.ts
│   ├── tenants.controller.ts
│   ├── tenants.service.ts
│   └── dto/
├── users/
│   ├── users.module.ts
│   └── dto/
├── user-invitations/
│   ├── user-invitations.module.ts
│   └── dto/
├── feature-flags/
│   ├── feature-flags.module.ts
│   ├── feature-flags.controller.ts
│   ├── feature-flags.service.ts
│   └── dto/
├── onboarding/
│   ├── onboarding.module.ts
│   └── dto/
├── api-keys/                   # Post-migration addition
│   ├── api-keys.module.ts
│   ├── decorators/
│   ├── dto/
│   └── guards/
├── sally-ai/                   # Post-migration addition
│   ├── sally-ai.module.ts
│   ├── dto/
│   └── engine/
└── settings/                   # Post-migration addition
    ├── settings.module.ts
    └── dto/
```

**Differences from original plan:**
- `api-keys/`, `sally-ai/`, and `settings/` are **post-migration additions**.
- `preferences/` from the original plan is **not present** in current code (may have been replaced by `settings/`).

### 3.5 Integrations Domain (`domains/integrations/`)

External system integrations with TMS, ELD, fuel, and weather providers.

```
integrations/
├── integrations.module.ts
├── adapters/
│   ├── adapters.module.ts
│   ├── eld/
│   │   └── samsara-eld.adapter.ts
│   ├── fuel/
│   │   └── gasbuddy-fuel.adapter.ts
│   ├── tms/
│   │   ├── mcleod-tms.adapter.ts
│   │   └── project44-tms.adapter.ts (inferred)
│   └── weather/
│       └── openweather.adapter.ts
├── sync/
│   ├── sync.module.ts
│   ├── matching/
│   │   ├── driver-matcher.ts
│   │   └── vehicle-matcher.ts
│   ├── merging/
│   └── __tests__/
├── credentials/
├── services/
│   └── integration-manager (inferred)
├── dto/
└── __tests__/
```

**Adapter Status (from audit):**

| Adapter | Type | Status | Mock Mode |
|---------|------|--------|-----------|
| SamsaraELDAdapter | ELD | Active | Real API |
| Project44TMSAdapter | TMS | Active | Mock |
| McLeodTMSAdapter | TMS | Registered | Mock |
| GasBuddyFuelAdapter | Fuel | Registered | Mock |
| OpenWeatherAdapter | Weather | Registered | Mock |

---

## 4. AppModule (Validated)

The actual `app.module.ts` imports:

```typescript
@Module({
  imports: [
    // Core configuration
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    SharedModule,
    CacheModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    NotificationModule,
    SseModule,
    PushModule,
    SmsModule,
    WebSocketModule,

    // 5 Domain Modules
    FleetModule,
    PlatformModule,
    IntegrationsModule,
    OperationsModule,
    RoutingModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  controllers: [
    HealthController,  // Only 1 controller in AppModule
  ],
})
export class AppModule {}
```

**Differences from original plan:**
- **TestingModule is no longer imported** -- the testing/scenarios/mock domains are gone from AppModule.
- **SseModule, PushModule, SmsModule, WebSocketModule** are new infrastructure modules not in the original plan.
- **DynamicUpdateHandlerService** is no longer a loose provider in AppModule (migrated or removed).
- **SessionController** is no longer in AppModule controllers (migrated to auth module or removed).
- The original 6 domain modules are now **5** (no TestingModule visible).

---

## 5. Dependency Flow

```
AppModule
    ├── Infrastructure (PrismaModule, CacheModule, NotificationModule, SseModule, PushModule, SmsModule, WebSocketModule)
    ├── Auth (AuthModule -- guards, strategies, decorators)
    ├── Shared (SharedModule -- base controllers, guards, filters)
    └── Domains
        ├── FleetModule (drivers, vehicles, loads, customers)
        ├── RoutingModule (route-planning, hos-compliance, providers)
        ├── OperationsModule (alerts, command-center, monitoring, notifications)
        ├── PlatformModule (tenants, users, invitations, feature-flags, api-keys, sally-ai, settings, onboarding)
        └── IntegrationsModule (adapters, sync, credentials)
```

**Dependency direction:** Domains depend on Infrastructure and Shared. Infrastructure does not depend on domains. No circular dependencies.

---

## 6. Key Design Patterns

### BaseTenantController
Eliminates 31+ instances of duplicate tenant validation. All domain controllers extend this base class.

```typescript
export class DriversController extends BaseTenantController {
  async listDrivers(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user); // ONE LINE
    return this.driversService.findAll(tenantDbId);
  }
}
```

### ExternalSourceGuard
Prevents modification of externally-synced resources. Replaces duplicated `validateNotExternal()` methods.

```typescript
@Put(':driver_id')
@UseGuards(ExternalSourceGuard)
@ExternalSourceCheck('driver')
async updateDriver(...) { /* Guard already validated */ }
```

### HttpExceptionFilter
Global exception filter centralizing error handling across 65+ controller methods. Provides consistent error response format and automatic logging.

### Global Guards
Applied to ALL routes by default via AppModule providers:
- **JwtAuthGuard** -- JWT token validation
- **TenantGuard** -- Multi-tenant isolation
- **RolesGuard** -- Role-based access control

Use `@Public()` decorator to skip authentication on specific endpoints.

---

## 7. Current State Summary

| Aspect | Plan | Actual | Notes |
|--------|------|--------|-------|
| Domain count | 6 (fleet, routing, operations, platform, integrations, testing) | 5 (fleet, routing, operations, platform, integrations) | TestingModule not in AppModule |
| Fleet sub-modules | 3 (drivers, vehicles, loads) | 4 (drivers, vehicles, loads, customers) | customers added post-migration |
| Routing sub-modules | 4 (route-planning, optimization, hos-compliance, prediction) | 3 (route-planning, hos-compliance, providers) | optimization/prediction removed or consolidated; providers added |
| Operations sub-modules | 1 (alerts) | 4 (alerts, command-center, monitoring, notifications) | 3 new sub-modules added |
| Platform sub-modules | 6 (tenants, users, invitations, preferences, feature-flags, onboarding) | 8 (tenants, users, invitations, feature-flags, onboarding, api-keys, sally-ai, settings) | preferences removed; 3 new added |
| Infrastructure modules | 5 (database, cache, notification, retry, jobs) | 9 (database, cache, notification, retry, jobs, mock, push, sms, sse, websocket) | 4 new infra modules |
| Duplicate Prisma service | Fixed | Confirmed fixed | Single source in infrastructure/database/ |
| Shared abstractions | BaseTenantController, ExternalSourceGuard, HttpExceptionFilter | Confirmed present | All in shared/ |
| Build status | Clean | Confirmed clean | pnpm run build succeeds |
