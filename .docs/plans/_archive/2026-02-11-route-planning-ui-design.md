# Route Planning UI — Design Document

**Date:** 2026-02-11
**Goal:** Build SALLY's flagship route planning experience — a single-screen, timeline-first interface that lets dispatchers go from load selection to an activated, HOS-compliant route in under 60 seconds.

**Design Philosophy:** Professional instrument. Every pixel earns its place. Trust through transparency — the dispatcher sees not just WHAT SALLY decided, but WHY.

---

## 1. Overall Layout

### Two-Phase Single Screen

**Phase 1 — Planning Form**
Full-width centered layout (max-w-2xl). Clean, stacked form with smart defaults. No wizard steps, no tabs — everything visible at once. The goal: get to "Plan Route" in 4 clicks.

**Phase 2 — Route Result**
After planning, the form compresses to a collapsible summary strip at top. The full screen becomes the route result: summary stats → segment timeline → compliance report. The dispatcher reviews, then activates or adjusts.

**Transition:** Smooth — form fades out, a planning animation plays ("SALLY is optimizing your route..."), then the result slides in from bottom.

---

## 2. Phase 1: Planning Form

### Layout
```
┌─────────────────────────────────────────────────┐
│  ← Back to Command Center                       │
│                                                  │
│  Create Route Plan                               │
│  Plan optimized routes with zero HOS violations  │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │  SELECT LOADS                               │ │
│  │  ┌─────────────────────────────────────┐    │ │
│  │  │ 🔍 Search loads...                  │    │ │
│  │  └─────────────────────────────────────┘    │ │
│  │  [ ] LOAD-1042  Acme Corp                   │ │
│  │      Chicago, IL → Dallas, TX  42,000 lbs   │ │
│  │  [✓] LOAD-1043  Baker Industries            │ │
│  │      Chicago, IL → Houston, TX  38,500 lbs  │ │
│  │  [ ] LOAD-1044  Clark Logistics             │ │
│  │      Detroit, MI → Atlanta, GA  45,000 lbs  │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌──────────────────┐ ┌──────────────────┐      │
│  │ DRIVER           │ │ VEHICLE          │      │
│  │ ┌──────────────┐ │ │ ┌──────────────┐ │      │
│  │ │ John Smith ▼ │ │ │ │ TRK-2847  ▼  │ │      │
│  │ │ 8.2h drive   │ │ │ │ 78% fuel     │ │      │
│  │ └──────────────┘ │ │ └──────────────┘ │      │
│  └──────────────────┘ └──────────────────┘      │
│                                                  │
│  ┌──────────────────┐                           │
│  │ DEPARTURE        │                           │
│  │ Feb 11, 3:00 PM  │                           │
│  └──────────────────┘                           │
│                                                  │
│  ○ Fastest  ● Balanced  ○ Cheapest              │
│                                                  │
│  ▸ Advanced Options                              │
│    ┌─────────────────────────────────────┐      │
│    │ Rest preference: Auto            ▼  │      │
│    │ Avoid tolls: [ ]                    │      │
│    │ Max fuel detour: 15 mi              │      │
│    └─────────────────────────────────────┘      │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │           ▶  Plan Route                     │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Field Details

**Load Selector (Multi-select with search)**
- Shows only loads with status `pending` (unplanned)
- Each load card shows: loadNumber, customerName, origin city/state → destination city/state, weightLbs
- Searchable by load number, customer name, or city
- Checkbox multi-select (combine loads into one trip)
- Selected loads highlighted with subtle border
- Empty state: "No unplanned loads. Create a load in Fleet Management."

**Driver Selector**
- Dropdown with HOS context per option
- Each option shows: name, drive hours remaining (from HOS data), cycle hours remaining
- Color-coded: green (6h+ remaining), yellow (2-6h), red (<2h)
- Auto-suggest: pre-selects the driver with most available drive hours
- Skeleton loading while fetching driver data

**Vehicle Selector**
- Dropdown with fuel context per option
- Each option shows: unitNumber (make/model), fuel level as percentage, sleeper berth indicator
- Auto-suggest: when driver is selected, default to their most recently assigned vehicle
- If no assignment data, show all available vehicles

**Departure Time**
- Date + time picker
- Defaults to current time + 1 hour (rounded to nearest 15 min)
- Cannot select past times

**Optimization Priority**
- Three radio chips in a row: "Fastest" / "Balanced" / "Cheapest"
- Maps to: minimize_time / balance / minimize_cost
- Default: Balanced
- Subtle description on hover: "Optimize for shortest trip time" / "Balance time and fuel cost" / "Minimize fuel and toll costs"

**Advanced Options (collapsed by default)**
- Disclosure triangle, expands inline
- Rest preference: Select with options Auto (recommended) / Full rest only / Split 8+2 / Split 7+3
- Avoid toll roads: Checkbox
- Max fuel detour: Number input with "mi" suffix, default 15

**Plan Route Button**
- Full width, primary style (black/white inverted)
- Disabled until: at least 1 load selected AND driver selected AND vehicle selected
- Loading state: shows spinner + "Planning..." text, button disabled

### Validation & Error States
- Inline error messages below fields (red text, small)
- If API returns error (driver not found, vehicle not found, etc.), show Alert component at top with error message
- If route is infeasible, still show the result but with a warning banner

---

## 3. Planning Animation

When "Plan Route" is clicked:

```
┌─────────────────────────────────────────────────┐
│                                                  │
│                                                  │
│           ◐  (animated spinner)                  │
│                                                  │
│     SALLY is planning your route...              │
│                                                  │
│     Optimizing stop sequence                     │
│     Checking HOS compliance          ✓           │
│     Finding fuel stops               ✓           │
│     Checking weather conditions      ...         │
│                                                  │
│                                                  │
└─────────────────────────────────────────────────┘
```

- Centered on screen, replaces form
- Animated spinner (existing app pattern)
- Simulated progress steps that appear one by one (every ~800ms)
- Steps: "Optimizing stop sequence" → "Simulating HOS compliance" → "Finding optimal fuel stops" → "Checking weather conditions" → "Building route plan"
- Each step gets a checkmark after appearing (cosmetic — actual API is a single call)
- Total animation ~4 seconds, or until API responds (whichever is longer)
- If API responds before animation completes, finish animation quickly then show result

---

## 4. Phase 2: Route Result

### Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  ← New Plan                              [Activate Route]      │
│                                                                 │
│  Route Plan RP-20260211-ABC123                    Status: Draft │
│  Driver: John Smith  •  Vehicle: TRK-2847  •  2 Loads          │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ 487 mi   │ │ 22.5 hrs │ │ 2 days   │ │ $1,235   │          │
│  │ Distance  │ │ Trip Time│ │ Driving  │ │ Est Cost │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  ┌─ HOS Compliance ──────────────────────────────────────────┐ │
│  │ ✓ Fully Compliant                                         │ │
│  │ 2 rest stops • 1 break • 0 violations                     │ │
│  │                                                            │ │
│  │ ✓ 11-hour driving limit    ✓ 14-hour duty window          │ │
│  │ ✓ 30-minute break          ✓ 10-hour off-duty rest        │ │
│  │ ✓ 70-hour/8-day cycle                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ Weather ─────────────────────────────────────────────────┐ │
│  │ ⚠ 1 weather alert along route                             │ │
│  │ Snow near Denver, CO — severe, +50% drive time            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ Day 1 — Feb 11 ─────────────────────────────────────────┐ │
│  │ 7.8h driving • 9.5h on-duty • 6 segments                 │ │
│  │                                                            │ │
│  │  ● 08:00 AM  DEPART — Origin Warehouse, Chicago IL       │ │
│  │  │           Drive 245 mi • 4.2h                          │ │
│  │  │                                                         │ │
│  │  ◆ 12:12 PM  PICKUP — Acme Distribution, Indianapolis IN │ │
│  │  │           Dock 2.0h • Customer: Acme Corp              │ │
│  │  │                                                         │ │
│  │  │  02:12 PM  Drive 89 mi • 1.5h                          │ │
│  │  │                                                         │ │
│  │  ◇ 03:42 PM  BREAK — Along I-65, Kentucky                │ │
│  │  │           30 min mandatory break                       │ │
│  │  │           HOS: 5.7h driven / 7.7h on-duty             │ │
│  │  │                                                         │ │
│  │  │  04:12 PM  Drive 156 mi • 2.6h                         │ │
│  │  │                                                         │ │
│  │  ⛽ 06:48 PM  FUEL — Love's Travel Stop, Nashville TN     │ │
│  │  │           250 gal @ $3.65/gal = $912.50                │ │
│  │  │           3.2 mi detour                                │ │
│  │  │                                                         │ │
│  │  │  07:18 PM  Drive 48 mi • 0.8h                          │ │
│  │  │                                                         │ │
│  │  🌙 08:06 PM  REST — Pilot Travel Center, Murfreesboro TN│ │
│  │               10h full rest                                │ │
│  │               Reason: 11-hour driving limit reached       │ │
│  │               HOS: 9.3h driven / 11.2h on-duty           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ Day 2 — Feb 12 ─────────────────────────────────────────┐ │
│  │ 3.2h driving • 5.0h on-duty • 3 segments                 │ │
│  │                                                            │ │
│  │  ● 06:06 AM  DEPART — Pilot Travel Center, Murfreesboro  │ │
│  │  │           Drive 198 mi • 3.2h                          │ │
│  │  │                                                         │ │
│  │  ◆ 09:18 AM  DELIVERY — Baker Warehouse, Atlanta GA      │ │
│  │  │           Dock 2.0h • Customer: Baker Industries       │ │
│  │  │                                                         │ │
│  │  ● 11:18 AM  ARRIVE — Final Destination                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  [◀ Plan Another Route]              [Activate Route ▶]  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Section Details

**Top Bar**
- "← New Plan" link (resets to form, confirms if plan is draft)
- "Activate Route" button (primary, right-aligned)
- Plan ID displayed prominently
- Status badge: Draft (gray), Active (green), Cancelled (red)

**Summary Stats Strip**
- 4 metric cards in a responsive row (grid-cols-2 md:grid-cols-4)
- Each shows: value (large, bold) + label (small, muted)
- Distance (miles), Trip Time (hours), Driving Days, Estimated Cost

**HOS Compliance Card**
- Green checkmark + "Fully Compliant" or yellow warning + "Requires Attention"
- Summary line: "2 rest stops, 1 break, 0 violations"
- Individual rule statuses in a 2-column grid
- Each rule: checkmark icon + rule name
- This card builds TRUST — the dispatcher sees every FMCSA rule is satisfied

**Weather Alerts Card (conditional)**
- Only shown if weatherAlerts.length > 0
- Yellow/orange border for warnings
- Lists each alert: condition, location, severity, drive time impact
- Hidden entirely if no alerts (no empty "No weather alerts" card)

**Daily Breakdown — Segment Timeline**
- Grouped by day (from dailyBreakdown data)
- Day header: day number, date, summary (drive hours, on-duty hours, segment count)
- Each segment as a timeline node:

  **Drive segments:**
  - No special icon, just a connecting line with distance + time
  - Shown as indented text between stops (not a full card)

  **Dock segments (pickup/delivery):**
  - Diamond icon (◆)
  - Action type badge: "PICKUP" or "DELIVERY"
  - Location name + city/state
  - Duration + customer name
  - Appointment window if present

  **Rest segments:**
  - Moon icon
  - Rest type: "10h full rest" / "8+2 split rest" / "34h restart"
  - Reason shown in muted text: "11-hour driving limit reached"
  - HOS state after rest shown: hours driven / on-duty

  **Fuel segments:**
  - Fuel pump icon (⛽ equivalent as Lucide Fuel icon)
  - Station name
  - Gallons, price per gallon, total cost
  - Detour miles if > 0

  **Break segments:**
  - Coffee/pause icon
  - "30 min mandatory break"
  - HOS state shown

  **Timeline visual:**
  - Vertical line connecting all stops
  - Each stop is a node on the line
  - Time shown at each node (left-aligned, muted)
  - Segment type determines icon and color:
    - Departure/Arrival: filled circle (●) — foreground color
    - Pickup/Delivery: filled diamond (◆) — foreground color
    - Rest: moon icon — foreground color
    - Fuel: fuel icon — foreground color
    - Break: pause icon — muted color

**Bottom Action Bar**
- "Plan Another Route" — ghost button, left
- "Activate Route" — primary button, right
- On activate: confirmation dialog → calls POST /routes/:planId/activate → shows success toast → navigates to active routes or stays with status updated

### Infeasible Route Handling
- If `isFeasible === false`, show a warning Alert at top: "This route has feasibility issues"
- List feasibilityIssues as bullet points
- Activate button still available but with destructive styling
- Timeline still renders in full so dispatcher can see where issues are

---

## 5. Component Architecture

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
│   │   │   ├── DriveSegment.tsx       # Drive between stops
│   │   │   ├── DockSegment.tsx        # Pickup/delivery at stop
│   │   │   ├── RestSegment.tsx        # Rest stop with reason
│   │   │   ├── FuelSegment.tsx        # Fuel stop with cost
│   │   │   └── BreakSegment.tsx       # Mandatory break
│   │   └── PlanActions.tsx            # Bottom action buttons
│   └── types.ts                       # Frontend types for route plan data
```

---

## 6. API Integration

**New files needed:**
```
features/routing/route-planning/
├── api.ts                             # API functions (planRoute, getRoute, activateRoute, etc.)
├── hooks/
│   └── use-route-planning.ts          # React Query hooks
└── types.ts                           # TypeScript types matching backend response
```

**Hooks:**
- `usePlanRoute()` — mutation, calls POST /routes/plan
- `useActivateRoute()` — mutation, calls POST /routes/:planId/activate
- `useRouteplan(planId)` — query, calls GET /routes/:planId
- `useRoutePlans(filters?)` — query, calls GET /routes

**Existing hooks reused:**
- `useDrivers()` — for driver dropdown
- `useVehicles()` — for vehicle dropdown
- `useLoads()` — for load selector (filtered to status: pending)
- `useDriverHOS(driverId)` — for live HOS data in driver dropdown

---

## 7. Responsive Design

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

## 8. Dark Mode

All components use semantic tokens:
- Backgrounds: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`
- Borders: `border-border`
- Timeline line: `border-border`
- Status colors: green/yellow/red with dark variants
- Cards: Shadcn Card components (auto dark mode)

---

## 9. Micro-interactions & Polish Details

1. **Load selection:** Checkbox appears on hover, selected loads get subtle left border accent
2. **Driver HOS bars:** Tiny progress bar next to each driver option in dropdown, color-coded
3. **Planning animation:** Steps appear with staggered fade-in, checkmarks animate in
4. **Result reveal:** Segments animate in with staggered slide-up (50ms delay between each)
5. **Activate success:** Brief confetti-free celebration — the Activate button transforms to "✓ Activated" with green background, holds 2 seconds, then UI updates
6. **Timeline hover:** Hovering a segment subtly highlights it (bg-muted)
7. **Time formatting:** All times in driver's home terminal timezone with timezone abbreviation shown
8. **Number formatting:** Miles with commas (1,234), hours with 1 decimal (7.8h), currency with cents ($1,234.56)
9. **Empty states:** Friendly, actionable messages — "No unplanned loads available" with link to Fleet → Loads

---

## 10. What We're NOT Building (Scope Boundaries)

- **No map view** — No map library installed. Timeline-first is more useful for HOS-focused dispatchers. Map is a future enhancement.
- **No drag-and-drop reordering** — The engine optimizes stop sequence. Manual override is future scope.
- **No real-time tracking** — That's the Active Routes page (live_tracking feature).
- **No route editing** — Plan, review, activate. If wrong, cancel and re-plan.
- **No print/export** — Future feature.
- **No comparison view** — No side-by-side of different optimization priorities. Future feature.

---

## 11. Success Criteria

1. Dispatcher can go from "I have loads to plan" → activated route in < 60 seconds
2. Every HOS decision is visible and explained in the timeline
3. Zero confusion about what each stop means (clear icons, labels, context)
4. Works flawlessly on both light and dark themes
5. Fully responsive from mobile to desktop
6. Loading states feel purposeful, not annoying
7. Errors are clear and actionable
