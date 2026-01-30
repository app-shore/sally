# Route Planning Components

Comprehensive route planning UI with dispatcher and driver views.

## Architecture

### Component Organization

```
route-planner/
├── core/                   # Main cockpit and navigation
│   ├── RoutePlanningCockpit.tsx       # Main container with 5-tab navigation
│   ├── RouteHeader.tsx                # Plan metadata banner
│   └── RoutePlanningCockpitSkeleton.tsx  # Loading state
│
├── overview/               # Overview Tab (Executive Summary)
│   ├── OverviewTab.tsx                # Tab container
│   ├── RouteKPICards.tsx              # 6 metric cards
│   ├── SegmentBreakdownSummary.tsx    # Collapsible segment counts
│   └── QuickMetricsGrid.tsx           # Key operational metrics
│
├── timeline/               # Timeline Tab (Gantt Visualization)
│   ├── TimelineTab.tsx                # Tab container
│   └── RouteTimelineVisualizer.tsx    # SVG Gantt chart ⭐
│
├── compliance/             # Compliance Tab (HOS Audit)
│   ├── ComplianceTab.tsx              # Tab container
│   ├── ComplianceReport.tsx           # Full audit view
│   └── RESTDecisionLog.tsx            # REST decision audit trail
│
├── costs/                  # Costs Tab (Financial Analysis)
│   ├── CostsTab.tsx                   # Tab container
│   ├── CostBreakdownChart.tsx         # Recharts pie chart
│   ├── FuelStopDetails.tsx            # Fuel stop analysis
│   └── EfficiencyMetrics.tsx          # Performance scoring
│
├── driver/                 # Driver View (Mobile-Optimized)
│   ├── DriverTimeline.tsx             # Vertical timeline
│   ├── DriverCurrentStatus.tsx        # Current location/next stop
│   ├── DriverHOSSummary.tsx           # Simple HOS bars
│   └── DriverActions.tsx              # Action buttons
│
├── shared/                 # Shared Components
│   ├── LoadSelector.tsx               # Load selection
│   ├── DriverSelector.tsx             # Driver selection
│   ├── VehicleSelector.tsx            # Vehicle selection
│   └── ComplianceStatus.tsx           # Basic HOS status
│
└── deprecated/             # Old Components (To Remove)
    ├── RouteMapView.tsx               # Placeholder (replaced)
    ├── TimelineDrawer.tsx             # Old drawer (replaced)
    └── SegmentsTimeline.tsx           # Old list view (replaced)
```

## Views

### Dispatcher View: Route Planning Cockpit

**Route:** `/dispatcher/create-plan`

**Purpose:** Comprehensive route planning and analysis for dispatchers

**Tabs:**

1. **Overview** - Executive summary answering "Can this work?"
   - 6 KPI cards (Distance, Time, HOS, Cost, Efficiency, ETA)
   - Segment breakdown by type
   - Quick metrics grid

2. **Timeline** ⭐ - Time-based Gantt visualization
   - SVG timeline with auto-scaling time axis (0-48h+)
   - Color-coded segment bars:
     - Green: Drive segments
     - Blue: Rest stops
     - Orange: Fuel stops
     - Purple: Dock stops
   - HOS overlay (purple line showing drive hours consumed)
   - Interactive click/hover with segment details
   - Framer Motion animations

3. **Map** - Geographic visualization (Phase 2)
   - Placeholder for Mapbox integration
   - Will show stop markers, route polyline

4. **Compliance** - Audit-ready HOS compliance
   - HOS progress bars (drive 11h, on-duty 14h, since-break 8h)
   - Color-coded: green (<75%), yellow (75-90%), red (>90%)
   - Breaks required vs planned
   - REST decision log with complete audit trail
   - Export functionality

5. **Costs** - Financial breakdown
   - Recharts pie chart (Fuel, Time, Delays)
   - Fuel stop details with alternatives
   - Efficiency metrics (deadhead %, route efficiency)

### Driver View: Mobile Timeline

**Route:** `/driver/route`

**Purpose:** Simple, mobile-optimized timeline answering "What's my day look like?"

**Components:**
- Current location and next stop
- Simple HOS summary (3 progress bars)
- Vertical timeline (chronological top to bottom)
- Large touch targets (44px+ for mobile)
- Action buttons (request change, report delay)

## Usage

### Dispatcher: Creating a Route Plan

```tsx
import RoutePlanningCockpit from '@/components/route-planner/core/RoutePlanningCockpit';
import { useRoutePlanStore } from '@/lib/store/routePlanStore';

export default function CreatePlanPage() {
  const { currentPlan } = useRoutePlanStore();

  return (
    <>
      {/* Input selectors */}
      <LoadSelector />
      <DriverSelector />
      <VehicleSelector />

      {/* Results */}
      {currentPlan && <RoutePlanningCockpit />}
    </>
  );
}
```

### Driver: Viewing Route

```tsx
import DriverTimeline from '@/components/route-planner/driver/DriverTimeline';
import { useRoutePlanStore } from '@/lib/store/routePlanStore';

export default function DriverRoutePage() {
  const { currentPlan } = useRoutePlanStore();

  return (
    <>
      <DriverCurrentStatus plan={currentPlan} />
      <DriverHOSSummary plan={currentPlan} />
      <DriverTimeline plan={currentPlan} />
      <DriverActions plan={currentPlan} />
    </>
  );
}
```

## Data Structure

All components consume `RoutePlan` from the store:

```typescript
interface RoutePlan {
  plan_id: string;
  plan_version: number;
  is_feasible: boolean;
  feasibility_issues: string[];
  segments: RouteSegment[];           // Core data
  total_distance_miles: number;
  total_time_hours: number;
  total_cost_estimate: number;
  rest_stops: RestStopInfo[];
  fuel_stops: FuelStopInfo[];
  summary: RouteSummary;
  compliance_report: ComplianceReport; // HOS data
  input_snapshot?: PlanInputSnapshot;
}
```

## UI Standards (CRITICAL)

All components follow `.docs/DARK_THEME_IMPLEMENTATION.md`:

### ✅ Dark Theme Support
- Use semantic color tokens: `bg-background`, `text-foreground`, `border-border`
- Status colors with dark variants: `bg-green-50 dark:bg-green-950/20`
- NO hardcoded colors without dark mode support

### ✅ Shadcn UI Components
- ALWAYS use Shadcn components: `Button`, `Card`, `Badge`, `Tabs`, etc.
- NEVER use plain HTML: `<button>`, `<input>`, `<div>` for UI elements

### ✅ Responsive Design
- Mobile-first: Start with mobile layout, add larger breakpoint variants
- Breakpoints: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`
- Test at: 375px (mobile), 768px (tablet), 1440px (desktop)

### ✅ Color Palette
- Black, White, Gray shades only
- Status indicators allowed: red, yellow, green, blue (with dark variants)

## Performance

### Timeline Rendering Benchmarks
- 20 segments: < 100ms render
- 50 segments: < 300ms render
- Smooth 60fps scroll

### Optimizations
- `React.memo` for segment components
- Framer Motion animations (GPU-accelerated)
- Responsive SVG with auto-scaling

## Testing Checklist

Before deploying, verify:

- [ ] All 5 tabs render correctly
- [ ] Timeline shows accurate time axis
- [ ] Segment bars render with correct colors
- [ ] HOS overlay shows accurate hours consumed
- [ ] Click segment → Shows details
- [ ] Hover segment → Shows tooltip
- [ ] REST optimization reasoning visible
- [ ] Compliance report shows all HOS metrics
- [ ] Cost breakdown chart renders
- [ ] Driver timeline shows chronological segments
- [ ] Dark theme works (all components)
- [ ] Responsive at 375px, 768px, 1440px
- [ ] No console errors
- [ ] Performance acceptable (<300ms timeline)
- [ ] Keyboard navigation works
- [ ] Screen reader compatible

## Migration from Old Components

Old components moved to `deprecated/`:
- `RouteMapView.tsx` → Will rebuild in Phase 2
- `TimelineDrawer.tsx` → Replaced by RoutePlanningCockpit
- `SegmentsTimeline.tsx` → Replaced by Timeline Tab

Shared components kept:
- `LoadSelector.tsx` ✅
- `DriverSelector.tsx` ✅
- `VehicleSelector.tsx` ✅
- `ComplianceStatus.tsx` ✅

## Future Enhancements (Phase 2)

1. **Map Integration**
   - Mapbox GL JS integration
   - Stop markers (numbered 1, 2, 3...)
   - Route polyline
   - REST/Fuel stop icons

2. **Real-time Updates**
   - WebSocket connection for live route updates
   - Driver location tracking
   - Dynamic ETA adjustments

3. **Advanced Analytics**
   - Historical route comparison
   - Driver performance trends
   - Cost optimization recommendations

## Support

For questions or issues:
- See `.specs/features/01-route-planning/FEATURE_SPEC.md`
- See `.docs/DARK_THEME_IMPLEMENTATION.md`
- Contact: Product & Engineering Team

---

**Last Updated:** January 30, 2026
**Status:** ✅ Production Ready (except Map integration - Phase 2)
