# Feature Flags System

> **Status:** ✅ Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-02-feature-flags-coming-soon.md`

---

## 1. Overview

SALLY implements a database-backed feature flag system for controlling visibility of features and enabling gradual rollout. The system consists of:

1. **Prisma schema** -- `FeatureFlag` model in PostgreSQL
2. **Backend API** -- NestJS service and controller for flag management
3. **Seed data** -- 13+ feature flags seeded via the unified seed CLI
4. **Frontend integration** -- Zustand store and React hooks for flag checking (designed in plan)

---

## 2. Data Model (Validated)

The `FeatureFlag` model is present in the Prisma schema at `apps/backend/prisma/schema.prisma` (line 1085):

```prisma
model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique @db.VarChar(100)
  name        String   @db.VarChar(200)
  description String?  @db.Text
  enabled     Boolean  @default(false)
  category    String   @default("general") @db.VarChar(50)  // general | dispatcher | driver | admin
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@index([key])
  @@index([category])
  @@index([enabled])
  @@map("feature_flags")
}
```

**Indexes:** key (unique), category, enabled -- optimized for common query patterns.

---

## 3. Backend API (Validated)

### Files Present

| File | Path | Status |
|------|------|--------|
| Service | `apps/backend/src/domains/platform/feature-flags/feature-flags.service.ts` | ✅ Present |
| Controller | `apps/backend/src/domains/platform/feature-flags/feature-flags.controller.ts` | ✅ Present |
| Module | `apps/backend/src/domains/platform/feature-flags/feature-flags.module.ts` | ✅ Present |
| DTO | `apps/backend/src/domains/platform/feature-flags/dto/feature-flag.dto.ts` | ✅ Present |

### Service Methods (Validated from actual code)

```typescript
@Injectable()
export class FeatureFlagsService {
  constructor(private prisma: PrismaService) {}

  // Get all feature flags, ordered by category
  async getAllFlags(): Promise<FeatureFlagDto[]>

  // Get specific flag by key, returns null if not found
  async getFlagByKey(key: string): Promise<FeatureFlagDto | null>

  // Check if a feature is enabled (returns boolean)
  async isEnabled(key: string): Promise<boolean>

  // Toggle feature flag on/off (admin use)
  async toggleFlag(key: string, enabled: boolean): Promise<FeatureFlagDto>
}
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/feature-flags` | Get all feature flags |
| GET | `/api/v1/feature-flags/:key` | Get specific flag by key |
| PUT | `/api/v1/feature-flags/:key/toggle` | Toggle flag (admin) |

### DTO

```typescript
export class FeatureFlagDto {
  key: string;        // e.g., 'route_planning_enabled'
  name: string;       // e.g., 'Route Planning'
  description?: string;
  enabled: boolean;
  category: string;   // general | dispatcher | driver | admin
}
```

---

## 4. Seed Data (Validated)

Feature flags are seeded via `apps/backend/prisma/seeds/02-feature-flags.seed.ts` as part of the unified seed CLI.

### Flag Categories

**Dispatcher features:**
- `route_planning_enabled` -- Route Planning
- `live_tracking_enabled` -- Live Route Tracking
- `command_center_enabled` -- Dispatcher Command Center
- `alerts_system_enabled` -- Automated Alert System
- `continuous_monitoring_enabled` -- Continuous Monitoring

**Driver features:**
- `driver_dashboard_enabled` -- Driver Dashboard
- `driver_current_route_enabled` -- Driver Current Route View
- `driver_messages_enabled` -- Driver Messages

**Admin features:**
- `external_integrations_enabled` -- External Integrations
- `fleet_management_enabled` -- Fleet Management

**Note:** Additional flags may have been added beyond the original 10. The seed file uses upsert, so it is safe to re-run.

---

## 5. Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Web)                     │
│  ┌──────────────┐  ┌────────────────────────────┐   │
│  │ Zustand Store │  │ useFeatureFlag('key') hook │   │
│  │ featureFlags  │  │ returns: boolean            │   │
│  └──────┬───────┘  └──────────────┬─────────────┘   │
│         │  fetches on app load     │  checks store    │
│         ▼                          │                  │
│  GET /api/v1/feature-flags         │                  │
└─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│                  Backend (NestJS)                     │
│  ┌─────────────────────┐  ┌──────────────────────┐  │
│  │ FeatureFlagsController│ │ FeatureFlagsService  │  │
│  │ GET /feature-flags    │ │ getAllFlags()         │  │
│  │ GET /feature-flags/:k │ │ isEnabled(key)       │  │
│  │ PUT /:key/toggle      │ │ toggleFlag(key, val) │  │
│  └─────────────────────┘  └──────────┬───────────┘  │
│                                       │               │
│                                       ▼               │
│                              ┌────────────────┐      │
│                              │ PostgreSQL      │      │
│                              │ feature_flags   │      │
│                              │ table           │      │
│                              └────────────────┘      │
└─────────────────────────────────────────────────────┘
```

---

## 6. Frontend Integration

### Designed (from plan)

The plan describes a Zustand store + React hook pattern:

```typescript
// useFeatureFlags store
const useFeatureFlagStore = create((set) => ({
  flags: {},
  fetchFlags: async () => {
    const response = await fetch('/api/v1/feature-flags');
    const data = await response.json();
    set({ flags: Object.fromEntries(data.flags.map(f => [f.key, f.enabled])) });
  },
}));

// Hook for checking flags
function useFeatureFlag(key: string): boolean {
  return useFeatureFlagStore(state => state.flags[key] ?? false);
}
```

**Frontend implementation status:** The backend API is implemented and functional. Frontend Zustand store and hook integration should be validated against `apps/web/` code to confirm implementation status.

### Coming Soon Banners (from plan)

The plan describes full-page "Coming Soon" banner components that replace disabled features with marketing content. These banners use the feature flag system to determine visibility.

**Coming Soon banner implementation status:** Should be validated against `apps/web/` components.

---

## 7. Current State

| Component | Status |
|-----------|--------|
| Prisma FeatureFlag model | ✅ Implemented (schema.prisma line 1085) |
| feature_flags table | ✅ Implemented (with 3 indexes) |
| FeatureFlagsService | ✅ Implemented (4 methods) |
| FeatureFlagsController | ✅ Implemented (3 endpoints) |
| FeatureFlagsModule | ✅ Implemented (in platform domain) |
| FeatureFlag DTO | ✅ Implemented |
| Seed data (02-feature-flags.seed.ts) | ✅ Implemented (in unified seed CLI) |
| Frontend Zustand store | Needs validation against web app code |
| Coming Soon banner components | Needs validation against web app code |
