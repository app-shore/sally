# Route Planning UI -- Design Specification

> **Status:** Designed, not yet built | **Last Validated:** 2026-02-12 | **Source Plans:** `_archive/2026-02-11-route-planning-ui-design.md`

**Note on validation:** No route planning create-plan page was found in the frontend codebase. The only route-related page is `apps/web/src/app/driver/route/page.tsx` (driver view). The dispatcher route planning UI described here is entirely a future implementation.

---

## Summary

SALLY's flagship route planning experience -- a single-screen, timeline-first interface that lets dispatchers go from load selection to an activated, HOS-compliant route in under 60 seconds.

**Design Philosophy:** Professional instrument. Every pixel earns its place. Trust through transparency -- the dispatcher sees not just WHAT SALLY decided, but WHY.

---

## Overall Layout

### Two-Phase Single Screen

**Phase 1 -- Planning Form:** Full-width centered layout (max-w-2xl). Clean, stacked form with smart defaults. No wizard steps, no tabs -- everything visible at once. Goal: get to "Plan Route" in 4 clicks.

**Phase 2 -- Route Result:** After planning, the form compresses to a collapsible summary strip at top. The full screen becomes the route result: summary stats, segment timeline, compliance report. The dispatcher reviews, then activates or adjusts.

**Transition:** Smooth -- form fades out, a planning animation plays ("SALLY is optimizing your route..."), then the result slides in from bottom.

---

## Phase 1: Planning Form

### Field Details

**Load Selector (Multi-select with search)**
- Shows only loads with status `pending` (unplanned)
- Each load card: loadNumber, customerName, origin city/state -> destination city/state, weightLbs
- Searchable by load number, customer name, or city
- Checkbox multi-select (combine loads into one trip)
- Selected loads highlighted with subtle border
- Empty state: "No unplanned loads. Create a load in Fleet Management."

**Driver Selector**
- Dropdown with HOS context per option
- Each option: name, drive hours remaining, cycle hours remaining
- Color-coded: green (6h+ remaining), yellow (2-6h), red (<2h)
- Auto-suggest: pre-selects the driver with most available drive hours
- Skeleton loading while fetching driver data

**Vehicle Selector**
- Dropdown with fuel context per option
- Each option: unitNumber (make/model), fuel level percentage, sleeper berth indicator
- Auto-suggest: when driver is selected, default to their most recently assigned vehicle

**Departure Time**
- Date + time picker
- Defaults to current time + 1 hour (rounded to nearest 15 min)
- Cannot select past times

**Optimization Priority**
- Three radio chips in a row: "Fastest" / "Balanced" / "Cheapest"
- Maps to: `minimize_time` / `balance` / `minimize_cost`
- Default: Balanced

**Advanced Options (collapsed by default)**
- Rest preference: Select (Auto / Full rest only / Split 8+2 / Split 7+3)
- Avoid toll roads: Checkbox
- Max fuel detour: Number input with "mi" suffix, default 15

**Plan Route Button**
- Full width, primary style (black/white inverted)
- Disabled until: at least 1 load selected AND driver selected AND vehicle selected
- Loading state: spinner + "Planning..." text, button disabled

### Validation and Error States
- Inline error messages below fields (red text, small)
- API errors shown in Alert component at top
- Infeasible routes still show the result with a warning banner

---

## Planning Animation

When "Plan Route" is clicked:

- Centered on screen, replaces form
- Animated spinner
- Simulated progress steps appearing one by one (~800ms each):
  1. "Optimizing stop sequence"
  2. "Simulating HOS compliance"
  3. "Finding optimal fuel stops"
  4. "Checking weather conditions"
  5. "Building route plan"
- Each step gets a checkmark after appearing (cosmetic -- actual API is a single call)
- Total animation ~4 seconds, or until API responds (whichever is longer)
- If API responds before animation completes, finish animation quickly then show result

---

## Phase 2: Route Result

### Summary Stats Strip

4 metric cards in a responsive row (grid-cols-2 md:grid-cols-4):
- Distance (miles) -- large, bold
- Trip Time (hours)
- Driving Days
- Estimated Cost

### HOS Compliance Card

- Green checkmark + "Fully Compliant" or yellow warning + "Requires Attention"
- Summary line: "2 rest stops, 1 break, 0 violations"
- Individual FMCSA rule statuses in a 2-column grid:
  - 11-hour driving limit
  - 14-hour duty window
  - 30-minute break
  - 10-hour off-duty rest
  - 70-hour/8-day cycle

### Weather Alerts Card (conditional)

- Only shown if weatherAlerts.length > 0
- Yellow/orange border for warnings
- Lists each alert: condition, location, severity, drive time impact

### Daily Breakdown -- Segment Timeline

Grouped by day (from `dailyBreakdown` data). Day header shows: day number, date, summary (drive hours, on-duty hours, segment count).

**Segment types and their timeline representation:**

| Type | Icon | Details Shown |
|------|------|---------------|
| Departure/Arrival | Filled circle | Location name + city/state |
| Pickup/Delivery (dock) | Diamond | Action type badge, location, duration, customer, appointment window |
| Rest | Moon | Rest type, duration, reason (muted text), HOS state after |
| Fuel | Fuel pump | Station name, gallons, price/gallon, total cost, detour miles |
| Break | Pause | "30 min mandatory break", HOS state |
| Drive | Connecting line | Distance + time (shown as indented text between stops) |

**Timeline visual:** Vertical line connecting all stops. Time shown at each node (left-aligned, muted). Segment type determines icon and color.

### Action Bar

- "Plan Another Route" -- ghost button, left
- "Activate Route" -- primary button, right
- On activate: confirmation dialog -> `POST /routes/:planId/activate` -> success toast

### Infeasible Route Handling

- Warning Alert at top: "This route has feasibility issues"
- List `feasibilityIssues` as bullet points
- Activate button still available but with destructive styling
- Timeline still renders in full so dispatcher can see where issues are

---

## Component Architecture

```
create-plan/
├── page.tsx                           # Main page with FeatureGuard
├── components/
│   ├── RoutePlanningForm.tsx          # Phase 1: Input form
│   │   ├── LoadSelector.tsx           # Multi-select load picker with search
│   │   ├── DriverSelector.tsx         # Driver dropdown with HOS context
│   │   ├── VehicleSelector.tsx        # Vehicle dropdown with fuel context
│   │   └── AdvancedOptions.tsx        # Collapsible advanced settings
│   ├── PlanningAnimation.tsx          # Loading animation between phases
│   ├── RoutePlanResult.tsx            # Phase 2: Result display
│   │   ├── PlanSummaryStats.tsx       # 4-metric card strip
│   │   ├── ComplianceCard.tsx         # HOS compliance report card
│   │   ├── WeatherAlertsCard.tsx      # Conditional weather alerts
│   │   ├── DayTimeline.tsx            # Single day's segment timeline
│   │   │   ├── DriveSegment.tsx
│   │   │   ├── DockSegment.tsx
│   │   │   ├── RestSegment.tsx
│   │   │   ├── FuelSegment.tsx
│   │   │   └── BreakSegment.tsx
│   │   └── PlanActions.tsx            # Bottom action buttons
│   └── types.ts                       # Frontend types for route plan data
```

---

## API Integration

**New files needed:**
```
features/routing/route-planning/
├── api.ts                             # API functions
├── hooks/
│   └── use-route-planning.ts          # React Query hooks
└── types.ts                           # TypeScript types matching backend
```

**Hooks:**
- `usePlanRoute()` -- mutation, calls `POST /routes/plan`
- `useActivateRoute()` -- mutation, calls `POST /routes/:planId/activate`
- `useRoutePlan(planId)` -- query, calls `GET /routes/:planId`
- `useRoutePlans(filters?)` -- query, calls `GET /routes`

**Existing hooks reused:**
- `useDrivers()` -- for driver dropdown
- `useVehicles()` -- for vehicle dropdown
- `useLoads()` -- for load selector (filtered to status: pending)
- `useDriverHOS(driverId)` -- for live HOS data in driver dropdown

---

## Responsive Design

**Mobile (< 768px):**
- Form: full-width, single column
- Driver/Vehicle selectors stack vertically
- Summary stats: 2x2 grid
- Timeline: full-width, smaller font
- Action buttons: stack vertically, full width

**Tablet (768px - 1024px):**
- Form: centered, max-w-xl
- Driver/Vehicle side by side
- Summary stats: 4-column
- Timeline: full-width with comfortable spacing

**Desktop (> 1024px):**
- Form: centered, max-w-2xl
- Generous spacing
- Timeline with wide margins for readability

---

## Dark Mode

All components use semantic tokens per CLAUDE.md standards:
- Backgrounds: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`
- Borders: `border-border`
- Timeline line: `border-border`
- Status colors: green/yellow/red with dark variants
- Cards: Shadcn Card components (auto dark mode)

---

## Micro-interactions

1. Load selection: Checkbox appears on hover, selected loads get subtle left border accent
2. Driver HOS bars: Tiny progress bar next to each driver option, color-coded
3. Planning animation: Steps appear with staggered fade-in, checkmarks animate in
4. Result reveal: Segments animate in with staggered slide-up (50ms delay between each)
5. Activate success: Button transforms to "Activated" with green background, holds 2 seconds
6. Timeline hover: Hovering a segment subtly highlights it (bg-muted)
7. Time formatting: All times in driver's home terminal timezone with timezone abbreviation
8. Number formatting: Miles with commas (1,234), hours with 1 decimal (7.8h), currency with cents ($1,234.56)
9. Empty states: Friendly, actionable messages with navigation links

---

## Scope Boundaries (Not Building)

- No map view -- Timeline-first is more useful for HOS-focused dispatchers. Map is future scope.
- No drag-and-drop reordering -- Engine optimizes stop sequence. Manual override is future scope.
- No real-time tracking -- That is the Active Routes page (live_tracking feature).
- No route editing -- Plan, review, activate. If wrong, cancel and re-plan.
- No print/export -- Future feature.
- No comparison view -- No side-by-side of different optimization priorities. Future feature.

---

## Success Criteria

1. Dispatcher goes from "I have loads to plan" to activated route in < 60 seconds
2. Every HOS decision is visible and explained in the timeline
3. Zero confusion about what each stop means (clear icons, labels, context)
4. Works flawlessly on both light and dark themes
5. Fully responsive from mobile to desktop
6. Loading states feel purposeful, not annoying
7. Errors are clear and actionable
