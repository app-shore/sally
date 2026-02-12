# Command Center Design

**Date:** 2026-02-07
**Status:** Design
**Audience:** Engineering + Product

---

## Overview

The Command Center (`/dispatcher/overview`) is the dispatcher's primary operational screen — the first thing they see when they log in and the screen they return to throughout the day. It answers three questions at a glance:

1. **Are we on time?** (KPI strip)
2. **Which routes need attention?** (Active Routes feed)
3. **What do I need to act on?** (Alert feed + Quick Actions)

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  KPI STRIP                                                      │
│  [Active Routes] [On-Time %] [HOS Compliance] [Alerts] [Resp.]  │
├───────────────────────────────────┬─────────────────────────────┤
│                                   │                             │
│  ACTIVE ROUTES FEED (2/3)         │  RIGHT PANEL (1/3)          │
│                                   │                             │
│  Filter: All | At Risk | On Time  │  ┌─────────────────────┐   │
│                                   │  │  ALERT FEED          │   │
│  ┌─────────────────────────────┐  │  │  Top 5 alerts        │   │
│  │ Route Card                  │  │  │  sorted by priority  │   │
│  │ Driver · Vehicle            │  │  │  [Ack] [Resolve]     │   │
│  │ ████████░░░ 6/9 stops       │  │  │  → View All          │   │
│  │ Next: Dallas · ETA 2:45 PM  │  │  └─────────────────────┘   │
│  │ HOS: ██████░░ 6.2h left     │  │                             │
│  │ ⚠ 1 alert                  │  │  ┌─────────────────────┐   │
│  └─────────────────────────────┘  │  │  QUICK ACTIONS       │   │
│                                   │  │  → Plan New Route    │   │
│  ┌─────────────────────────────┐  │  │  → Unassigned Loads  │   │
│  │ Route Card (at risk)        │  │  │  → Drivers Available │   │
│  │ ...                         │  │  └─────────────────────┘   │
│  └─────────────────────────────┘  │                             │
│                                   │  ┌─────────────────────┐   │
│  ┌─────────────────────────────┐  │  │  SHIFT NOTES         │   │
│  │ Route Card (on time)        │  │  │  + Add note           │   │
│  │ ...                         │  │  │  "Driver Smith at..." │   │
│  └─────────────────────────────┘  │  │  "Customer ABC..."    │   │
│                                   │  └─────────────────────┘   │
├───────────────────────────────────┴─────────────────────────────┤
│  HOS DRIVER STRIP                                               │
│  "12 drivers active · 2 approaching HOS limit"                  │
│  [JS ██░ 2.1h] [MK █████ 8.3h] [TP ████░ 6.0h] [RD █░ 0.8h]  │
│  (sorted by hours remaining — lowest first)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Section 1: KPI Strip

Five compact stat cards in a horizontal row.

| Metric | Source (Mock) | Source (Real) | Display |
|--------|--------------|---------------|---------|
| Active Routes | Mock count | `routes` table WHERE status = 'in_progress' | Number (e.g., "8") |
| On-Time % | Mock percentage | Computed from route ETAs vs appointment windows | Percentage with color (green ≥95%, yellow 85-94%, red <85%) |
| HOS Compliance | Mock "0 violations" | `alerts` table WHERE type = 'HOS_VIOLATION' AND status = 'active' | "0 violations" (green) or count (red) |
| Active Alerts | From existing alerts API | Same (already real) | Number, links to `/dispatcher/alerts` |
| Avg Response | From existing alert stats API | Same (already real) | Minutes (e.g., "12 min") |

**Note:** Active Alerts and Avg Response already come from the real alerts API. Only Active Routes, On-Time %, and HOS Compliance need mock data initially.

---

## Section 2: Active Routes Feed

### Route Card Component

Each card represents one active route plan.

```
┌─────────────────────────────────────────────────────────────┐
│  John Smith · TRK-042                          ● In Transit │
│                                                             │
│  ████████████░░░░░░░ 6/9 stops                             │
│                                                             │
│  Next: Stop D (Dallas, TX) · ETA 2:45 PM          On Time  │
│  Final: Stop I (Houston, TX) · ETA 8:30 PM                 │
│                                                             │
│  HOS: ██████████░░░░ 6.2h drive remaining                  │
│                                                             │
│  ⚠ 1 active alert                                         │
└─────────────────────────────────────────────────────────────┘
```

**Fields per route card:**

| Field | Description |
|-------|-------------|
| Driver name | Driver assigned to this route |
| Vehicle ID | Truck/trailer assigned |
| Status | `in_transit`, `at_dock`, `resting`, `completed`, `at_risk` |
| Route progress | Stops completed vs total stops (visual progress bar) |
| Next stop | Name + location + ETA |
| Final destination | Name + location + ETA |
| ETA status | `on_time` (green), `at_risk` (yellow), `late` (red) — based on ETA vs appointment window |
| HOS remaining | Drive hours left as progress bar with numeric value |
| Alert count | Number of active alerts on this route (0 = no badge shown) |

**Sorting:** Routes sorted by urgency score (descending):
1. Routes with `late` ETA status → top
2. Routes with active critical/high alerts → next
3. Routes with `at_risk` ETA → next
4. Routes with low HOS (< 2h remaining) → next
5. Routes `on_time` with no issues → bottom

**Filtering tabs:**
- **All** — every active route
- **At Risk** — late + at_risk + low HOS + has alerts
- **On Time** — everything running smoothly
- **Completed** — finished today (collapsible, less prominent)

### Data Shape

```typescript
interface ActiveRoute {
  route_id: string;
  plan_id: string;
  driver: {
    driver_id: string;
    name: string;
  };
  vehicle: {
    vehicle_id: string;
    identifier: string;  // e.g., "TRK-042"
  };
  status: 'in_transit' | 'at_dock' | 'resting' | 'completed';
  progress: {
    completed_stops: number;
    total_stops: number;
    distance_completed_miles: number;
    total_distance_miles: number;
  };
  next_stop: {
    name: string;
    location: string;      // city, state
    eta: string;           // ISO datetime
    appointment_window?: {
      start: string;
      end: string;
    };
  } | null;
  final_destination: {
    name: string;
    location: string;
    eta: string;
  };
  eta_status: 'on_time' | 'at_risk' | 'late';
  hos: {
    drive_hours_remaining: number;
    duty_hours_remaining: number;
    cycle_hours_remaining: number;
    break_hours_remaining: number;
    status: 'driving' | 'on_duty' | 'sleeper' | 'off_duty';
  };
  active_alert_count: number;
  started_at: string;
  updated_at: string;
}
```

---

## Section 3: Right Panel

### 3A. Alert Feed

Reuse the existing `CompactAlertCard` component from the current command center. Show top 5 active alerts sorted by priority (critical first). Include acknowledge/resolve actions inline.

"View All →" link to `/dispatcher/alerts`.

**No new API needed** — uses existing `GET /api/v1/alerts?status=active&limit=5`.

### 3B. Quick Actions

Three action cards:

| Action | Link | Badge |
|--------|------|-------|
| Plan New Route | `/dispatcher/create-plan` | None |
| Unassigned Loads | `/dispatcher/loads?status=unassigned` (future) | Count of unassigned loads (e.g., "3") |
| Drivers Available | `/dispatcher/fleet?available=true` (future) | Count of available drivers (e.g., "7") |

**Data for badges:**

```typescript
interface QuickActionCounts {
  unassigned_loads: number;
  available_drivers: number;
}
```

### 3C. Shift Notes

Simple note-taking for shift handoffs.

```typescript
interface ShiftNote {
  note_id: string;
  content: string;
  created_by: {
    user_id: string;
    name: string;
  };
  created_at: string;   // ISO datetime
  expires_at: string;   // 24h after creation
  is_pinned: boolean;
}
```

**UI:**
- Text input with "Add Note" button at top
- List of recent notes (max 5 shown) with author + relative timestamp
- Each note has a dismiss/delete action
- Notes auto-expire after 24 hours
- Pinned notes stay until manually dismissed

---

## Section 4: HOS Driver Strip

Compact horizontal strip at the bottom showing all active drivers' HOS status.

### Driver Chip Component

```
┌──────────────────┐
│ JS               │
│ ██████░░ 6.2h    │
│ ● Driving        │
└──────────────────┘
```

**Fields:**
| Field | Description |
|-------|-------------|
| Initials | First letter of first + last name |
| Drive hours bar | Visual progress bar, color-coded |
| Hours value | Numeric drive hours remaining |
| Status dot | Green (driving), Blue (at dock), Gray (resting/off-duty), Red (violation) |

**Color coding for hours bar:**
- Green: 6+ hours remaining
- Yellow: 2-6 hours remaining
- Red: < 2 hours remaining

**Sorting:** By drive hours remaining, ascending (lowest first — most urgent).

**Summary label:** "X drivers active · Y approaching HOS limit" (where approaching = < 2 hours).

### Data Shape

```typescript
interface DriverHOSChip {
  driver_id: string;
  name: string;
  initials: string;
  drive_hours_remaining: number;
  duty_hours_remaining: number;
  status: 'driving' | 'on_duty' | 'sleeper' | 'off_duty';
  vehicle_id: string | null;
  active_route_id: string | null;
}
```

---

## Backend API Endpoints

All new endpoints live in the existing backend domains. Mock data is generated in the service layer and can be swapped for real queries later.

### New Endpoints

#### 1. `GET /api/v1/command-center/overview`

Returns all command center data in a single call (reduces frontend round-trips).

**Response:**

```typescript
interface CommandCenterOverview {
  kpis: {
    active_routes: number;
    on_time_percentage: number;
    hos_violations: number;
    active_alerts: number;          // from real alerts
    avg_response_time_minutes: number; // from real alerts
  };
  active_routes: ActiveRoute[];     // sorted by urgency
  quick_action_counts: {
    unassigned_loads: number;
    available_drivers: number;
  };
  driver_hos_strip: DriverHOSChip[];  // sorted by hours remaining
}
```

**Implementation approach:** Single endpoint that aggregates data from multiple sources. Today, the service generates mock data. Later, it queries routes table, fleet tables, and HOS integration.

**Location:** `apps/backend/src/domains/operations/command-center/`

New module: `CommandCenterModule` with:
- `command-center.controller.ts` — single GET endpoint
- `command-center.service.ts` — aggregation logic
- `command-center.mock.ts` — mock data generators (isolated, easy to remove)
- `command-center.types.ts` — response DTOs

#### 2. `GET /api/v1/command-center/shift-notes`

Returns shift notes for the current tenant.

**Response:**

```typescript
{
  notes: ShiftNote[];
}
```

#### 3. `POST /api/v1/command-center/shift-notes`

Create a new shift note.

**Body:**

```typescript
{
  content: string;
  is_pinned?: boolean;
}
```

#### 4. `DELETE /api/v1/command-center/shift-notes/:noteId`

Dismiss/delete a shift note.

### Why One Aggregated Endpoint?

The `GET /api/v1/command-center/overview` endpoint returns KPIs + routes + driver HOS in one call because:

1. **Performance** — one request instead of 3-4 parallel requests on page load
2. **Consistency** — all data from the same point in time
3. **Simplicity** — frontend has one hook: `useCommandCenterOverview()`
4. **Mock-friendly** — one place to generate all mock data, one place to swap to real

The alerts feed uses the existing `GET /api/v1/alerts` endpoint (already real).

---

## Mock Data Strategy

### Principle

Mock data lives **only in the backend service layer**. The frontend always calls real API endpoints. When real data sources come online, only the service implementation changes.

### Mock Data File: `command-center.mock.ts`

Contains functions that generate realistic, varied mock data:

```typescript
// Generates 8-12 mock active routes with realistic data
export function generateMockActiveRoutes(tenantId: number): ActiveRoute[]

// Generates mock KPIs consistent with the mock routes
export function generateMockKPIs(routes: ActiveRoute[]): KPIs

// Generates mock driver HOS data consistent with the mock routes
export function generateMockDriverHOS(routes: ActiveRoute[]): DriverHOSChip[]

// Generates mock quick action counts
export function generateMockQuickActionCounts(): QuickActionCounts
```

**Mock data characteristics:**
- Uses realistic driver names (Mike Johnson, Sarah Chen, etc.)
- Uses realistic vehicle IDs (TRK-001 through TRK-015)
- Uses real US cities and states for stops
- HOS values are plausible (0.5h to 10.5h remaining)
- Mix of statuses: ~60% on_time, ~25% at_risk, ~15% late
- Mix of driver statuses: ~50% driving, ~20% at dock, ~20% resting, ~10% off-duty
- Route progress varies naturally (some just started, some near completion)
- 2-3 routes should have active alerts for visual interest
- Data regenerates on each call (not cached) to simulate live updates

### Cache with Redis

Use Redis to cache mock data for 30 seconds so repeated page loads/polls get consistent data within a short window, but data refreshes frequently enough to feel live.

```
Key: command-center:overview:{tenantId}
TTL: 30 seconds
```

### Transition Path to Real Data

```
Phase 1 (Now):
  command-center.service.ts → calls command-center.mock.ts

Phase 2 (Monitoring service live):
  command-center.service.ts → queries routes table + fleet tables + HOS integration
  command-center.mock.ts → deleted
```

The service interface never changes. Only the internal implementation swaps.

---

## Frontend Implementation

### New Files

```
apps/web/src/features/operations/command-center/
├── api.ts                    # API client (GET /command-center/overview, shift-notes CRUD)
├── types.ts                  # TypeScript interfaces matching backend DTOs
├── hooks/
│   ├── use-command-center.ts # useCommandCenterOverview() — polls every 30s
│   └── use-shift-notes.ts    # useShiftNotes(), useCreateNote(), useDeleteNote()
└── index.ts                  # barrel export
```

### Page Rewrite

`apps/web/src/app/dispatcher/overview/page.tsx` — complete rewrite using the new layout:

**Components (in the page file or extracted if large):**
- `KPIStrip` — 5 stat cards
- `ActiveRoutesFeed` — filterable route card list
- `RouteCard` — individual route card with progress, HOS, ETA
- `AlertFeedPanel` — reuses existing alert hooks/components
- `QuickActionsPanel` — 3 action links with badges
- `ShiftNotesPanel` — note input + note list
- `HOSDriverStrip` — horizontal scrollable driver chips
- `DriverHOSChip` — individual driver chip

### Polling

- `useCommandCenterOverview()` polls every 30 seconds (matches Redis cache TTL)
- Alerts feed uses existing `useAlerts()` which already polls every 30 seconds
- Shift notes poll every 60 seconds (less time-sensitive)

### Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 768px) | Single column: KPIs (2x2 grid) → Routes → Alerts → Quick Actions → Shift Notes → HOS Strip (horizontal scroll) |
| Tablet (768-1024px) | Two columns but routes take full width above, right panel below |
| Desktop (1024px+) | Full layout as designed: KPIs strip, 2/3 + 1/3 columns, HOS strip |

---

## Shift Notes: Database

Shift notes need a simple database table since they persist across sessions.

```sql
CREATE TABLE shift_notes (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL REFERENCES tenants(id),
  content       TEXT NOT NULL,
  created_by    INTEGER NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at    TIMESTAMPTZ  -- soft delete
);

CREATE INDEX idx_shift_notes_tenant ON shift_notes(tenant_id, deleted_at, expires_at);
```

**This is the only real database table needed for the command center.** Everything else is either mock data (routes, KPIs, driver HOS) or already exists (alerts).

---

## Implementation Plan

### Phase 1: Backend (mock data + shift notes)

1. Create `CommandCenterModule` in `domains/operations/command-center/`
2. Implement mock data generators in `command-center.mock.ts`
3. Implement `GET /api/v1/command-center/overview` returning mock data
4. Create Prisma migration for `shift_notes` table
5. Implement shift notes CRUD endpoints (real, not mock)
6. Add Redis caching for overview endpoint

### Phase 2: Frontend

7. Create `features/operations/command-center/` with types, API client, hooks
8. Rewrite `dispatcher/overview/page.tsx` with new layout
9. Build components: KPIStrip, ActiveRoutesFeed, RouteCard, QuickActionsPanel, ShiftNotesPanel, HOSDriverStrip, DriverHOSChip
10. Wire up polling (30s for overview, 60s for shift notes)
11. Ensure responsive behavior at all breakpoints
12. Verify dark mode compliance

### Phase 3: Connect Real Data (future, when monitoring service is live)

13. Replace mock generators with real DB queries in `command-center.service.ts`
14. Delete `command-center.mock.ts`
15. Connect HOS data from ELD integration
16. Connect route progress from monitoring service

---

## What's NOT in the Command Center

These are deliberate exclusions to keep the page focused:

| Feature | Why excluded | Where it lives instead |
|---------|-------------|----------------------|
| Fleet map | No real GPS data yet; adds complexity without real value in mock | Phase 2 feature, own page or overlay |
| Analytics/charts | Not needed at operational glance | `/dispatcher/analytics` |
| Alert history | Not needed for current shift | `/dispatcher/alerts` → History tab |
| Route creation | Workflow, not monitoring | `/dispatcher/create-plan` |
| Driver management | Configuration, not operations | `/dispatcher/fleet` |
| Settings | Configuration | `/settings/*` |
