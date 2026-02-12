# Route Planning UI - Implementation

> **Status:** ⚠️ Partial | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-11-route-planning-ui-implementation.md`

---

## Overview

SALLY's flagship route planning UI: a single-screen, timeline-first experience that takes dispatchers from load selection to an activated, HOS-compliant route in under 60 seconds. Two-phase single page: Phase 1 centered form, Phase 2 route result display.

**Design Doc:** `route-planning-ui-design.md` (in same directory)

---

## Architecture

### Two-Phase Page Design

**Phase 1 (Form):** Centered form with load picker, driver/vehicle selectors, departure time, optimization priority.

**Phase 2 (Result):** Replaces form with route result: summary stats, HOS compliance card, segment timeline grouped by day, action buttons (activate/cancel).

### Tech Stack
- Next.js 15 (App Router), React Query, Zustand auth
- Shadcn/ui components, Tailwind CSS, Lucide icons

---

## File Structure

### API Layer (Validated)

```
apps/web/src/features/routing/route-planning/
├── types.ts                                # Request/response types
├── api.ts                                  # routePlanningApi client
├── hooks/use-route-planning.ts            # React Query hooks
└── index.ts                                # Barrel exports
```

**Validated types include:**
- `CreateRoutePlanRequest` - driverId, vehicleId, loadIds, departureTime, optimizationPriority, dispatcherParams
- `RoutePlanResult` - planId, status, isFeasible, segments, complianceReport, dailyBreakdown
- `RouteSegment` - segmentType (drive/rest/fuel/dock/break), timing, HOS state, weather alerts
- `ComplianceReport` - isFullyCompliant, rules array with pass/addressed status

**Validated hooks:**
- `usePlanRoute()` - Mutation for POST /routes/plan
- `useRoutePlans(params)` - Query for GET /routes
- `useRoutePlan(planId)` - Query for GET /routes/:planId
- `useActivateRoute()` - Mutation for POST /routes/:planId/activate
- `useCancelRoute()` - Mutation for POST /routes/:planId/cancel

### UI Components

```
apps/web/src/features/routing/route-planning/components/
├── route-planning-form.tsx        # Phase 1: Load picker + selectors
├── route-plan-result.tsx          # Phase 2: Summary + timeline
├── segment-timeline.tsx           # Day-grouped segment cards
├── compliance-card.tsx            # HOS compliance badge + rules
├── load-picker.tsx                # Multi-select load list with checkboxes
└── summary-stats.tsx              # Distance, time, cost cards
```

### Installed Shadcn Components
- `checkbox.tsx` - For load picker multi-select
- `radio-group.tsx` - For optimization priority selector

---

## API Endpoints (Backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/routes/plan` | Plan a new route |
| GET | `/routes` | List route plans |
| GET | `/routes/:planId` | Get specific route plan |
| POST | `/routes/:planId/activate` | Activate a draft route |
| POST | `/routes/:planId/cancel` | Cancel a route plan |

---

## Key Implementation Details

### Load Picker
- Fetches available loads via existing fleet management API
- Multi-select with checkboxes
- Shows load details: origin, destination, time window, weight

### Route Result Display
- Summary stats row: total distance, drive time, trip time, cost estimate
- HOS compliance card: green badge if fully compliant, lists all rules
- Segment timeline: grouped by day, each segment shows type icon, timing, location
- Weather alerts inline on affected segments

### Segment Types & Icons
- `drive` - Truck icon, shows distance and drive time
- `rest` - Moon icon, shows duration and rest type
- `fuel` - Gas pump icon, shows gallons, cost, station name
- `dock` - Building icon, shows customer name, action type
- `break` - Coffee icon, shows duration

---

## Current State

- ✅ API layer complete (types, api client, React Query hooks)
- ✅ Shadcn components installed (checkbox, radio-group)
- ✅ Route planning form with load picker, driver/vehicle selectors
- ⚠️ Route result display (partial - summary stats and timeline built, some refinement needed)
- ⚠️ Compliance card (built but needs polish)
- 🔲 Weather alert inline display on segments
- 🔲 Full E2E testing with backend route planning engine
