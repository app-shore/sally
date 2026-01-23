# REST-OS Implementation Guide: Route Planning with Dynamic Updates

## Product Vision (Clean Slate)

REST-OS is a **route planning platform** that understands drivers have hours, not infinite time. It plans entire routes, inserts rest/fuel stops, and continuously monitors to update plans when conditions change.

**Core Services:**
1. **Route Planning** - Optimize stop sequence + insert rest/fuel stops
2. **Continuous Monitoring** - Watch for 14 trigger types (HOS, traffic, dock delays, etc.)
3. **Dynamic Updates** - Re-plan when conditions change

**REST Optimization** is now a **component** of route planning (called when HOS shortfall detected), not a standalone service.

---

## Clean API Design (No Baggage)

### Primary Endpoints

**POST /api/v1/routes/plan**
```json
Purpose: Plan a complete route from scratch

Request:
{
  "driver": {
    "id": "uuid",
    "hours_driven": 5.0,
    "on_duty_time": 6.0,
    "hours_since_break": 4.0
  },
  "vehicle": {
    "id": "uuid",
    "fuel_level_percent": 75,
    "fuel_capacity_gallons": 150,
    "mpg": 6.5
  },
  "stops": [
    {
      "id": "uuid",
      "name": "Origin",
      "location_type": "warehouse",
      "is_origin": true
    },
    {
      "id": "uuid",
      "name": "Customer A",
      "location_type": "customer",
      "estimated_dock_hours": 2.0,
      "time_window": {"earliest": "08:00", "latest": "17:00"}
    },
    {
      "id": "uuid",
      "name": "Customer B",
      "location_type": "customer",
      "estimated_dock_hours": 1.5
    },
    {
      "id": "uuid",
      "name": "Destination",
      "is_destination": true
    }
  ],
  "optimization": {
    "priority": "minimize_time" | "minimize_cost" | "balance"
  }
}

Response:
{
  "plan_id": "uuid",
  "version": 1,
  "is_feasible": true,
  "total_time_hours": 22.5,
  "total_distance_miles": 450,

  "segments": [
    {
      "id": "uuid",
      "sequence": 1,
      "type": "drive",
      "from": "Origin",
      "to": "Customer A",
      "distance_miles": 120,
      "drive_time_hours": 2.0,
      "eta": "2025-02-01T10:00:00Z",
      "hos_after": {"hours_driven": 7.0, "on_duty": 8.0}
    },
    {
      "id": "uuid",
      "sequence": 2,
      "type": "dock",
      "location": "Customer A",
      "duration_hours": 2.0,
      "eta_arrival": "2025-02-01T10:00:00Z",
      "eta_departure": "2025-02-01T12:00:00Z",
      "hos_after": {"hours_driven": 7.0, "on_duty": 10.0}
    },
    {
      "id": "uuid",
      "sequence": 3,
      "type": "rest",
      "location": "Truck Stop - Exit 45",
      "rest_type": "full_rest",
      "duration_hours": 10.0,
      "reason": "HOS 11h drive limit will be reached before Customer B",
      "eta_arrival": "2025-02-01T12:30:00Z",
      "eta_departure": "2025-02-01T22:30:00Z",
      "hos_after": {"hours_driven": 0, "on_duty": 0}  // Reset
    },
    {
      "id": "uuid",
      "sequence": 4,
      "type": "fuel",
      "location": "Pilot Travel Center",
      "gallons": 85,
      "cost": 340,
      "eta": "2025-02-01T23:00:00Z"
    },
    ...
  ],

  "compliance": {
    "hos_valid": true,
    "max_drive_hours_used": 10.5,
    "max_duty_hours_used": 13.0,
    "breaks_required": 2,
    "breaks_planned": 2,
    "violations": []
  },

  "summary": {
    "total_drive_segments": 5,
    "total_rest_stops": 2,
    "total_fuel_stops": 1,
    "total_dock_stops": 4
  }
}
```

---

**POST /api/v1/routes/{plan_id}/update**
```json
Purpose: Trigger dynamic update (re-plan or ETA adjust)

Request:
{
  "trigger_type": "dock_time_change" | "hos_approaching_limit" | "driver_rest_request" | ...,
  "trigger_data": {
    // Varies by trigger type

    // For dock_time_change:
    "stop_id": "uuid",
    "actual_dock_hours": 4.0

    // For hos_approaching_limit:
    "limiting_factor": "drive_limit",
    "shortfall_hours": 0.5

    // For driver_rest_request:
    "location": "Current Location",
    "rest_type": "full_rest"
  }
}

Response:
{
  "update_id": "uuid",
  "replan_triggered": true,
  "new_version": 2,  // Incremented

  "new_plan": {
    // Same structure as /plan response
    "plan_id": "uuid (same)",
    "version": 2,
    "segments": [...]
  },

  "impact": {
    "eta_changes": [
      {"stop_id": "uuid", "old_eta": "...", "new_eta": "...", "delay_hours": 2.0}
    ],
    "rest_stops_added": 1,
    "rest_stops_removed": 0,
    "fuel_stops_changed": false
  }
}
```

---

**GET /api/v1/routes/{plan_id}/status**
```json
Purpose: Get current plan status and alerts

Response:
{
  "plan_id": "uuid",
  "version": 2,
  "status": "active" | "completed" | "cancelled",

  "current_segment": {
    "id": "uuid",
    "sequence": 3,
    "type": "drive",
    "from": "Customer A",
    "to": "Truck Stop X",
    "progress_percent": 45,
    "eta": "2025-02-01T14:30:00Z"
  },

  "upcoming_segments": [
    // Next 3 segments
  ],

  "alerts": [
    {
      "type": "hos_warning",
      "severity": "WARNING",
      "message": "Approaching 11h drive limit in 1.5h"
    },
    {
      "type": "appointment_risk",
      "severity": "HIGH",
      "message": "Customer B appointment at risk due to delay"
    }
  ],

  "compliance": {
    "current_drive_hours": 9.5,
    "current_duty_hours": 11.0,
    "hours_until_break": 1.0,
    "next_rest_eta": "2025-02-01T16:00:00Z"
  }
}
```

---

### Legacy Endpoint (Backward Compatible)

**POST /api/v1/optimization/recommend**
```json
Purpose: Get rest recommendation (used by route planner internally)

This endpoint still exists but is now used by the route planner as a component.
Frontend should call /routes/plan instead for full route planning.

Request:
{
  "driver_state": {...},
  "location_type": "dock" | "truck_stop",
  "is_dedicated_rest_stop": false,  // True if route planner inserting rest
  "remaining_route": [...]
}

Response:
{
  "recommendation": "full_rest" | "partial_rest" | "no_rest",
  "duration_hours": 10.0,
  "confidence": 100,
  "reasoning": "...",
  "driver_can_decline": false
}
```

**Note:** This endpoint is now a **component service**, not the primary API. The route planner calls it internally when detecting HOS shortfalls.

---

## Frontend Architecture (Clean Slate)

### Real-Time Parameter Updates (Auto-Update Mode)

**Key Innovation:** As dispatcher adjusts HOS sliders, route updates in real-time without clicking buttons.

**Implementation:**

```tsx
// pages/route-planning/page.tsx

export default function RoutePlanningPage() {
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [routeParams, setRouteParams] = useState<RouteParams>(defaultParams);
  const [currentPlan, setCurrentPlan] = useState<RoutePlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Debounced route planning (500ms delay)
  const debouncedPlanRoute = useMemo(
    () => debounce(async (params: RouteParams) => {
      if (!autoUpdateEnabled) return;

      setIsLoading(true);
      try {
        const response = await api.routes.plan(params);
        setCurrentPlan(response);
        showImpactAlert(currentPlan, response);
      } catch (error) {
        console.error('Auto-update failed:', error);
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [autoUpdateEnabled, currentPlan]
  );

  // Slider change handler
  const handleParamChange = (field: string, value: any) => {
    const newParams = { ...routeParams, [field]: value };
    setRouteParams(newParams);

    // Trigger auto-update
    debouncedPlanRoute(newParams);
  };

  return (
    <div className="flex h-screen">
      {/* Left Panel: Parameters */}
      <div className="w-80 border-r p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Route Parameters</h2>
          <Switch
            checked={autoUpdateEnabled}
            onCheckedChange={setAutoUpdateEnabled}
            label="Auto-Update"
          />
        </div>

        {/* Driver HOS */}
        <section>
          <h3 className="text-sm font-semibold mb-3">Driver HOS</h3>

          <InteractiveSlider
            label="Hours Driven"
            value={routeParams.driver.hours_driven}
            onChange={(val) => handleParamChange('driver.hours_driven', val)}
            min={0}
            max={11}
            step={0.5}
            unit="h"
            impact={getImpactMessage('hours_driven', val, currentPlan)}
            warning={val > 9}
          />

          <InteractiveSlider
            label="On-Duty Time"
            value={routeParams.driver.on_duty_time}
            onChange={(val) => handleParamChange('driver.on_duty_time', val)}
            min={0}
            max={14}
            step={0.5}
            unit="h"
          />

          <InteractiveSlider
            label="Since Last Break"
            value={routeParams.driver.hours_since_break}
            onChange={(val) => handleParamChange('driver.hours_since_break', val)}
            min={0}
            max={10}
            step={0.5}
            unit="h"
          />
        </section>

        {/* Vehicle Fuel */}
        <section>
          <h3 className="text-sm font-semibold mb-3">Vehicle Fuel</h3>

          <InteractiveSlider
            label="Fuel Level"
            value={routeParams.vehicle.fuel_level_percent}
            onChange={(val) => handleParamChange('vehicle.fuel_level_percent', val)}
            min={0}
            max={100}
            step={5}
            unit="%"
            warning={val < 25}
          />
        </section>

        {/* Stops */}
        <section>
          <h3 className="text-sm font-semibold mb-3">Stops</h3>
          <StopManager
            stops={routeParams.stops}
            onChange={(stops) => handleParamChange('stops', stops)}
          />
        </section>

        {/* Manual Plan Button (if auto-update disabled) */}
        {!autoUpdateEnabled && (
          <Button onClick={() => debouncedPlanRoute.flush()} className="w-full">
            Plan Route
          </Button>
        )}
      </div>

      {/* Right Panel: Route Visualization */}
      <div className="flex-1 p-4 space-y-4">
        {/* Impact Alert (shows on changes) */}
        {currentPlan && (
          <ImpactAlert plan={currentPlan} previousPlan={previousPlan} />
        )}

        {/* Route Map */}
        <RouteMap plan={currentPlan} isLoading={isLoading} />

        {/* Segment List */}
        <SegmentList segments={currentPlan?.segments || []} />

        {/* Compliance Panel */}
        <CompliancePanel compliance={currentPlan?.compliance} />
      </div>
    </div>
  );
}
```

**Interactive Slider with Impact Messages:**

```tsx
// components/route-planning/InteractiveSlider.tsx

interface InteractiveSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  impact?: string;  // Show impact of current value
  warning?: boolean;  // Highlight if causes issues
}

export function InteractiveSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  impact,
  warning
}: InteractiveSliderProps) {
  return (
    <div className={cn(
      "space-y-2 p-3 rounded-lg",
      warning && "bg-yellow-50 border-l-4 border-yellow-500"
    )}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-sm font-mono tabular-nums">{value}{unit}</span>
      </div>

      <Slider
        value={[value]}
        onValueChange={([val]) => onChange(val)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />

      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>

      {impact && (
        <div className={cn(
          "text-xs mt-1 flex items-start gap-1",
          warning ? "text-yellow-700" : "text-gray-600"
        )}>
          {warning ? (
            <AlertTriangle className="h-3 w-3 mt-0.5" />
          ) : (
            <Info className="h-3 w-3 mt-0.5" />
          )}
          <span>{impact}</span>
        </div>
      )}
    </div>
  );
}

// Helper: Generate impact message based on parameter value
function getImpactMessage(
  field: string,
  value: number,
  currentPlan: RoutePlan | null
): string | undefined {
  if (!currentPlan) return undefined;

  switch (field) {
    case 'hours_driven':
      if (value > 9) {
        return 'Rest stop will be needed before next customer';
      }
      if (value < 5) {
        return 'No rest stop needed with current route';
      }
      break;

    case 'fuel_level_percent':
      if (value < 25) {
        return 'Fuel stop will be added to route';
      }
      break;
  }

  return undefined;
}
```

**Impact Alert Component:**

```tsx
// components/route-planning/ImpactAlert.tsx

interface ImpactAlertProps {
  plan: RoutePlan;
  previousPlan: RoutePlan | null;
}

export function ImpactAlert({ plan, previousPlan }: ImpactAlertProps) {
  if (!previousPlan) return null;

  const changes = calculatePlanDiff(previousPlan, plan);

  if (changes.length === 0) return null;

  return (
    <div className="space-y-2">
      {changes.map((change, i) => (
        <Alert key={i} variant={change.severity}>
          <change.icon className="h-4 w-4" />
          <AlertTitle>{change.title}</AlertTitle>
          <AlertDescription>{change.description}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

// Calculate diff between plans
function calculatePlanDiff(oldPlan: RoutePlan, newPlan: RoutePlan) {
  const changes = [];

  // Rest stops added
  const oldRestStops = oldPlan.segments.filter(s => s.type === 'rest').length;
  const newRestStops = newPlan.segments.filter(s => s.type === 'rest').length;

  if (newRestStops > oldRestStops) {
    changes.push({
      severity: 'warning',
      icon: AlertTriangle,
      title: 'Rest Stop Added',
      description: `${newRestStops - oldRestStops} rest stop(s) added. ETA delayed by ${calculateDelay(oldPlan, newPlan)}h.`
    });
  }

  if (newRestStops < oldRestStops) {
    changes.push({
      severity: 'success',
      icon: CheckCircle,
      title: 'Rest Stop Removed',
      description: `${oldRestStops - newRestStops} rest stop(s) removed. ETA improved by ${calculateImprovement(oldPlan, newPlan)}h.`
    });
  }

  // Feasibility changed
  if (!oldPlan.is_feasible && newPlan.is_feasible) {
    changes.push({
      severity: 'success',
      icon: CheckCircle,
      title: 'Route Now Feasible',
      description: 'Route is now HOS compliant with updated parameters.'
    });
  }

  if (oldPlan.is_feasible && !newPlan.is_feasible) {
    changes.push({
      severity: 'error',
      icon: XCircle,
      title: 'Route Not Feasible',
      description: 'Route cannot be completed with current HOS state. Rest stops needed.'
    });
  }

  return changes;
}
```

---

## Fleet Ops Use Case: Real-Time Parameter Updates

**Scenario:** Dispatcher needs to assign a driver to a 3-stop route (Origin → A → B → C)

**Workflow:**

1. **Load Route Template**
   - Dispatcher selects route with 3 stops
   - Default parameters loaded (moderate HOS, full fuel)
   - Route automatically planned and displayed

2. **Consider Driver Options** (Auto-Update Enabled)

   **Option 1: Assign Driver John**
   ```
   Adjust "Hours Driven" slider: 5h
   ↓ [500ms debounce]
   Auto-update triggers route re-plan
   ↓
   Result (displayed in real-time):
   - Route feasible ✓
   - 0 rest stops needed
   - Total time: 8h
   - ETA: Complete by 6pm today
   ```

   **Option 2: Assign Driver Sarah**
   ```
   Adjust "Hours Driven" slider: 9h
   ↓ [500ms debounce]
   Auto-update triggers route re-plan
   ↓
   Result (displayed in real-time):
   - ⚠️ Rest stop added after Stop A
   - Total time: 18h (includes 10h rest)
   - ETA: Complete tomorrow 8am
   - Alert: "Rest stop will be needed before Stop B"
   ```

3. **Compare Fuel Impact**
   ```
   Adjust "Fuel Level" slider: 30%
   ↓ [500ms debounce]
   Auto-update triggers route re-plan
   ↓
   Result:
   - Fuel stop added at Exit 45
   - Total time: 8.5h (+30 min)
   ```

4. **Decision**
   - Assign Driver John (faster, no rest needed)
   - **No button clicks needed** - just adjust sliders and watch route update!

---

## Performance Optimizations

**Challenge:** Auto-update on every slider move could cause too many API calls

**Solutions:**

1. **Debouncing (500ms)**
   ```tsx
   const debouncedPlanRoute = useMemo(
     () => debounce(planRoute, 500),
     []
   );
   ```

2. **Request Cancellation**
   ```tsx
   const planRoute = useCallback((params) => {
     // Cancel previous request
     if (abortControllerRef.current) {
       abortControllerRef.current.abort();
     }

     const abortController = new AbortController();
     abortControllerRef.current = abortController;

     api.routes.plan(params, { signal: abortController.signal })
       .then(...)
       .catch(error => {
         if (error.name !== 'AbortError') {
           console.error(error);
         }
       });
   }, []);
   ```

3. **Caching**
   ```tsx
   const cacheKey = hashParams(params);
   if (routeCache.has(cacheKey)) {
     setCurrentPlan(routeCache.get(cacheKey));
     return;
   }
   ```

4. **Progressive Updates**
   ```tsx
   // Update compliance panel immediately (local calculation)
   updateCompliancePanel(params);

   // Update route plan after debounce (API call)
   debouncedPlanRoute(params);
   ```

---

## Summary: Clean Architecture

**No Legacy Baggage:**

| Old Concept | New Concept |
|-------------|-------------|
| `/optimization/recommend` as primary API | `/routes/plan` as primary API |
| REST optimization standalone | REST optimization as component |
| Test single dock decision | Plan entire route with stops |
| Static plan | Dynamic monitoring + updates |
| Manual button clicks | Auto-update from sliders |

**Clean Data Flow:**
```
Frontend Sliders
    ↓ (debounced 500ms)
POST /routes/plan
    ↓
Route Planning Engine
    ├─ TSP Optimization
    ├─ HOS Simulation
    ├─ REST Component (if shortfall detected)
    ├─ Fuel Insertion
    └─ Feasibility Validation
    ↓
Response with Full Plan
    ↓
Frontend Updates:
    ├─ Map (route line + markers)
    ├─ Segment List
    ├─ Compliance Panel
    ├─ Impact Alert
    └─ Slider Impact Messages
```

**Result:**
- Clean, modern API design
- Real-time feedback for fleet ops
- REST optimization seamlessly integrated
- No confusing legacy endpoints
