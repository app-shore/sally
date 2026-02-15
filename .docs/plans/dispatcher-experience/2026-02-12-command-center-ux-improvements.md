# Command Center UX Improvements

**Date:** February 12, 2026
**Type:** UX Refinement
**Status:** Implemented

---

## Context

Following the dispatcher experience consolidation (Command Center became THE operational hub), a UX review identified several improvements for the route monitoring experience.

## Changes

### 1. Remove HOS Driver Strip

The horizontal strip of driver initials + HOS bars is removed. Rationale:
- Every route card already shows `HOS Xh` with color coding (red <2h, yellow 2-6h, green >6h)
- The strip pushes route cards below the fold (~80px wasted)
- For HOS-critical situations, the red text on route cards is more actionable than a tiny bar chart

### 2. Add Load Reference Number to Route Cards

Load # leads row 1 of each route card:

```
LD-1042 · Maria Garcia · TRK-004       ● In Transit
📍 San Antonio Yard                          Late
  San Antonio, TX · ETA 7:22 PM
2/10 stops · 120/600 mi · HOS 7.4h · ⚠ 2
```

- Load # in mono font, muted color — it's an identifier, not emphasis
- Gracefully hidden when `route.load` is null (no load assigned)
- `ActiveRoute.load` type already added: `{ load_id, reference_number, customer_name } | null`

### 3. Search Box for Route Filtering

Small search input inline with "Active Routes" heading:
- Placeholder: "Search driver, load, location..."
- Filters cards in real-time by: driver name, vehicle ID, load reference, next stop name/location
- Position: between heading and filter tabs

### 4. Slim Filter Tabs (Already Done)

Reduced from 4 tabs (All | At Risk | On Time | Completed) to 2 (All | At Risk).
- "All" shows active routes (excludes completed)
- "At Risk" filters to problem routes (late, at_risk ETA, low HOS, alerts)

### 5. Fix Late Badge Readability (Already Done)

- `variant="destructive"` provides red background + white text
- Removed additional red text class that made it illegible

### 6. Update Backend Mock Data

Add mock load data to `generateMockActiveRoutes()` so load # appears in development.

## Files to Modify

- `apps/web/src/app/dispatcher/command-center/page.tsx` — remove HOS strip, add load # to cards, add search
- `apps/web/src/features/operations/command-center/types.ts` — load field already added
- `apps/backend/src/domains/operations/command-center/mock.dataset.ts` — add mock load data

## Out of Scope

- Customer name on route cards (goes in detail sheet)
- Real load data from database (backend integration — separate effort)
- HOS warning banner (future: show when driver approaches limit)
