# Reference Data Service — Design

**Date:** 2026-02-13
**Status:** Approved
**Scope:** Database-backed reference data service under platform domain, replacing hardcoded UI lookups

---

## Problem

All reference data (equipment types, US states, vehicle statuses, driver statuses) is hardcoded in multiple frontend components with:
- No API endpoint to serve lookup values
- Duplicated arrays across fleet page, loads page, and selectors
- Inconsistent formatting (loads use `dry_van`, fleet uses `DRY_VAN`)
- No single source of truth — adding a new equipment type requires editing multiple files

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Global (not tenant-specific) | Same reference data for all tenants. Simpler, fits POC. |
| Storage | Database table | Single source of truth, queryable, can update without code deploys |
| Domain | `platform/reference-data/` | Platform already has settings, feature flags — shared infrastructure |
| Table design | Generic table + keep Prisma enums | DB enums enforce validity. Reference table provides display metadata. |
| Metadata | JSON field for description/icon/color | Flexible, no schema changes for new metadata attributes |

---

## Data Model

### Prisma: `ReferenceData`

```prisma
model ReferenceData {
  id        Int      @id @default(autoincrement())
  category  String   @db.VarChar(50)   // "equipment_type", "vehicle_status", "us_state"
  code      String   @db.VarChar(50)   // "DRY_VAN", "TX", "AVAILABLE"
  label     String   @db.VarChar(100)  // "Dry Van", "Texas", "Available"
  sortOrder Int      @default(0) @map("sort_order")
  isActive  Boolean  @default(true) @map("is_active")
  metadata  Json?                      // { color, description, icon, ... }
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([category, code])
  @@index([category, isActive])
  @@map("reference_data")
}
```

Prisma enums (`VehicleStatus`, `EquipmentType`, etc.) remain for DB-level constraint enforcement.

### Seed Data Categories

| Category | Entries | Metadata examples |
|----------|---------|-------------------|
| `equipment_type` | DRY_VAN, FLATBED, REEFER, STEP_DECK, POWER_ONLY, OTHER | `{}` |
| `vehicle_status` | AVAILABLE, ASSIGNED, IN_SHOP, OUT_OF_SERVICE | `{ "color": "green" }` |
| `us_state` | All 50 states | `{ "abbreviation": "TX" }` (code=TX, label=Texas) |
| `driver_status` | PENDING_ACTIVATION, ACTIVE, INACTIVE, SUSPENDED | `{ "color": "green" }` |

---

## API

### Endpoint

```
GET /api/v1/reference-data                              → all categories grouped
GET /api/v1/reference-data?category=equipment_type       → single category
GET /api/v1/reference-data?category=equipment_type,us_state → multiple categories
```

No auth required (reference data is non-sensitive).

### Response

```json
{
  "equipment_type": [
    { "code": "DRY_VAN", "label": "Dry Van", "sort_order": 1, "metadata": {} },
    { "code": "FLATBED", "label": "Flatbed", "sort_order": 2, "metadata": {} }
  ],
  "vehicle_status": [
    { "code": "AVAILABLE", "label": "Available", "sort_order": 1, "metadata": { "color": "green" } }
  ]
}
```

### Caching

In-memory cache (Map with 5-minute TTL). Invalidated on server restart. No Redis needed.

---

## Backend Structure

```
apps/backend/src/domains/platform/reference-data/
  ├── reference-data.module.ts
  ├── reference-data.controller.ts
  ├── reference-data.service.ts
  └── dto/
      └── query-reference-data.dto.ts
```

Register in `PlatformModule`.

---

## Frontend Structure

```
apps/web/src/features/platform/reference-data/
  ├── api.ts                          // GET /reference-data
  ├── types.ts                        // ReferenceItem, ReferenceDataMap
  ├── hooks/
  │   └── use-reference-data.ts       // React Query hook, staleTime: 5min
  └── index.ts                        // barrel exports
```

### Hook API

```typescript
const { data, isLoading } = useReferenceData(['equipment_type', 'us_state']);
// data.equipment_type → [{ code, label, sort_order, metadata }]
// data.us_state → [{ code, label, sort_order, metadata }]
```

### UI Changes

| Component | Current | After |
|-----------|---------|-------|
| VehicleForm `equipmentTypes` | Hardcoded array | `useReferenceData('equipment_type')` |
| VehicleForm `usStates` | Hardcoded array | `useReferenceData('us_state')` |
| VehicleStatusBadge | Hardcoded switch colors | Read color from `vehicle_status` metadata |
| formatEquipmentType | Hardcoded labels map | Read label from `equipment_type` data |
| LoadForm `US_STATES` | Hardcoded array | `useReferenceData('us_state')` |
| LoadForm equipment types | Hardcoded `<SelectItem>` | `useReferenceData('equipment_type')` |

---

## Migration & Seed Strategy

1. Create `reference_data` table via Prisma migration
2. Create seed file: `prisma/seeds/05-reference-data.seed.ts`
3. Seed populates all 4 categories with initial data
4. Future categories added by creating new seed entries — no schema change needed

---

## Future Extensibility

Adding a new reference data category (e.g., `trailer_type`, `load_status`, `currency`):
1. Add seed entries for the new category
2. (Optional) Add Prisma enum if DB constraint needed
3. Frontend calls `useReferenceData('new_category')` — no new API endpoint needed

---

## What This Does NOT Cover

- Admin UI to manage reference data (future — add PUT endpoint when needed)
- Tenant-specific overrides (future — add `tenantId` column if needed)
- i18n/localization (future — add `locale` column if needed)
