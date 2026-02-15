# Dispatcher Experience Consolidation Plan

**Date:** February 12, 2026
**Type:** UX Simplification & Code Cleanup
**Status:** Implemented

---

## Problem Statement

The dispatcher's post-activation operational experience is fragmented across multiple overlapping pages:

| Page | Shows | Status |
|------|-------|--------|
| Command Center (`/dispatcher/overview`) | KPIs + active routes feed + alerts + HOS + shift notes | Fully built |
| Active Routes (`/dispatcher/active-routes`) | Route cards with progress | **Mock data only** |
| Monitoring (`/dispatcher/monitoring`) | Route health + live trigger feed + pulse strip | Fully built |
| Alerts (`/dispatcher/alerts`) | Full alert management + history | Fully built |
| Analytics (`/dispatcher/analytics`) | Alert-related metrics | Built but hidden |

**Result:** A dispatcher must navigate 3+ pages to understand operational status. "Active routes" information appears in three different places.

---

## Solution: Consolidate to Command Center as THE Operational Hub

### Final Navigation Structure

```
OPERATIONS
  Command Center     → /dispatcher/command-center   (renamed from /overview)
  Loads              → /dispatcher/loads
  Fleet              → /dispatcher/fleet
  Plan Route         → /dispatcher/create-plan

FINANCIALS
  Invoicing          → /dispatcher/invoicing         (placeholder - unchanged)
  Settlements        → /dispatcher/settlements       (placeholder - unchanged)
```

**From 6 operational nav items → 4.**

### What Changes

| Page | Action | Detail |
|------|--------|--------|
| `/dispatcher/overview` | **Rename** → `/dispatcher/command-center` | URL and folder rename. Update all references. |
| `/dispatcher/active-routes` | **Delete** | Remove page, nav item, feature flag (`live_tracking_enabled`), coming soon config. |
| `/dispatcher/monitoring` | **Delete** | Remove page, nav item. Move pulse indicator into Command Center KPI strip. |
| `/dispatcher/analytics` | **Delete** | Remove page and any nav references (already commented out). Future work. |
| `/dispatcher/alerts` | **Keep page, remove from nav** | Accessible via "View All" link in Command Center alert feed. No sidebar entry. |
| `/dispatcher/command-center` | **Enhance** | Add monitoring pulse indicator. Add route detail slide-over panel. |

---

## Detailed Design

### Command Center Layout (Enhanced)

```
┌──────────────────────────────────────────────────────────────────┐
│ [KPI Strip]                                                      │
│ Active Routes │ On-Time % │ HOS Violations │ Alerts │ Avg RT     │
│ ● Monitoring Active · 12 routes · Last cycle 1.2s               │
├──────────────────────────────────────┬───────────────────────────┤
│ ACTIVE ROUTES FEED (2/3)             │ RIGHT PANEL (1/3)         │
│                                      │                           │
│ Filter: All | At Risk | On Time      │ ┌─ Alert Feed ──────────┐ │
│                                      │ │ 🔴 3 active alerts     │ │
│ ┌─ Route Card ──────────────────┐    │ │ [Alert card]           │ │
│ │ Driver · Vehicle · Load #     │    │ │ [Alert card]           │ │
│ │ ━━━━━━━━━━━━━━━━━━━░░░ 73%   │    │ │ [Alert card]           │ │
│ │ Next: Delivery @ Chicago      │    │ │                        │ │
│ │ ETA: On Time · HOS: 4.2h     │    │ │ → View All Alerts      │ │
│ │ ⚠ 1 alert                    │    │ └────────────────────────┘ │
│ │ Click → slide-over detail     │    │                           │
│ └───────────────────────────────┘    │ ┌─ Quick Actions ───────┐ │
│                                      │ │ + Plan Route           │ │
│ ┌─ Route Card ──────────────────┐    │ │ Unassigned Loads (3)   │ │
│ │ ...                           │    │ │ Available Drivers (5)  │ │
│ └───────────────────────────────┘    │ └────────────────────────┘ │
│                                      │                           │
│ ┌─ Driver HOS Strip ───────────┐    │ ┌─ Shift Notes ─────────┐ │
│ │ [Mike 4.2h] [Sarah 6.1h] ... │    │ │ [Note] [Note]          │ │
│ └───────────────────────────────┘    │ │ + Add Note             │ │
│                                      │ └────────────────────────┘ │
└──────────────────────────────────────┴───────────────────────────┘
```

### What Moves From Monitoring → Command Center

| Element | How It Appears in Command Center |
|---------|----------------------------------|
| Pulse strip ("● Monitoring Active · 12 routes · 1.2s") | Compact line below KPI strip |
| Route health indicators (ETA status, HOS remaining) | Already in route cards — ensure SSE updates |
| Real-time SSE events | Route cards update via SSE (no raw trigger feed) |

### What Does NOT Move

| Element | Reason |
|---------|--------|
| Raw trigger feed | Noise — alerts are the filtered/actionable version |
| Per-trigger severity/replan indicators | Engineering debugging view, not dispatcher workflow |

### Route Card Design (Apple-style "verdict not data")

**Design principle: "Show the conclusion, not the data."**

Cards use text stats instead of progress bars for faster scanning:

```
┌─────────────────────────────────────────────────────┐
│ Lisa Anderson  TRK-008                  ● At Dock   │
│ ◉ Dallas Distribution Center              Late      │
│   Dallas, TX · ETA 9:03 PM                          │
│ 4/10 stops · 129/323 mi · HOS 7.4h · ⚠ 1          │
└─────────────────────────────────────────────────────┘
```

- **No progress bar** — "4/10 stops · 129/323 mi" conveys the same info in less space
- **No HOS bar** — "HOS 7.4h" with color coding (green >6h, yellow 2-6h, red <2h)
- **Alert count inline** — no separate row, just appended to stats line
- **Color does the work** — dispatchers scan by color, not by bar length

### Route Detail Slide-Over Panel

**Design principle: "Cards = verdict. Sheet = evidence."**

The sheet mirrors the Route Plan Result view, showing the same plan timeline with live progress overlay. This gives dispatchers a familiar layout — "here's what we planned, here's where we are."

When a dispatcher clicks a route card:

1. **Sheet opens** (Shadcn Sheet, consistent with loads detail panel)
2. **Fetches full route plan** via `useRoutePlan(route.plan_id)` — gets segments, daily breakdown
3. **Displays:**

```
┌───────────────────────── Sheet ──────────────────────────┐
│ 🚛 Lisa Anderson  TRK-008              [At Dock] [X]    │
│                                                           │
│ ┌─ Summary Stats (2x2 grid, matches plan view) ─────┐   │
│ │ [920 mi]  [14h 30m]  [Late]  [4/10 stops]         │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                           │
│ ┌─ Next Stop Callout ────────────────────────────────┐   │
│ │ ◉ Next: Dallas Distribution Center                  │   │
│ │   Dallas, TX · ETA 9:03 PM                          │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                           │
│ HOS Compliance                                            │
│ Drive  ━━━━━━━━━━━━━━░░░░  6.8/11h                      │
│ Duty   ━━━━━━━━━━━━░░░░░░  8.2/14h                      │
│ Cycle  ━━━━━━━━░░░░░░░░░░  42/70h                       │
│                                                           │
│ ── Route Timeline ───────────────────────────────────    │
│                                                           │
│ Day 1 — Mon, Feb 12                    8h 30m driving    │
│ │                                                         │
│ ✅ PICKUP  Origin Warehouse (completed)                   │
│ │  ---- 320 mi · 5h 20m ----                             │
│ ⛽ Loves #442 (fuel)                                      │
│ │  ---- 180 mi · 3h ----                                  │
│ ● Dallas Distribution Center (delivery)                   │
│                                                           │
│ ── Alerts (1) ───────────────────────────────────────    │
│ │⚠ HOS approaching limit — 4.2h remaining               │
│ │  [Ack]  [Snooze]  [Resolve]                            │
└───────────────────────────────────────────────────────────┘
```

**Key features:**
- Completed stops show green checkmark + strikethrough text
- Pending stops show segment-type icons (dock, rest, fuel, break)
- Drive segments shown as dashed lines with distance/time (matching plan view)
- Day-by-day grouping (matching plan view)
- Alerts with inline actions (ack/snooze/resolve)

### Alerts Flow

```
Command Center Alert Feed (top 5 critical)
    │
    └─→ "View All Alerts" link
            │
            └─→ /dispatcher/alerts (full page, NOT in sidebar nav)
                    ├─ Active tab (filter, search, actions)
                    └─ History tab (date range, resolution tracking)
```

---

## Implementation Steps

### Step 1: Rename `/dispatcher/overview` → `/dispatcher/command-center`

**Files to modify:**

1. **Rename directory:**
   - `apps/web/src/app/dispatcher/overview/` → `apps/web/src/app/dispatcher/command-center/`

2. **Update navigation config** (`apps/web/src/shared/lib/navigation.ts`):
   - Line 29: `href: '/dispatcher/overview'` → `href: '/dispatcher/command-center'` (DISPATCHER)
   - Line 56: `href: '/dispatcher/overview'` → `href: '/dispatcher/command-center'` (ADMIN)
   - Line 75: `href: '/dispatcher/overview'` → `href: '/dispatcher/command-center'` (OWNER)
   - Line 157: `return '/dispatcher/overview'` → `return '/dispatcher/command-center'` (getDefaultRouteForRole)

3. **Update dispatcher redirect** (`apps/web/src/app/dispatcher/page.tsx`):
   - `router.replace("/dispatcher/overview")` → `router.replace("/dispatcher/command-center")`

4. **Update login redirects:**
   - `apps/web/src/app/login/page.tsx` line 20: `"/dispatcher/overview"` → `"/dispatcher/command-center"`
   - `apps/web/src/features/auth/components/LoginScreen.tsx` line 67: `'/dispatcher/overview'` → `'/dispatcher/command-center'`
   - `apps/web/src/features/auth/components/login-form.tsx` line 123: `'/dispatcher/overview'` → `'/dispatcher/command-center'`
   - `apps/web/src/features/auth/components/accept-invitation-form.tsx` line 134: `'/dispatcher/overview'` → `'/dispatcher/command-center'`

5. **Update command palette** (`apps/web/src/shared/components/layout/CommandPalette.tsx`):
   - Any reference to `/dispatcher/overview` → `/dispatcher/command-center`

### Step 2: Delete Active Routes Page & Clean Up

1. **Delete directory:** `apps/web/src/app/dispatcher/active-routes/`

2. **Remove from navigation** (`apps/web/src/shared/lib/navigation.ts`):
   - Remove `{ label: 'Live Routes', href: '/dispatcher/active-routes', icon: Truck }` (DISPATCHER)
   - Remove `{ label: 'Live Routes', href: '/dispatcher/active-routes', icon: Map }` (ADMIN)
   - Remove `{ label: 'Live Routes', href: '/dispatcher/active-routes', icon: Map }` (OWNER)

3. **Remove from command palette** (`CommandPalette.tsx`):
   - Remove `router.push('/dispatcher/active-routes')` quick action

4. **Remove feature flag config** (`apps/web/src/shared/config/comingSoonContent.ts`):
   - Remove `live_tracking_enabled` entry

5. **Clean up feature flag from backend** (if exists):
   - Search for `live_tracking_enabled` in backend seed data or config

### Step 3: Delete Monitoring Page

1. **Delete directory:** `apps/web/src/app/dispatcher/monitoring/`

2. **Remove from navigation** (`apps/web/src/shared/lib/navigation.ts`):
   - Remove `{ label: 'Monitoring', href: '/dispatcher/monitoring', icon: Activity }` (DISPATCHER)
   - Remove `{ label: 'Monitoring', href: '/dispatcher/monitoring', icon: Activity }` (ADMIN)
   - Remove `{ label: 'Monitoring', href: '/dispatcher/monitoring', icon: Activity }` (OWNER)

3. **Remove from command palette** (if referenced)

### Step 4: Delete Analytics Page

1. **Delete directory:** `apps/web/src/app/dispatcher/analytics/`

2. **Remove commented-out nav entries** (`navigation.ts`):
   - Remove `// { label: 'Analytics', ... }` lines

3. **Clean up any analytics API hooks** (if only used by this page)

### Step 5: Remove Alerts from Sidebar Navigation

1. **Remove from navigation** (`apps/web/src/shared/lib/navigation.ts`):
   - Remove `{ label: 'Alerts', href: '/dispatcher/alerts', icon: ... }` entries
   - **Keep the page itself** — it stays accessible via URL and "View All" link

### Step 6: Enhance Command Center — Add Monitoring Pulse

1. **Add pulse indicator** to Command Center page below KPI strip:
   ```tsx
   <div className="flex items-center gap-2 text-sm text-muted-foreground">
     <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
     <span>Monitoring Active · {routeCount} routes · Last cycle {cycleTime}s</span>
   </div>
   ```

2. **Ensure SSE connection** for real-time route card updates (may already exist via `useCommandCenterOverview` polling — verify and upgrade to SSE if beneficial)

### Step 7: Add Route Detail Slide-Over Panel

1. **Create component:** `apps/web/src/features/operations/command-center/components/RouteDetailSheet.tsx`
   - Uses Shadcn `Sheet` component (consistent with loads detail panel)
   - Shows: route summary, segment timeline, alerts for route, HOS compliance bars
   - Actions: acknowledge alerts inline

2. **Wire into Command Center:**
   - Route card click → opens Sheet with route detail
   - Pass route ID to Sheet, fetch full route data

### Step 8: Ensure "View All Alerts" Link

1. **In Command Center alert feed section:**
   - Add link at bottom: `→ View All Alerts` pointing to `/dispatcher/alerts`
   - This is the ONLY navigation path to the alerts page (besides direct URL)

---

## Files Changed Summary

### Deleted
- `apps/web/src/app/dispatcher/active-routes/` (entire directory)
- `apps/web/src/app/dispatcher/monitoring/` (entire directory)
- `apps/web/src/app/dispatcher/analytics/` (entire directory)

### Renamed
- `apps/web/src/app/dispatcher/overview/` → `apps/web/src/app/dispatcher/command-center/`

### Modified
- `apps/web/src/shared/lib/navigation.ts` (nav items + default route)
- `apps/web/src/shared/components/layout/CommandPalette.tsx` (quick actions)
- `apps/web/src/shared/config/comingSoonContent.ts` (remove feature flag config)
- `apps/web/src/app/dispatcher/page.tsx` (redirect)
- `apps/web/src/app/login/page.tsx` (login redirect)
- `apps/web/src/features/auth/components/LoginScreen.tsx` (login redirect)
- `apps/web/src/features/auth/components/login-form.tsx` (login redirect)
- `apps/web/src/features/auth/components/accept-invitation-form.tsx` (login redirect)
- `apps/web/src/app/dispatcher/command-center/page.tsx` (add pulse indicator + route detail sheet)

### Created
- `apps/web/src/features/operations/command-center/components/RouteDetailSheet.tsx`

### Unchanged
- `apps/web/src/app/dispatcher/alerts/page.tsx` (kept as-is, just removed from nav)
- `apps/web/src/app/dispatcher/loads/page.tsx`
- `apps/web/src/app/dispatcher/fleet/page.tsx`
- `apps/web/src/app/dispatcher/create-plan/page.tsx`
- All backend code
- Sally AI (references to `active_routes` in AI data are fine — it's a data concept, not a page)

---

## Out of Scope

- Alert analytics (deferred to future planning)
- Raw trigger feed in Command Center (decided against — alerts are the filtered version)
- Backend monitoring service changes (frontend consolidation only)
- Driver-facing UI changes
- Post-route lifecycle implementation (separate effort)

---

## Success Criteria

1. Dispatcher navigates to `/dispatcher/command-center` and sees everything operational in one view
2. No dead nav links — only 4 operational items in sidebar
3. Route detail accessible via slide-over from any route card
4. Alerts accessible via "View All" from Command Center (no nav duplication)
5. No orphaned feature flags or "coming soon" references for removed pages
6. All login/redirect flows point to `/dispatcher/command-center`
7. App builds and runs without errors
