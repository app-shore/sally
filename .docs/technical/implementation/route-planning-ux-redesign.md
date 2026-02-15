# Route Planning UX Redesign — Implementation Summary

> **Date:** February 14, 2026
> **Branch:** `feature/route-planning-ux-redesign`
> **PR:** #27

## Overview

Complete redesign of the route planning frontend UX with a three-page architecture (list → create → detail), segment-driven timeline with HOS visualization, and SALLY decision transparency.

## Architecture

### Three-Page Flow

```
/dispatcher/plans           → Plans list (status filtering, overview cards)
/dispatcher/plans/create    → Create plan form (reuses existing form components)
/dispatcher/plans/[planId]  → Plan detail (timeline, HOS, map, SALLY decisions)
```

All pages keep the sidebar visible (decided against full-page layout after UX review).

### Page Layouts

- **Plans List:** Full-width within sidebar layout, status tab filtering
- **Create Plan:** Full-width, `max-w-3xl` form card, two-phase (form → planning animation)
- **Plan Detail:** Full-width, no `max-w` constraint — uses full content area

## Components

### Plan Detail Page Components

| Component | File | Purpose |
|-----------|------|---------|
| `PlanHeader` | `[planId]/components/PlanHeader.tsx` | Unified context card: back nav, plan ID, status, activate button, driver/vehicle/departure/priority with icons, preference pills, stats strip |
| `RouteGlance` | `[planId]/components/RouteGlance.tsx` | Horizontal node path showing all stops with drive time/distance between nodes, staggered fade-in |
| `SegmentTimeline` | `[planId]/components/SegmentTimeline.tsx` | Flat segment list with vertical timeline line, time column, icons, HOS bars, SALLY reasoning |
| `HOSProgressBars` | `[planId]/components/HOSProgressBars.tsx` | Drive/Duty/Break/Cycle bars with color warnings, reset states for rest/break segments |
| `SallyDecisions` | `[planId]/components/SallyDecisions.tsx` | HOS compliance, rest reasoning, fuel details per station, compliance report rules, weather alerts |
| `LoadDetails` | `[planId]/components/LoadDetails.tsx` | Load cards showing load number, status, customer, commodity, weight, pieces, stops route, rate |

### Key UX Decisions

1. **Conditional HOS bars** — Full bars shown only when any clock is ≥50% used OR at rest/break segments. Otherwise shows compact one-liner "HOS: Xh drive available" (`isHOSMeaningful()` + `HOSSummary`)
2. **"Final stop" vs "Route complete"** — Shows "Final stop" for draft/active plans, "Route complete" only when `planStatus === "completed"`
3. **Sidebar always visible** — User decided to keep sidebar on all pages (no full-page layout)
4. **3-column bottom grid** — Map placeholder gets `lg:col-span-2`, SALLY decisions gets 1 column
5. **Timeline line** — `w-0.5 bg-border` absolute positioned per segment element, icons get `relative z-10` to sit on top

### Type Extensions

Added to `types.ts`:
- `HOSState`: `cycleDaysData`, `splitRestState`
- `RoutePlanResult`: `driver`, `vehicle`, `dispatcherParams`, `optimizationPriority`, `loads`
- `RouteSegment`: `fuelStateAfter`
- New type: `RoutePlanLoad` with nested `load` containing customer info, stops, commodity

### Navigation Updates

- Sidebar: "Plan Route" → "Route Plans" at `/dispatcher/plans`
- Loads page: Plan Route link → `/dispatcher/plans/create?load_id=...`
- Command center: Plan Route → `/dispatcher/plans/create`
- Command palette: Plan Route → `/dispatcher/plans/create`

## File Structure

```
apps/web/src/app/dispatcher/plans/
├── page.tsx                          # Plans list with status tabs
├── create/
│   └── page.tsx                      # Create plan form
└── [planId]/
    ├── page.tsx                      # Plan detail page
    └── components/
        ├── PlanHeader.tsx            # Context card + stats strip
        ├── RouteGlance.tsx           # Horizontal node path
        ├── SegmentTimeline.tsx       # Segment timeline with HOS
        ├── HOSProgressBars.tsx       # HOS bar visualization
        ├── SallyDecisions.tsx        # SALLY decision summary
        └── LoadDetails.tsx           # Load/customer details
```

## Hooks Used

- `useRoutePlans(filter?)` — List plans with optional status filter
- `useRoutePlan(planId)` — Get single plan with all segments
- `usePlanRoute()` — Create new route plan (mutation)
- `useActivateRoute()` — Activate a draft plan (mutation)

## Known Issues

- Hydration warning may occur from `Date.toLocaleTimeString` — all pages are `"use client"` so data loads client-side only
- Backend build failure in worktree was pre-existing (from money module merge), not caused by these changes
