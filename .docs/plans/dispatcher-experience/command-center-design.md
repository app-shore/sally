# Command Center - Design

> **Status:** ✅ Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-07-command-center-design.md`

---

## Overview

The Command Center (`/dispatcher/overview`) is the dispatcher's primary operational screen. It answers three questions at a glance:
1. **Are we on time?** (KPI strip)
2. **Which routes need attention?** (Active Routes feed)
3. **What do I need to act on?** (Alert feed + Quick Actions)

---

## Layout Structure

```
+------------------------------------------------------------------+
| KPI STRIP                                                         |
| [Active Routes] [On-Time %] [HOS Compliance] [Alerts] [Resp.]    |
+-----------------------------------+------------------------------+
|                                   |                              |
| ACTIVE ROUTES FEED (2/3)          | RIGHT PANEL (1/3)            |
| Filter: All | At Risk | On Time   |                              |
|                                   | Alert Feed (top 5)           |
| [Route Card]                      | Quick Actions                |
| [Route Card]                      | Shift Notes                  |
| [Route Card]                      |                              |
|                                   |                              |
+-----------------------------------+------------------------------+
| HOS DRIVER STRIP                                                  |
| "12 drivers active - 2 approaching HOS limit"                     |
| [JS 6.2h] [MK 8.3h] [TP 6.0h] [RD 0.8h]                       |
+------------------------------------------------------------------+
```

---

## API Endpoints (Validated against actual code)

### Command Center Controller
File: `apps/backend/src/domains/operations/command-center/command-center.controller.ts`

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/command-center/overview` | Aggregated KPIs + routes + driver HOS | ✅ Built |
| GET | `/command-center/shift-notes` | Shift notes for tenant | ✅ Built |
| POST | `/command-center/shift-notes` | Create shift note | ✅ Built |
| DELETE | `/command-center/shift-notes/:noteId` | Delete shift note | ✅ Built |

---

## Data Models

### CommandCenterOverviewDto (Validated)

```typescript
interface CommandCenterOverviewDto {
  kpis: {
    active_routes: number;
    on_time_percentage: number;
    hos_violations: number;
    active_alerts: number;          // From real alerts API
    avg_response_time_minutes: number; // From real alerts API
  };
  active_routes: ActiveRouteDto[];     // Sorted by urgency
  quick_action_counts: {
    unassigned_loads: number;
    available_drivers: number;
  };
  driver_hos_strip: DriverHOSChipDto[];  // Sorted by hours remaining
}
```

### ActiveRouteDto
Each route card shows: driver, vehicle, status, progress (stops completed/total), next stop with ETA, final destination, ETA status (on_time/at_risk/late), HOS remaining, active alert count.

### DriverHOSChipDto
Compact chip: initials, drive hours bar (green >6h, yellow 2-6h, red <2h), status dot.

### ShiftNoteDto
Fields: noteId, content, created_by (userId + name), created_at, expires_at (24h), is_pinned.

---

## Sections

### Section 1: KPI Strip
Five compact stat cards. Active Alerts and Avg Response use real alerts API. Active Routes, On-Time %, HOS Compliance use mock data initially.

### Section 2: Active Routes Feed
Route cards sorted by urgency score (late > critical alerts > at risk > low HOS > on time). Filtering tabs: All, At Risk, On Time, Completed.

### Section 3: Right Panel
- **Alert Feed:** Top 5 active alerts from existing `GET /api/v1/alerts` endpoint
- **Quick Actions:** Plan New Route, Unassigned Loads, Drivers Available
- **Shift Notes:** CRUD for dispatcher shift handoff notes (24h expiry, pinning)

### Section 4: HOS Driver Strip
Horizontal strip showing all active drivers' HOS. Sorted by drive hours remaining (ascending). Summary label: "X drivers active - Y approaching HOS limit".

---

## Mock Data Strategy

Mock data lives **only in the backend service layer**. Frontend always calls real API endpoints. The `command-center.mock.ts` file generates realistic, varied data. Redis cache (30s TTL) provides consistency within short windows while feeling live.

Mock data characteristics:
- Realistic driver names, vehicle IDs, US cities/states
- Plausible HOS values (0.5h to 10.5h remaining)
- Mix: ~60% on_time, ~25% at_risk, ~15% late
- 2-3 routes with active alerts for visual interest
- Regenerates on each call (not cached permanently)

---

## Backend File Structure (Validated)

```
apps/backend/src/domains/operations/command-center/
├── command-center.controller.ts    # GET overview, CRUD shift notes
├── command-center.service.ts       # Aggregation + mock data
├── command-center.service.spec.ts  # Unit tests
├── command-center.module.ts
├── command-center.types.ts         # All DTOs and interfaces
└── dto/
    └── create-shift-note.dto.ts    # content (1-500 chars), isPinned
```

### Prisma Model: ShiftNote

```prisma
model ShiftNote {
  id          Int      @id @default(autoincrement())
  noteId      String   @unique
  content     String   @db.Text
  isPinned    Boolean  @default(false)
  tenantId    Int
  tenant      Tenant   @relation(...)
  userId      Int
  user        User     @relation(...)
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}
```

---

## Current State

- ✅ Backend CommandCenterModule with controller, service, types, DTOs
- ✅ Mock data generators with realistic fleet data
- ✅ Redis caching (30s TTL) for overview endpoint
- ✅ Shift notes CRUD with Prisma persistence
- ✅ Frontend overview page with KPI strip, route cards, alert feed, shift notes, HOS strip
- ✅ 30-second polling via React Query
- ✅ Responsive layout (2/3 + 1/3 split on desktop, stacked on mobile)
- ✅ Dark theme support throughout
- ✅ Unit tests for service
