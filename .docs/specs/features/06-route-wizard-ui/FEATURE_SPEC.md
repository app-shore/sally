# Consolidated Route Planning Wizard - Feature Specification

**Status:** Planning
**Priority:** High
**Target Release:** POC Enhancement v2
**Estimated Effort:** ~44 hours (~1 week sprint)
**Last Updated:** January 29, 2026

---

## Executive Summary

Transform the current 5-step route planning wizard into an innovative, Apple-level simple, single-screen experience with map-first route visualization and intelligent auto-suggestions.

### Current State
- **5-step wizard**: Load → Driver → Vehicle → Review → Results
- **Separate components** for each step, requiring navigation
- **Results displayed in timeline cards** (no map visualization)
- **Scenarios mixed with loads** (confusing UX)

### Target State
- **Single-screen consolidated wizard** with minimal inputs
- **Map-first route display** with bottom drawer timeline (like Apple Maps)
- **Smart auto-suggest** for driver (HOS-aware) and vehicle (range-aware)
- **Progressive disclosure**: Details appear only when needed
- **Inline REST recommendations** with 💡 icon + popover explanation
- **Full-width layout**: Content starts right after sidebar (max-width 1400px)

---

## Design Principles

1. **Apple-level simplicity**: 3 inputs max (Load → Driver → Vehicle), each auto-suggests intelligently
2. **Progressive disclosure**: Show route on map immediately, timeline drawer for details
3. **Contextual intelligence**: REST recommendations inline with hover/click explanation
4. **Zero clutter**: Remove wizard steps, scenarios (move to advanced mode), review screen

---

## Key Features

### 1. Minimal Input Flow

**3 Inputs Total:**
```
[Load Selector ▾]  [Driver Selector ▾]  [Vehicle Selector ▾]  [Generate Plan]
```

**Auto-Suggest Intelligence:**
- **Load selection** → Auto-populates stops → Triggers driver suggestion
- **Driver suggestion** → Sorts by HOS availability (most hours remaining first)
  - Shows: "John Smith ✨ Suggested • 4.5h available"
- **Vehicle suggestion** → Auto-selects driver's assigned truck
  - Shows: "TRK-1234 Default Truck • 150gal (975mi range)"

**Progressive Disclosure:**
- HOS details: Collapsible "▶ HOS Details" (shows hours_driven, on_duty_time, hours_since_break)
- Fuel details: Collapsible "▶ Fuel Details" (shows current/capacity, range, MPG)
- Default: Collapsed (single line summary)

---

### 2. Map-First Route Visualization

**Design Pattern:** Apple Maps meets Uber driver app

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│    ┌─────────────────┐                              │
│    │ 📊 Summary Card │  (Floating top-left)        │
│    │ 450mi • 8.5h    │                              │
│    │ ✓ HOS Compliant │                              │
│    └─────────────────┘                              │
│                                                     │
│           🗺️  MAP VISUALIZATION                     │
│      (Route, stops, rest/fuel icons)               │
│                                                     │
│                                                     │
│ ┌───────────────────────────────────────────────┐  │
│ │   ━━ (Drag Handle)                            │  │
│ │   📍 4 stops • 1 rest • 1 fuel                │  │
│ │   [View Timeline ▲]                           │  │
│ └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Timeline Drawer (Bottom Sheet):**
- **Collapsed (default)**: 120px height
  - Shows: "4 stops • 1 rest stop • 1 fuel stop"
  - Button: "View Timeline ▲"
- **Expanded (pull up)**: 500px height
  - Full segment timeline with cards
  - Scrollable list of all segments

---

### 3. Inline REST Recommendations

**REST Segment Card Design:**
```
┌─────────────────────────────────────────────────┐
│ 💤  Rest Stop (Partial Rest)               💡   │ ← Blue left border
│     7h rest                                     │ ← Light blue background
│     Arrive: 2:30 PM • Depart: 9:30 PM          │
│                                                 │
│ [💡 Click for details]                          │
└─────────────────────────────────────────────────┘

[Click 💡 Icon] → Popover appears:

┌───────────────────────────────────────────────┐
│ 💡 REST Optimization Recommendation           │
│                                               │
│ System recommends PARTIAL REST (7h) instead  │
│ of FULL REST (10h) because:                  │
│                                               │
│ • Next dock has 1.5h available                │
│ • Combining rest + dock = 8.5h off-duty       │
│ • Saves 3 hours compared to full rest         │
│ • Maintains 100% HOS compliance               │
│                                               │
│ [Change to Full Rest]  [Remove]               │
└───────────────────────────────────────────────┘
```

**Key Features:**
- REST segments visually distinct (blue border, light background)
- 💡 icon for "smart recommendation" (subtle, discoverable)
- Popover explains reasoning in plain language
- Override buttons for dispatcher control (future enhancement)

---

### 4. Full-Width Layout

**Before (Centered):**
```
Sidebar | ← Empty space → [Content max-w-7xl] ← Empty space →
```

**After (Full-Width):**
```
Sidebar | [Content starts immediately, max-w-[1400px] mx-auto]
```

**Responsive Behavior:**
- **Desktop (1440px+)**: Full 1400px content width
- **Tablet (768-1024px)**: Content scales down, maintains padding
- **Mobile (<768px)**: Full width with edge padding (px-4)

---

## Auto-Suggest Algorithm Details

### Driver Auto-Suggest
```typescript
function suggestBestDriver(drivers, load) {
  return drivers
    .filter(d => d.is_active)
    .sort((a, b) => {
      // Priority 1: Most HOS hours remaining (drive time available)
      const aHoursRemaining = 11 - (a.current_hos?.hours_driven || 0);
      const bHoursRemaining = 11 - (b.current_hos?.hours_driven || 0);
      if (aHoursRemaining !== bHoursRemaining) {
        return bHoursRemaining - aHoursRemaining; // Descending
      }

      // Priority 2: Most on-duty time remaining
      const aOnDutyRemaining = 14 - (a.current_hos?.on_duty_time || 0);
      const bOnDutyRemaining = 14 - (b.current_hos?.on_duty_time || 0);
      return bOnDutyRemaining - aOnDutyRemaining;

      // Future: Priority 3: Location proximity to pickup
      // Future: Priority 4: Specialization match (hazmat, reefer, etc.)
    })[0];
}
```

### Vehicle Auto-Suggest
```typescript
function suggestBestVehicle(driverId, vehicles, load) {
  const driver = drivers.find(d => d.driver_id === driverId);

  // Priority 1: Driver's assigned truck (if available)
  if (driver?.assigned_vehicle_id) {
    const assignedVehicle = vehicles.find(v => v.vehicle_id === driver.assigned_vehicle_id);
    if (assignedVehicle?.is_active) {
      return assignedVehicle;
    }
  }

  // Priority 2: Vehicle with sufficient fuel range for trip
  return vehicles
    .filter(v => v.is_active)
    .filter(v => (v.current_fuel_gallons * v.mpg) >= load.total_miles_estimate)
    .sort((a, b) => {
      // Prefer higher fuel level
      return (b.current_fuel_gallons / b.fuel_capacity_gallons) -
             (a.current_fuel_gallons / a.fuel_capacity_gallons);
    })[0];
}
```

---

## Technical Implementation

### New Components to CREATE

1. **`/apps/web/src/components/route-planner/LoadSelector.tsx`**
   - TMS load picker dropdown
   - Auto-populate stops on selection
   - Show load summary (origin → destination, weight, distance)

2. **`/apps/web/src/components/route-planner/DriverSelector.tsx`**
   - HOS-aware driver picker
   - Auto-suggest based on availability
   - Collapsible HOS details

3. **`/apps/web/src/components/route-planner/VehicleSelector.tsx`**
   - Range-aware vehicle picker
   - Auto-select driver's assigned truck
   - Collapsible fuel details

4. **`/apps/web/src/components/route-planner/RouteMapView.tsx`**
   - Map container (placeholder for Phase 4 map integration)
   - Floating summary card (top-left)
   - Timeline drawer integration

5. **`/apps/web/src/components/route-planner/TimelineDrawer.tsx`**
   - Bottom sheet component (expand/collapse)
   - Collapsed: Summary view
   - Expanded: Full segment timeline

6. **`/apps/web/src/components/ui/popover.tsx`**
   - Shadcn popover component (if not exists)

### Components to MODIFY

1. **`/apps/web/src/app/dispatcher/create-plan/page.tsx`**
   - **Rewrite** from 5-step wizard to single-screen layout
   - Remove step navigation logic
   - Add 3 selectors + generate button
   - Add RouteMapView results section

2. **`/apps/web/src/lib/store/routePlanStore.ts`**
   - Add TMS fields: `selectedLoadId`, `suggestedDriverId`, `driverAssignedVehicleId`
   - Add validation: `validationErrors`, `isFormValid`, `validateForm()`
   - Add REST strategy: `restStrategy` (auto/suggested/manual)

3. **`/apps/web/src/components/route-planner/SegmentsTimeline.tsx`**
   - **Replace** entire file
   - Add REST segment special styling (blue border, background)
   - Add 💡 icon with popover
   - Add optimization explanation in popover

4. **`/apps/web/src/components/layout/AppLayout.tsx`**
   - **Remove** `max-w-7xl` constraint (line 90)
   - Let pages control their own width

### Components to DELETE (Cleanup)

1. `/apps/web/src/components/route-planner/LoadSourceSelector.tsx`
2. `/apps/web/src/components/route-planner/DriverStateInput.tsx`
3. `/apps/web/src/components/route-planner/VehicleStateInput.tsx`
4. `/apps/web/src/components/route-planner/StopsManager.tsx`

**Rationale:** Old step-based components replaced by minimal selectors. Reduces bundle size and prevents confusion.

---

### Backend API Changes

1. **`/apps/backend/src/api/drivers/drivers.controller.ts`**
   - Enhance `GET /drivers` response:
     - Add `assigned_vehicle_id` (from database)
     - Add `current_hos` (from external HOS API)
       - `hours_driven`, `drive_remaining`, `on_duty_time`, `shift_remaining`, `break_required`

2. **`/apps/backend/src/api/loads/loads.controller.ts`**
   - Enhance `GET /loads` response:
     - Add `stop_count` (calculated)
     - Add `origin_city`, `origin_state` (from first stop)
     - Add `destination_city`, `destination_state` (from last stop)
     - Add `total_miles_estimate` (rough distance)
     - Add `pickup_date`, `delivery_date` (from time windows)

3. **`/apps/backend/prisma/schema.prisma`**
   - Add `assignedVehicleId String?` to Driver model
   - Run migration: `npx prisma migrate dev --name add_driver_vehicle_assignment`

4. **`/apps/backend/prisma/seed.ts`**
   - Add 10 realistic loads with varying complexity:
     - Short-haul (<200mi, no rest)
     - Long-haul (800+mi, requires rest)
     - Multi-stop (3-5 stops)
     - Time-sensitive (tight delivery windows)
   - Add driver-vehicle assignments for all drivers

---

## Implementation Sequence

### Week 1: Backend Foundation (8 hours)
1. Update Prisma schema (add `assignedVehicleId` to Driver)
2. Run migration
3. Enhance drivers API (add `assigned_vehicle_id`, `current_hos`)
4. Enhance loads API (add origin/destination/distance/dates)
5. Expand seed data (10 loads, driver-vehicle assignments)
6. Test all endpoints with Postman

### Week 2: Store & Core Components (12 hours)
7. Update `routePlanStore` (add TMS fields, validation logic)
8. Create `LoadSelector` component
9. Create `DriverSelector` component (with auto-suggest)
10. Create `VehicleSelector` component (with auto-suggest)
11. Test auto-suggest algorithms

### Week 3: Map-First Visualization (12 hours)
12. Create `RouteMapView` container (map placeholder + summary card)
13. Create `TimelineDrawer` component (bottom sheet expand/collapse)
14. Enhance `SegmentsTimeline` with REST recommendations (💡 icon, popover)
15. Update `AppLayout` (remove max-w-7xl)
16. Test responsive behavior (mobile, tablet, desktop)

### Week 4: Integration & Cleanup (12 hours)
17. Rewrite `create-plan` page (consolidated wizard)
18. Wire up all components + data flow
19. Delete old wizard components (4 files)
20. End-to-end testing (light + dark themes)
21. Accessibility audit (keyboard nav, screen readers)
22. Performance optimization (bundle size, animations)

---

## Verification Checklist

### Functionality
- [ ] Load selection populates stops automatically
- [ ] Driver auto-suggests based on HOS availability
- [ ] Vehicle auto-suggests driver's assigned truck
- [ ] Generate button disabled until all inputs valid
- [ ] Route displays on map (placeholder) with summary card
- [ ] Timeline drawer expands/collapses smoothly
- [ ] REST segments show 💡 icon with popover explanation
- [ ] Popover shows optimization reasoning clearly

### UX/Design
- [ ] Full-width layout (max-width 1400px, starts after sidebar)
- [ ] Inputs minimal (3 dropdowns + 1 button)
- [ ] No wizard steps (single screen)
- [ ] Progressive disclosure (HOS/fuel details collapsible)
- [ ] Dark theme works perfectly
- [ ] Responsive on mobile (375px), tablet (768px), desktop (1440px)

### Performance
- [ ] Auto-suggest triggers only on load/driver change (no excessive API calls)
- [ ] Timeline drawer animation smooth (60fps)
- [ ] Bundle size reasonable (<5MB increase)
- [ ] No console errors/warnings

### Cleanup
- [ ] Old wizard components deleted (4 files)
- [ ] No unused imports
- [ ] No deprecated code patterns

---

## User Experience Flow

### Happy Path (3 Clicks to Route Plan)

1. **Click 1**: Select load from dropdown
   - Load details appear below
   - Driver dropdown auto-selects "John Smith ✨ Suggested"
   - Vehicle dropdown auto-selects "TRK-1234 Default Truck"

2. **Click 2**: (Optional) Change driver or vehicle if needed
   - Or accept auto-suggested values

3. **Click 3**: Click "Generate Plan"
   - Map appears with route visualization
   - Timeline drawer shows summary (collapsed)
   - User can pull up drawer to see full timeline

4. **Click 4**: (Optional) Click 💡 icon on REST segment
   - Popover explains: "Partial rest saves 3 hours by using dock time"
   - User understands optimization reasoning

**Total clicks for basic route planning: 2 clicks (Load + Generate)**
**Total clicks for full details: 4-5 clicks (Load + Generate + Expand drawer + View REST reasoning)**

---

## Future Enhancements (Post-POC)

1. **Real map integration** (Mapbox, Google Maps, or Leaflet)
   - Show actual route on map
   - Clickable stop markers
   - Route polyline with color coding (drive = blue, rest = purple, fuel = orange)

2. **REST override actions** (Make buttons functional)
   - "Change to Full Rest" → Re-generate plan with 10h rest
   - "Remove" → Re-generate plan without rest (show compliance warning)

3. **Route comparison** (Show alternative routes side-by-side)
   - Option A: Faster route (minimize time)
   - Option B: Cheaper route (minimize cost)
   - Option C: Balanced route

4. **Drag-to-reorder stops** (Manual stop sequence override)
   - Dispatcher can drag stops in timeline to reorder
   - Re-generate plan with new sequence

5. **Live HOS updates** (Real-time HOS from Samsara webhook)
   - Show "HOS updated 2 minutes ago"
   - Auto-refresh driver suggestions

6. **Fuel price optimization** (Show savings from fuel stop routing)
   - "Fuel stop at Love's saves $45 vs Pilot"

7. **Weather overlays** (Show weather conditions on map)
   - Rain, snow, wind icons on route
   - Delay estimates for weather events

8. **Traffic integration** (Real-time traffic data)
   - Show delays on route
   - Suggest alternative routes to avoid traffic

---

## Success Metrics

### User Engagement
- **Time to create route plan**: Target <60 seconds (vs current ~2-3 minutes)
- **Clicks to complete**: Target 2-3 clicks (vs current 8-10 clicks)
- **% using auto-suggest**: Target >80% (drivers accept suggested values)

### Route Quality
- **Zero HOS violations**: 100% of routes compliant
- **REST optimization adoption**: Target >60% (dispatchers use partial rest when suggested)
- **Time savings**: Average 3-4 hours saved per route via dock-time rest optimization

### Technical Performance
- **Page load time**: <2 seconds
- **Route generation time**: <3 seconds (backend processing)
- **Timeline drawer animation**: 60fps smooth
- **Mobile performance**: No jank, touch-friendly targets (44x44px minimum)

---

## Related Documents

- **Product Spec**: `.specs/POC_ENHANCEMENT_PLAN.md` - Overall POC enhancement roadmap
- **Route Planning Spec**: `.specs/ROUTE_PLANNING_SPEC.md` - Complete technical specification
- **REST Optimization**: `.specs/INTELLIGENT_OPTIMIZATION_FORMULA.md` - REST optimization algorithm
- **Architecture**: `.docs/architecture/` - C4 diagrams, sequence diagrams
- **UI Standards**: `CLAUDE.md` - Dark theme + responsive design requirements

---

**Last Updated:** January 29, 2026
**Status:** Planning (Ready for Implementation)
**Priority:** High (POC v2 Feature)
**Estimated Effort:** ~44 hours (~1 week sprint)
