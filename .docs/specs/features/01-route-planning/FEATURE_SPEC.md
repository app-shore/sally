# SALLY Route Planning System - Complete Specification

## Executive Summary

SALLY transforms from a **tactical rest optimizer** to a **strategic route planning platform** with continuous HOS monitoring and dynamic updates.

**Key Pivot:**
- **Before:** "Should I extend rest at this dock?" (single decision point)
- **After:** "Plan entire route with rest stops, fuel stops, HOS compliance, and continuously monitor/update as conditions change" (end-to-end routing)

**Core Architecture:**
```
Route Planning (Initial) → Continuous Monitoring → Dynamic Updates → Re-Planning
         ↓                         ↓                      ↓              ↓
    Optimized route          14 trigger types      Threshold checks    New route v2
    with rest/fuel           monitored 24/7        decide re-plan      preserves history
```

---

## System Architecture Overview

### Three-Layer Architecture

**Layer 1: Route Planning Engine** (Initial route generation)
- Input: Driver, truck, stops
- Output: Optimized route with rest/fuel stops
- Runs once when route is created

**Layer 2: Continuous Monitoring Service** (Background daemon)
- Monitors 14 trigger types across 5 categories
- Runs every 60 seconds per active route
- **Proactive HOS monitoring** (warn before violations)
- **Reactive violation handling** (force rest after violations)

**Layer 3: Dynamic Update Handler** (Re-planning orchestrator)
- Receives triggers from Layer 2
- Decides: Re-plan vs ETA update only
- Invokes Layer 1 to generate new route
- Notifies driver of changes

---

## Core Components

### 1. Route Planning Engine (Initial Planning)

**Purpose:** Generate optimal route from scratch

**Algorithm Flow:**
```
1. Input: Driver (HOS state), Truck (fuel), Stops (N locations)
    ↓
2. Distance Matrix: Calculate N x N distances (static OSM data)
    ↓
3. TSP Optimization: Find optimal stop sequence
   - Greedy nearest-neighbor + 2-opt (MVP)
   - Respect time windows
   - Minimize total time OR total cost
    ↓
4. Route Simulation (segment-by-segment):
   FOR each segment:
     - Calculate drive time (distance / avg_speed)
     - Track HOS consumption (drive hours, duty hours)
     - Check fuel level (distance / MPG)

     IF hours_remaining < hours_needed:
       → CALL REST Optimization Engine
       → INSERT rest stop (full 10h or partial 7h)
       → UPDATE HOS state (reset hours after rest)

     IF fuel_remaining < threshold (25%):
       → INSERT fuel stop
       → Find cheapest station on route
       → UPDATE fuel level

     IF break_required (8h since last break):
       → INSERT 30-min break (counts as on-duty)

     UPDATE HOS state after segment
    ↓
5. Feasibility Validation:
   - HOS compliant? ✅/❌
   - Appointments met? ✅/❌
   - Route feasible? ✅/❌
    ↓
6. Return RouteOptimizationResult:
   - List of segments (drive, rest, fuel, dock)
   - Total distance, time, cost
   - HOS compliance report
   - Feasibility status
```

**Key Integration Point with REST Optimization:**
```python
# Route planner detects HOS shortfall
if hours_remaining < hours_needed_for_next_segment:
    # Call REST Optimization Engine
    rest_recommendation = rest_engine.recommend_rest(
        driver_state=current_hos,
        location_type='truck_stop',  # or 'dock' if at waypoint
        remaining_route=remaining_segments,
        is_dedicated_rest_stop=True  # Planner is inserting rest stop
    )

    if rest_recommendation.recommendation == 'FULL_REST':
        # Insert 10h rest stop segment
        segments.append(RouteSegment(
            type='rest',
            location=find_nearest_truck_stop(),
            rest_type='full_rest',
            duration_hours=10,
            reason=rest_recommendation.reasoning
        ))

        # Reset HOS after rest
        current_hos.hours_driven = 0
        current_hos.on_duty_time = 0
```

**REST Optimization Engine Role:**
- **Not replaced, enhanced**
- Still evaluates "should driver rest at this location?"
- Now supports:
  - Arbitrary locations (truck stops, not just docks)
  - Full route context (remaining stops, not just next trip)
  - Dedicated rest stops (confidence 100%, always rest)
  - Opportunistic rest (leverage dock time if beneficial)

---

### 2. Continuous Monitoring Service (Background Daemon)

**Purpose:** Monitor route execution 24/7, detect conditions requiring updates

**Architecture:**
```python
# Background service (Celery worker or async task)

class RouteMonitorService:
    """
    Runs continuously for each active route.
    Checks 14 trigger types every 60 seconds.
    """

    async def monitor_active_routes(self):
        """
        Main loop - monitors all active routes.
        """
        while True:
            active_routes = await get_all_active_route_plans()

            for route in active_routes:
                try:
                    await self.check_route(route.plan_id)
                except Exception as e:
                    logger.error(f"Monitoring failed for {route.plan_id}: {e}")

            await asyncio.sleep(60)  # Check every minute


    async def check_route(self, plan_id):
        """
        Run all 14 trigger checks for a single route.
        """
        handler = DynamicUpdateHandler()

        # Category 1: External Events (4 triggers)
        await handler.check_traffic_updates(plan_id)
        await handler.check_dock_time_changes(plan_id)
        await handler.check_load_changes(plan_id)
        await handler.check_driver_rest_requests(plan_id)

        # Category 2: HOS Compliance (3 triggers) - CRITICAL
        await handler.check_hos_approaching_limits(plan_id)  # PROACTIVE
        await handler.check_hos_violations(plan_id)          # REACTIVE
        await handler.check_rest_completion_status(plan_id)

        # Category 3: Vehicle/Operational (3 triggers)
        await handler.check_fuel_level(plan_id)
        await handler.check_speed_pace_deviations(plan_id)
        # await handler.check_vehicle_status(plan_id)  # Phase 2

        # Category 4: Appointment/Customer (2 triggers)
        await handler.check_appointment_changes(plan_id)
        # await handler.check_dock_availability(plan_id)

        # Category 5: Environmental (2 triggers - Phase 2)
        # await handler.check_weather_conditions(plan_id)
        # await handler.check_weigh_station_delays(plan_id)
```

**Trigger Detection → Action Flow:**
```
Trigger Detected (e.g., HOS approaching limit)
    ↓
Analyze Impact (calculate shortfall, affected stops)
    ↓
Determine Priority (CRITICAL, HIGH, MEDIUM)
    ↓
Decide Action:
    - CRITICAL: Always re-plan (safety/compliance)
    - HIGH: Re-plan if impact > 1h
    - MEDIUM: Update ETAs only
    ↓
If re-plan needed:
    - Create RoutePlanUpdate record (audit trail)
    - Invoke Route Planning Engine (generate new plan)
    - Increment plan version (v1 → v2)
    - Notify driver (push notification or in-app alert)
    ↓
If ETA update only:
    - Recalculate ETAs for remaining segments
    - Update database (no new plan version)
    - Send alert to driver ("ETA updated")
```

---

### 3. Dynamic Update Handler (Re-Planning Orchestrator)

**Purpose:** Coordinate re-planning when triggers detected

**Complete Trigger Catalog:**

| # | Trigger | Category | Priority | Action | Phase |
|---|---------|----------|----------|--------|-------|
| 1 | Traffic delay | External | HIGH | Adjust route or insert rest | 1 (MVP) |
| 2 | Dock time change | External | HIGH | Re-calculate HOS, suggest rest | 1 (MVP) |
| 3 | Load added/cancelled | External | HIGH | Re-sequence stops | 1 (MVP) |
| 4 | Driver rest request | External | HIGH | Update HOS, re-plan | 1 (MVP) |
| 5 | HOS approaching limits | HOS (Proactive) | HIGH | Insert rest stop | 1 (MVP) |
| 6 | HOS violations | HOS (Reactive) | CRITICAL | Mandatory rest immediate | 1 (MVP) |
| 7 | Rest duration changed | HOS | MEDIUM | Update HOS, re-plan remaining | 1 (MVP) |
| 8 | Fuel low | Vehicle | HIGH | Insert fuel stop | 1 (MVP) |
| 9 | Vehicle breakdown | Vehicle | CRITICAL | Stop route, notify dispatch | 2 |
| 10 | Speed deviation | Vehicle | MEDIUM | Update ETAs | 1 (MVP) |
| 11 | Appointment changed | Customer | MEDIUM/HIGH | Re-sequence or adjust timing | 1 (MVP) |
| 12 | Dock unavailable | Customer | HIGH | Skip stop, re-sequence | 2 |
| 13 | Weather events | Environmental | MEDIUM/HIGH | Adjust speeds, insert rest | 2 |
| 14 | Weigh station delay | Environmental | MEDIUM | Add on-duty time, check HOS | 2 |

**Re-Plan Decision Matrix:**
```python
def should_replan(trigger_type, priority, impact_data):
    """
    Central decision logic for all trigger types.

    Returns:
        {
            'replan_triggered': bool,
            'action': str,  # What to do
            'reason': str   # Why
        }
    """

    # CRITICAL: Always re-plan immediately
    if priority == 'CRITICAL':
        return {
            'replan_triggered': True,
            'action': impact_data.get('action', 'MANDATORY_REST'),
            'reason': 'Critical safety/compliance issue',
            'notify': 'IMMEDIATE'  # Push notification
        }

    # HIGH: Re-plan if significant impact
    if priority == 'HIGH':
        impact_hours = calculate_route_impact(impact_data)
        appointments_at_risk = check_appointment_risk(impact_data)

        if impact_hours > 1 or appointments_at_risk:
            return {
                'replan_triggered': True,
                'action': impact_data.get('action', 'RE_SEQUENCE'),
                'reason': f'High impact: {impact_hours:.1f}h delay or appointment risk',
                'notify': 'ALERT'
            }
        else:
            return {
                'replan_triggered': False,
                'action': 'UPDATE_ETAS',
                'reason': 'Impact below threshold (<1h)',
                'notify': 'INFO'
            }

    # MEDIUM: ETA update only (no re-plan)
    if priority == 'MEDIUM':
        return {
            'replan_triggered': False,
            'action': 'UPDATE_ETAS',
            'reason': 'Medium priority, ETA adjustment sufficient',
            'notify': 'INFO'
        }
```

---

## HOS Compliance Monitoring (Most Critical Feature)

### Proactive Monitoring (Prevent Violations)

**Continuous Simulation:**
```python
def check_hos_approaching_limits(plan_id, driver_id):
    """
    Every 60 seconds:
        1. Get current driver HOS state
        2. Get remaining route segments
        3. Simulate HOS consumption for remaining route
        4. Detect if driver will run out of hours
        5. If yes, trigger rest stop insertion BEFORE violation
    """

    driver = get_current_hos_state(driver_id)
    remaining_route = get_remaining_segments(plan_id)

    # Calculate available hours
    hours_drive_available = 11 - driver.hours_driven
    hours_duty_available = 14 - driver.on_duty_time
    hours_until_break = 8 - driver.hours_since_break

    # Simulate remaining route
    total_drive_needed = 0
    total_duty_needed = 0

    for segment in remaining_route:
        if segment.type == 'drive':
            total_drive_needed += segment.drive_time_hours
            total_duty_needed += segment.drive_time_hours

        if segment.type == 'dock':
            total_duty_needed += segment.dock_duration_hours

    # PROACTIVE TRIGGER 1: Will exceed drive limit
    if total_drive_needed > hours_drive_available:
        shortfall = total_drive_needed - hours_drive_available
        logger.warning(f"Driver {driver_id} will run out of drive hours in {hours_drive_available:.1f}h. Shortfall: {shortfall:.1f}h")

        return trigger_replan(
            trigger_type='hos_drive_limit_approaching',
            priority='HIGH',
            action='INSERT_REST_STOP',
            message=f'You will run out of drive hours in {hours_drive_available:.1f}h. Rest stop will be added to route.'
        )

    # PROACTIVE TRIGGER 2: Will exceed duty window
    if total_duty_needed > hours_duty_available:
        shortfall = total_duty_needed - hours_duty_available
        logger.warning(f"Driver {driver_id} will exceed 14h duty window. Shortfall: {shortfall:.1f}h")

        return trigger_replan(
            trigger_type='hos_duty_limit_approaching',
            priority='HIGH',
            action='INSERT_REST_STOP',
            message=f'You will exceed 14h duty window. Rest stop will be added to route.'
        )

    # PROACTIVE TRIGGER 3: Break required soon
    if hours_until_break < 1:  # Within 1 hour of break requirement
        logger.info(f"Driver {driver_id} will need 30-min break in {hours_until_break:.1f}h")

        return trigger_replan(
            trigger_type='break_required_soon',
            priority='MEDIUM',
            action='INSERT_BREAK',
            message=f'30-minute break required in {hours_until_break * 60:.0f} minutes'
        )

    # WARNING (not re-plan): Tight on hours
    if hours_drive_available < 2 or hours_duty_available < 2:
        return send_alert(
            type='hos_warning',
            severity='WARNING',
            message=f'HOS approaching limits: {hours_drive_available:.1f}h drive, {hours_duty_available:.1f}h duty remaining'
        )
```

**Key Insight:**
By simulating the route every 60 seconds, we detect violations **before they happen** and proactively insert rest stops. Driver never has to worry about running out of hours.

---

### Reactive Monitoring (Handle Violations)

**Should rarely trigger if proactive monitoring works:**
```python
def check_hos_violations(plan_id, driver_id):
    """
    Detect if driver has already violated HOS rules.

    This should be rare - only happens if:
        - Proactive monitoring missed it
        - Driver ignored warnings
        - Dock time unexpectedly long
    """

    driver = get_current_hos_state(driver_id)

    # VIOLATION 1: Exceeded 11h drive limit
    if driver.hours_driven > 11:
        logger.critical(f"HOS VIOLATION: Driver {driver_id} exceeded 11h drive limit ({driver.hours_driven:.1f}h)")

        return trigger_replan(
            trigger_type='hos_violation_drive',
            priority='CRITICAL',
            action='MANDATORY_REST_IMMEDIATE',
            message='HOS VIOLATION: You have exceeded the 11-hour drive limit. You MUST take a 10-hour rest immediately.'
        )

    # VIOLATION 2: Exceeded 14h duty window
    if driver.on_duty_time > 14:
        logger.critical(f"HOS VIOLATION: Driver {driver_id} exceeded 14h duty window ({driver.on_duty_time:.1f}h)")

        return trigger_replan(
            trigger_type='hos_violation_duty',
            priority='CRITICAL',
            action='MANDATORY_REST_IMMEDIATE',
            message='HOS VIOLATION: You have exceeded the 14-hour duty window. You MUST take a 10-hour rest immediately.'
        )

    # VIOLATION 3: Missed 30-min break
    if driver.hours_since_break > 8:
        logger.critical(f"HOS VIOLATION: Driver {driver_id} missed 30-min break ({driver.hours_since_break:.1f}h without break)")

        return trigger_replan(
            trigger_type='break_violation',
            priority='CRITICAL',
            action='MANDATORY_BREAK_IMMEDIATE',
            message='HOS VIOLATION: You have driven 8+ hours without a 30-minute break. You MUST take a break immediately.'
        )
```

---

## REST Optimization Engine (Enhanced Role)

**Status:** Not replaced, enhanced to support route planning context

**Before (Original SALLY):**
- Input: Driver HOS, dock time, single next trip
- Output: Should extend rest at dock? (FULL_REST, PARTIAL_REST, NO_REST)

**After (Enhanced for Route Planning):**
- Input: Driver HOS, location (dock OR truck stop), **full remaining route**
- Output: Same recommendation types, but with full route context

**Enhanced Input Schema:**
```python
class RestOptimizationRequest:
    # Existing fields
    driver_id: str
    hours_driven: float
    on_duty_time: float
    hours_since_break: float
    dock_duration_hours: float  # 0 if not at dock

    # NEW FIELDS (for route planning integration)
    location_type: Literal['dock', 'truck_stop', 'service_area']
    is_dedicated_rest_stop: bool  # True if route planner inserted this stop for rest
    remaining_route: List[TripRequirement]  # All upcoming segments, not just next trip

    # Optional context
    current_location: str
    nearest_truck_stops: List[str]  # For finding rest locations
```

**Decision Logic Enhancement:**
```python
def recommend_rest(request: RestOptimizationRequest):
    """
    Enhanced to support route planning context.
    """

    # CASE 1: Dedicated rest stop (inserted by route planner)
    if request.is_dedicated_rest_stop:
        # This stop exists specifically for rest
        # Always recommend full rest
        return OptimizationResponse(
            recommendation='FULL_REST',
            recommended_duration_hours=10,
            confidence=100,
            reasoning='This is a planned rest stop. Take full 10-hour rest to reset HOS.',
            driver_can_decline=False  # Mandatory (route requires it)
        )

    # CASE 2: Opportunistic rest at dock
    if request.location_type == 'dock' and request.dock_duration_hours > 0:
        # Existing SALLY logic (unchanged)
        # Evaluate if dock time should be extended to rest
        return _evaluate_dock_rest_opportunity(request)

    # CASE 3: No dock, no dedicated rest stop (shouldn't happen in route planning)
    # This is the old "single trip evaluation" mode
    return _evaluate_single_trip_rest(request)


def _evaluate_dock_rest_opportunity(request):
    """
    Existing SALLY logic (unchanged).

    Evaluates:
        - Feasibility: Can driver complete remaining route?
        - Opportunity: Is dock time suitable for rest extension?
        - Cost: How much extra time to extend to full rest?

    Returns recommendation with confidence score.
    """
    # This is the existing intelligent formula
    # (already implemented in current SALLY)
    feasibility = _calculate_feasibility(request)
    opportunity = _calculate_rest_opportunity(request)
    cost = _calculate_rest_cost(request)

    return _optimize_rest_decision(feasibility, opportunity, cost)
```

**Integration with Route Planner:**
```
Route Planner: "Driver will run out of hours after Stop B"
    ↓
Route Planner: "I need to insert a rest stop"
    ↓
Call REST Optimization Engine:
    Request {
        location_type: 'truck_stop',
        is_dedicated_rest_stop: True,
        remaining_route: [Stop C, Stop D, ...],
        ...
    }
    ↓
REST Engine: "This is a dedicated rest stop → FULL_REST (10h)"
    ↓
Route Planner: "Insert 10h rest segment at Truck Stop X"
```

**Key Point:**
REST Optimization Engine remains the **single source of truth** for rest decisions. Route planner doesn't hard-code rest logic—it calls REST engine and follows its recommendation.

---

## Data Flow: Complete Route Lifecycle

### Phase 1: Initial Route Planning

```
User (Dispatcher) Actions:
├─ Select driver (auto-populates HOS state)
├─ Add stops (origin, waypoints, destination)
├─ Set optimization priority (time vs cost)
└─ Click "Plan Route"
    ↓
Frontend:
├─ Validate inputs (Zod schemas)
├─ Send POST /api/v1/route-planning/optimize
    ↓
Backend API:
├─ Create RouteOptimizationRequest
├─ Invoke Route Planning Engine
    ↓
Route Planning Engine:
├─ Calculate distance matrix (N x N)
├─ Run TSP optimization (stop sequence)
├─ Simulate route segment-by-segment:
│  ├─ Track HOS (drive hours, duty hours)
│  ├─ Detect HOS shortfall → Call REST Engine → Insert rest
│  ├─ Track fuel → Insert fuel stops if needed
│  └─ Update HOS state after each segment
├─ Validate HOS compliance
└─ Return RouteOptimizationResult
    ↓
Database:
├─ Create RoutePlan record (plan_id, version=1)
├─ Create RouteSegment records (N segments)
├─ Update Route.active_plan_id
    ↓
Backend Response:
├─ Full optimized route
├─ Segment list with ETAs
├─ HOS compliance report
├─ Feasibility status
    ↓
Frontend:
├─ Display route on map
├─ Show segment timeline
├─ Show compliance panel
└─ "Activate Route" button
    ↓
User clicks "Activate Route":
    ↓
Backend starts Continuous Monitoring Service:
└─ monitor_route_execution(plan_id) # runs every 60s
```

---

### Phase 2: Continuous Monitoring (Background)

```
Every 60 seconds for each active route:
    ↓
Continuous Monitoring Service:
├─ Get current route plan
├─ Get current driver HOS state
├─ Get current vehicle state
    ↓
Run 14 Trigger Checks:
├─ Category 1: External Events
│  ├─ Traffic delays?
│  ├─ Dock time changed?
│  ├─ Load added/cancelled?
│  └─ Driver rest request?
├─ Category 2: HOS Compliance (CRITICAL)
│  ├─ HOS approaching limits? (PROACTIVE)
│  ├─ HOS violations? (REACTIVE)
│  └─ Rest duration changed?
├─ Category 3: Vehicle
│  ├─ Fuel low?
│  └─ Speed deviation?
├─ Category 4: Customer
│  └─ Appointment changed?
└─ Category 5: Environmental (Phase 2)
    ↓
Trigger Detected?
├─ NO → Continue monitoring (sleep 60s)
└─ YES → Analyze impact
    ↓
Dynamic Update Handler:
├─ Calculate impact (hours, appointments, feasibility)
├─ Determine priority (CRITICAL, HIGH, MEDIUM)
├─ Decide: Re-plan or ETA update?
    ↓
Decision:
├─ CRITICAL Priority → Always re-plan
├─ HIGH Priority → Re-plan if impact > 1h
└─ MEDIUM Priority → Update ETAs only
```

---

### Phase 3: Dynamic Update (Re-Planning)

**Example: Dock time exceeded estimate (2h → 4h)**

```
Driver reports: "Dock taking 4h instead of 2h"
    ↓
Monitoring Service detects: dock_time_change trigger
    ↓
Dynamic Update Handler:
├─ Calculate impact:
│  ├─ Extra 2h on-duty consumed
│  ├─ New HOS state: 12h on-duty (was 10h)
│  ├─ Remaining route needs: 5h drive + 2h dock = 7h on-duty
│  ├─ Hours available: 14 - 12 = 2h
│  └─ Feasible? NO (need 7h, have 2h)
├─ Priority: CRITICAL (route not feasible)
└─ Decision: TRIGGER RE-PLAN
    ↓
Create RoutePlanUpdate record:
├─ update_type: 'dock_time_change'
├─ trigger_data: {actual_dock: 4h, estimated_dock: 2h, variance: 2h}
├─ replan_triggered: True
    ↓
Invoke Route Planning Engine:
├─ Input: Current location, updated HOS state, remaining stops
├─ Consider: Can leverage extended dock time for rest?
│  └─ Call REST Engine: "Dock is 4h, close to 7h partial rest. Extend?"
│      └─ REST Engine: "Yes, extend to 7h partial rest (7/3 split)"
├─ Updated plan:
│  ├─ Segment 1: Stop A dock + PARTIAL REST (7h total) ← EXTENDED
│  ├─ Segment 2: Stop A → Stop B (3h drive)
│  ├─ Segment 3: Stop B → Stop C (2h drive)
│  └─ Segment 4: Stop C → Destination (1h)
└─ Return new RouteOptimizationResult
    ↓
Database:
├─ Increment RoutePlan.plan_version (1 → 2)
├─ Update RouteSegment records (new plan)
├─ Keep old segments (history)
    ↓
Notify Driver:
├─ Push notification: "Route updated"
├─ In-app alert: "Dock time extended to 7h partial rest. Remaining route adjusted."
├─ Highlight changes in UI
    ↓
Driver Action:
└─ Review new plan, accept, continue
```

---

### Phase 4: Route Completion

```
Driver completes final segment
    ↓
POST /api/v1/route-planning/complete/{plan_id}
    ↓
Backend:
├─ Update RoutePlan.status = 'completed'
├─ Update all RouteSegment.status = 'completed'
├─ Stop continuous monitoring
├─ Generate completion report:
│  ├─ Actual vs estimated time
│  ├─ Actual vs estimated fuel
│  ├─ Number of re-plans
│  ├─ HOS compliance adherence
│  └─ Driver acceptance rate (on optional recommendations)
└─ Store for analytics
    ↓
Response:
└─ Completion summary
    ↓
Frontend:
└─ Show completion report, suggest optimizations for future
```

---

## Database Schema (Complete)

### New Models

**RoutePlan**
```python
class RoutePlan:
    plan_id: UUID (PK)
    route_id: UUID (FK to Route, optional)
    driver_id: UUID (FK to Driver)
    vehicle_id: UUID (FK to Vehicle)

    # Metadata
    created_at: Timestamp (indexed)
    plan_version: Integer (1, 2, 3... for re-plans)
    is_active: Boolean (only one active per route)
    status: Enum (draft, active, completed, cancelled)

    # Optimization
    optimization_priority: Enum (minimize_time, minimize_cost, balance)

    # Results
    total_distance_miles: Float
    total_drive_time_hours: Float
    total_on_duty_time_hours: Float
    total_cost_estimate: Float

    # Feasibility
    is_feasible: Boolean
    feasibility_issues: JSON

    # Relationships
    segments: List[RouteSegment]
    updates: List[RoutePlanUpdate]
```

**RouteSegment**
```python
class RouteSegment:
    segment_id: UUID (PK)
    plan_id: UUID (FK to RoutePlan)
    sequence_order: Integer

    # Type
    segment_type: Enum (drive, rest, fuel, dock)

    # Locations
    from_location: String
    to_location: String
    from_lat_lon: JSON
    to_lat_lon: JSON

    # Drive segment
    distance_miles: Float (nullable)
    drive_time_hours: Float

    # Rest segment
    rest_type: Enum (full_rest, partial_rest, break) (nullable)
    rest_duration_hours: Float (nullable)
    rest_reason: Text

    # Fuel segment
    fuel_gallons: Float (nullable)
    fuel_cost_estimate: Float (nullable)
    fuel_station_name: String (nullable)

    # Dock segment
    dock_duration_hours: Float (nullable)
    customer_name: String (nullable)
    appointment_time: Timestamp (nullable)

    # HOS state AFTER this segment
    hos_state_after: JSON ({hours_driven, on_duty_time, hours_since_break})

    # Time
    estimated_arrival: Timestamp
    estimated_departure: Timestamp
    actual_arrival: Timestamp (nullable)
    actual_departure: Timestamp (nullable)

    # Status
    status: Enum (planned, in_progress, completed, skipped)
```

**RoutePlanUpdate** (Audit trail for all dynamic updates)
```python
class RoutePlanUpdate:
    update_id: UUID (PK)
    plan_id: UUID (FK to RoutePlan)

    # Trigger
    update_type: Enum (
        # External
        traffic_delay, dock_time_change, load_added, load_cancelled, driver_rest_request,
        # HOS
        hos_drive_limit_approaching, hos_duty_limit_approaching, break_required_soon,
        hos_violation_drive, hos_violation_duty, break_violation,
        rest_duration_changed,
        # Vehicle
        fuel_low, speed_deviation, vehicle_breakdown,
        # Customer
        appointment_changed, dock_unavailable,
        # Environmental
        weather_event, weigh_station_delay
    )

    triggered_at: Timestamp (indexed)
    triggered_by: Enum (system, driver, dispatcher)

    # Details
    trigger_data: JSON  # Specific data for trigger type

    # Decision
    replan_triggered: Boolean
    replan_reason: Text (nullable)
    priority: Enum (CRITICAL, HIGH, MEDIUM)
    action: String  # What action was taken

    # Result
    previous_plan_version: Integer
    new_plan_version: Integer (nullable if no re-plan)
```

**Stop**
```python
class Stop:
    stop_id: UUID (PK)

    # Location
    name: String
    address: String
    city, state, zip_code: String
    lat_lon: JSON

    # Type
    location_type: Enum (warehouse, customer, distribution_center, truck_stop, service_area, fuel_station)

    # Time windows
    earliest_arrival: Time (nullable)
    latest_arrival: Time (nullable)

    # Dock info
    average_dock_time_hours: Float (nullable)

    # Fuel info
    fuel_price_per_gallon: Float (nullable)
    last_price_update: Timestamp (nullable)
```

---

## API Endpoints (Complete)

### Route Planning Endpoints

**POST /api/v1/route-planning/optimize**
```json
Request:
{
    "driver_id": "uuid",
    "vehicle_id": "uuid",
    "stops": [
        {
            "stop_id": "uuid",
            "location_type": "warehouse",
            "address": {...},
            "time_window": {"earliest": "08:00", "latest": "17:00"},
            "estimated_dock_hours": 2.0,
            "is_origin": true,
            "is_destination": false
        },
        ...
    ],
    "optimization_priority": "minimize_time" | "minimize_cost" | "balance"
}

Response:
{
    "plan_id": "uuid",
    "plan_version": 1,
    "is_feasible": true,
    "optimized_route": {
        "segments": [
            {
                "sequence_order": 1,
                "type": "drive",
                "from": "Origin",
                "to": "Stop A",
                "distance_miles": 120,
                "drive_time_hours": 2.0,
                "hos_state_after": {...}
            },
            {
                "sequence_order": 2,
                "type": "rest",
                "location": "Truck Stop X",
                "rest_type": "full_rest",
                "duration_hours": 10,
                "reason": "HOS 11h drive limit reached"
            },
            ...
        ],
        "summary": {
            "total_distance_miles": 450,
            "total_time_hours": 22.5,
            "total_driving_segments": 5,
            "total_rest_stops": 2,
            "total_fuel_stops": 1
        }
    },
    "compliance_report": {
        "max_drive_hours_used": 10.5,
        "max_duty_hours_used": 13.0,
        "violations": []
    }
}
```

**POST /api/v1/route-planning/update**
```json
Request:
{
    "plan_id": "uuid",
    "update_type": "dock_time_change",
    "update_data": {
        "stop_id": "uuid",
        "actual_dock_hours": 4.0
    }
}

Response:
{
    "update_id": "uuid",
    "replan_triggered": true,
    "new_plan": {
        "plan_version": 2,
        "segments": [...]  # Updated route
    },
    "impact_summary": {
        "eta_changes": [
            {"stop_id": "...", "old_eta": "...", "new_eta": "...", "delay_hours": 2.0}
        ]
    }
}
```

**GET /api/v1/route-planning/status/{driver_id}**
```json
Response:
{
    "driver_id": "uuid",
    "current_plan": {...},
    "current_segment": {
        "sequence_order": 3,
        "type": "drive",
        "from": "Stop A",
        "to": "Truck Stop X",
        "progress_percent": 45
    },
    "alerts": [
        {"type": "hos_warning", "message": "Approaching 11h drive limit in 1.5h"}
    ]
}
```

### Enhanced REST Optimization Endpoint

**POST /api/v1/optimization/recommend** (Enhanced, backward compatible)
```json
Request:
{
    // Existing fields (unchanged)
    "driver_id": "uuid",
    "hours_driven": 8.0,
    "on_duty_time": 7.0,
    "hours_since_break": 6.0,
    "dock_duration_hours": 2.0,

    // NEW FIELDS (for route planning integration)
    "location_type": "dock" | "truck_stop" | "service_area",
    "is_dedicated_rest_stop": false,
    "remaining_route": [
        {"drive_time": 2.0, "dock_time": 2.0, "location": "Stop A"},
        {"drive_time": 1.5, "dock_time": 1.0, "location": "Stop B"}
    ]
}

Response:
{
    // Existing fields (unchanged)
    "recommendation": "full_rest",
    "recommended_duration_hours": 10.0,
    "confidence": 100,
    "reasoning": "...",
    "driver_can_decline": false,

    // Existing analysis fields (unchanged)
    "feasibility_analysis": {...},
    "opportunity_analysis": {...},
    "cost_analysis": {...}
}
```

---

## Critical Files to Implement

### Backend (New Services)

1. **Route Planning Engine**
   - `apps/backend/app/services/route_planning_engine.py`
   - `apps/backend/app/services/tsp_optimizer.py` (TSP algorithm)
   - `apps/backend/app/services/rest_stop_finder.py` (Find truck stops near route)
   - `apps/backend/app/services/fuel_stop_optimizer.py` (Fuel stop insertion)

2. **Continuous Monitoring**
   - `apps/backend/app/services/route_monitor_service.py` (Background daemon)
   - `apps/backend/app/services/dynamic_update_handler.py` (14 trigger checks)

3. **Models**
   - `apps/backend/app/models/route_plan.py`
   - `apps/backend/app/models/route_segment.py`
   - `apps/backend/app/models/route_plan_update.py`
   - `apps/backend/app/models/stop.py`

4. **API Endpoints**
   - `apps/backend/app/api/v1/endpoints/route_planning.py`
   - `apps/backend/app/api/v1/schemas/route_requests.py`
   - `apps/backend/app/api/v1/schemas/route_responses.py`

5. **Enhanced Existing**
   - `apps/backend/app/services/rest_optimization.py` (Add route context support)
   - `apps/backend/app/services/prediction_engine.py` (Add distance matrix, dock time estimation)

### Frontend (New Pages)

1. **Route Planning Page**
   - `apps/frontend/src/app/route-planning/page.tsx`
   - `apps/frontend/src/components/route-planning/DriverSelector.tsx`
   - `apps/frontend/src/components/route-planning/StopManager.tsx`
   - `apps/frontend/src/components/route-planning/RouteMap.tsx`
   - `apps/frontend/src/components/route-planning/SegmentList.tsx`

2. **Route Monitor Page**
   - `apps/frontend/src/app/route-monitor/page.tsx`
   - `apps/frontend/src/components/route-monitor/LiveRouteHeader.tsx`
   - `apps/frontend/src/components/route-monitor/UpdateFeed.tsx`
   - `apps/frontend/src/components/ui/DataSourceBadge.tsx` (Label data sources)

3. **State Management**
   - `apps/frontend/src/lib/store/routePlanStore.ts`
   - `apps/frontend/src/lib/api/routePlanning.ts`

---

## Success Criteria

### Phase 1 (MVP - 5 weeks)

- ✅ Route planning engine optimizes 5-10 stops (<5s)
- ✅ Rest stops inserted automatically when HOS requires
- ✅ Fuel stops inserted based on tank level
- ✅ Continuous monitoring running (14 trigger types)
- ✅ Proactive HOS monitoring (warns before violations)
- ✅ Dynamic updates (dock time, traffic, load changes, driver requests)
- ✅ REST optimization integrated (not replaced)
- ✅ Web dashboard (plan + monitor routes)
- ✅ Static data sources labeled (OSM, manual entry)
- ✅ Zero HOS violations on 100 test routes
- ✅ Backward compatible (existing "Test Engine" page works)

---

## Conclusion

This specification transforms SALLY from a tactical rest optimizer into a **strategic route planning platform with continuous compliance monitoring**.

**Key Differentiators:**
1. **HOS-aware routing** (not just distance optimization)
2. **Continuous monitoring** (14 trigger types, proactive + reactive)
3. **Dynamic updates** (real-world conditions change plans)
4. **REST optimization integrated** (not replaced, enhanced)
5. **Audit trail** (every decision logged for compliance)

**Unique Market Position:**
> "The only route planning platform that understands drivers have hours, not infinite time."

**Next Steps:**
1. Review and approve this spec
2. Begin implementation (Week 1: Backend foundation)
3. Pilot with 5 carriers (50 routes)
4. Iterate based on feedback
