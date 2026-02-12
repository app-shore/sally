# Frontend Performance Optimization

**Status:** Partially implemented (Phase 1 complete, Phases 2-3 intentionally deferred)
**Last validated:** 2026-02-12
**Source plans:** `_archive/2026-02-05-performance-optimization-review.md`, `_archive/2026-02-05-performance-optimization-results.md`, `_archive/2026-02-05-performance-phase1-checklist.md`

---

## Overview

A performance audit identified critical bundle size and rendering issues. Phase 1 (quick wins) was implemented. Phases 2 and 3 were evaluated and intentionally deferred as low-priority.

---

## Audit Findings

### Critical Issues (3)

1. **308KB create-plan route** -- `RoutePlanningCockpit` and all sub-components loaded eagerly in the route planning page, even before user interaction
2. **Recharts not code-split** -- chart library loaded on every page that imported route planning components
3. **Framer-motion on every page** -- motion library included in shared layout components, increasing initial bundle for all routes

### Medium Issues (4)

1. **Zero memoization** -- no `React.memo`, `useMemo`, or `useCallback` on frequently re-rendered components (timelines, lists)
2. **Inline arrow functions in JSX** -- causing unnecessary re-renders in child components
3. **No virtualization** -- long lists (alerts, notifications) rendered all items
4. **React Query config** -- default `staleTime` of 0 caused excessive refetching; `retry` count too high

---

## Phase 1: Quick Wins (Implemented)

### Bundle Size Reduction

**`RoutePlanningCockpit` -- lazy loaded:**
- Changed from static import to `React.lazy()` with `Suspense` wrapper
- Route planning page: **308KB -> 203KB** (-34% reduction)
- `CostsTab` component also lazy loaded (chart-heavy)

### Memoization

- Applied `React.memo` to 3 timeline components (route timeline, HOS timeline, stop timeline)
- Added `useCallback` to event handlers in route planning page
- These components re-rendered on every parent state change; memoization cut unnecessary renders

### React Query Configuration

- `staleTime`: **0 -> 5 minutes** (data doesn't change frequently)
- `retry`: **3 -> 1** (fail fast, show error state)
- `refetchOnWindowFocus`: **true -> false** (prevents jarring reloads)

### Results

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Create-plan route bundle | 308KB | 203KB | -34% |
| Timeline re-renders per interaction | ~12 | ~3 | -75% |
| Network requests on window focus | Unbounded | 0 | Eliminated |

---

## Phase 2: Deferred (Framer-Motion Optimization)

**Decision:** Intentionally skipped.

**Rationale:** Framer-motion is used in landing page animations (CapabilitiesSection, MonitorAnimation, etc.) but not in the core application dashboard. The landing page is a separate entry point, so the motion library does not affect dashboard performance. Splitting it out would add complexity with minimal benefit.

---

## Phase 3: Deferred (Virtualization)

**Decision:** Intentionally skipped.

**Rationale:** Alert and notification lists currently contain fewer than 100 items per page. Virtualization (react-window or similar) adds dependency and complexity that is not justified at current data volumes. Revisit when lists regularly exceed 500 items.

---

## Validation Against Current Code

| Claim | Status |
|-------|--------|
| `RoutePlanningCockpit` lazy loaded | Confirmed (dynamic import in route planning page) |
| `CostsTab` lazy loaded | Confirmed |
| `React.memo` on timeline components | Confirmed |
| `useCallback` on event handlers | Confirmed |
| React Query staleTime set to 5 minutes | Confirmed in query client config |
| Framer-motion removed from dashboard | Not applicable -- was never in dashboard, only landing page |
| Virtualization added | Not implemented (intentionally deferred) |

---

## Recommendations for Future Optimization

1. **Monitor bundle size** -- use `next/bundle-analyzer` periodically to catch regressions
2. **Virtualize long lists** when data volume grows (alerts > 500 items)
3. **Image optimization** -- use `next/image` for all images (currently mixed)
4. **Prefetch routes** -- add `<Link prefetch>` for likely navigation targets in dashboard
