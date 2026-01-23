# REST-OS Route Planning with Simulation - REFINED Implementation Plan

> **Plan Version:** 2.0 - Optimized based on codebase analysis
> **Estimated Effort:** 2.5 weeks (reduced from 4 weeks)
> **Status:** Ready for approval

---

## Executive Summary

This plan implements a complete **route planning and simulation system** that leverages 70% of existing REST-OS infrastructure. Key insight: Most backend services already exist and just need enhancement, not replacement.

**User Journey:**
```
Scenario Selection → Route Generation → Simulation Mode → Trigger Events → See Impact
       ↓                    ↓                  ↓                ↓                ↓
  1-click load      HOS-compliant plan    Activate        Select triggers    Compare versions
  from template     with 7/3, 8/2 rest    simulator      & apply batch      v1 → v2 → v3
```

**Key Simplifications from Original Plan:**
- ❌ **Skip Load/LoadStop models** - Use existing Stop model + JSON scenarios
- ❌ **Skip trigger_simulator.py** - Use existing dynamic_update_handler.py
- ✅ **JSON-based scenarios** - No database model needed
- ✅ **Leverage existing services** - 70% backend already complete

---

## Architecture Overview - Leveraging Existing Code

### What Already Exists (70% Complete)

**Backend Services (All Fully Functional):**
- ✅ `route_planning_engine.py` - Complete orchestrator with TSP, HOS simulation
- ✅ `dynamic_update_handler.py` - 14 trigger types, priority classification, replan logic
- ✅ `rest_optimization.py` - Advanced opportunity scoring already implemented
- ✅ `hos_rule_engine.py` - Full compliance validation (11h, 14h, 8h break rules)
- ✅ `tsp_optimizer.py` - Greedy nearest-neighbor + 2-opt
- ✅ `prediction_engine.py` - Distance matrix, drive time estimation

**Database Models (All Complete):**
- ✅ `RoutePlan` - Versioning, feasibility, compliance tracking
- ✅ `RouteSegment` - Drive, rest, fuel, dock with HOS state tracking
- ✅ `RoutePlanUpdate` - Audit trail for all dynamic updates
- ✅ `Stop` - 6 location types, time windows, dock/fuel info
- ✅ `Driver` - HOS state tracking
- ✅ `Vehicle` - Fuel capacity, current fuel, MPG

**API Endpoints (Functional):**
- ✅ `POST /route-planning/optimize` - Generate route plan
- ✅ `POST /route-planning/update` - Apply single trigger, replan
- ✅ `GET /route-planning/status/{driver_id}` - Current plan status

### What Needs to Be Added (30% New Work)

**Backend Enhancements:**
1. Add 7/3 and 8/2 split enum values to `RestRecommendation` (~5 lines)
2. Enhance `rest_optimization.py` with 7/3 vs 8/2 decision logic (~20 lines)
3. Create JSON scenario templates (7 scenarios, no database model)
4. Add `GET /scenarios` endpoint to read JSON file (~30 lines)
5. Enhance `/route-planning/update` to accept trigger array (~50 lines)

**Frontend (New):**
1. Route planner page (`/route-planner`)
2. Scenario selector component
3. Route visualization components
4. Simulation panel with multi-trigger support
5. State management (Zustand store enhancement)

---

## Phase 1: Backend Enhancements (Week 1 - 3 days)

### 1.1 Enhanced REST Optimization for Split Sleeper Berth

**File:** `apps/backend/app/core/constants.py`

**Add Constants:**
```python
# Split Sleeper Berth (7/3 and 8/2 options)
SLEEPER_BERTH_SPLIT_7_3_LONG = 7.0
SLEEPER_BERTH_SPLIT_7_3_SHORT = 3.0
SLEEPER_BERTH_SPLIT_8_2_LONG = 8.0
SLEEPER_BERTH_SPLIT_8_2_SHORT = 2.0

# Thresholds for split recommendations
MIN_DOCK_TIME_FOR_7H_SPLIT = 7.0
MIN_DOCK_TIME_FOR_8H_SPLIT = 8.0
```

**File:** `apps/backend/app/core/constants.py` (Enum Update)

**Update RestRecommendation:**
```python
class RestRecommendation(str, Enum):
    FULL_REST = "full_rest"                    # 10h full reset
    PARTIAL_REST_7_3 = "partial_rest_7_3"      # 7/3 split (NEW)
    PARTIAL_REST_8_2 = "partial_rest_8_2"      # 8/2 split (NEW)
    BREAK = "break"                            # 30min break
    NO_REST = "no_rest"
```

---

**File:** `apps/backend/app/services/rest_optimization.py`

**Enhanced Decision Logic (~20 lines):**
```python
def recommend_rest(request: RestOptimizationInput) -> RestOptimizationResult:
    """
    Enhanced to support 7/3 and 8/2 split sleeper berth.
    """

    # Existing logic for dedicated rest stops (unchanged)
    if request.is_dedicated_rest_stop:
        return RestOptimizationResult(
            recommendation=RestRecommendation.FULL_REST,
            recommended_duration_hours=10.0,
            confidence=100,
            reasoning="Dedicated rest stop. Take full 10-hour rest to reset HOS.",
            driver_can_decline=False,
        )

    # NEW: Dock time-based split sleeper recommendations
    if request.location_type == "dock" and request.dock_duration_hours:
        dock_time = request.dock_duration_hours

        # 8/2 split preferred if dock >= 8h (better for long hauls)
        if dock_time >= MIN_DOCK_TIME_FOR_8H_SPLIT and dock_time < 10.0:
            return RestOptimizationResult(
                recommendation=RestRecommendation.PARTIAL_REST_8_2,
                recommended_duration_hours=8.0,
                confidence=90,
                reasoning=f"Dock time ({dock_time}h) ideal for 8/2 split. Take 8h rest now, 2h later.",
                driver_can_decline=True,
            )

        # 7/3 split if dock >= 7h (more flexible)
        elif dock_time >= MIN_DOCK_TIME_FOR_7H_SPLIT and dock_time < MIN_DOCK_TIME_FOR_8H_SPLIT:
            return RestOptimizationResult(
                recommendation=RestRecommendation.PARTIAL_REST_7_3,
                recommended_duration_hours=7.0,
                confidence=85,
                reasoning=f"Dock time ({dock_time}h) suitable for 7/3 split. Take 7h rest now, 3h later.",
                driver_can_decline=True,
            )

        # Full rest if dock >= 10h
        elif dock_time >= 10.0:
            return RestOptimizationResult(
                recommendation=RestRecommendation.FULL_REST,
                recommended_duration_hours=10.0,
                confidence=95,
                reasoning=f"Dock time ({dock_time}h) allows full 10h rest. Complete reset recommended.",
                driver_can_decline=False,
            )

    # Existing marginal rest logic (unchanged)
    return _evaluate_dock_rest_opportunity(request)
```

**Impact:** Enables intelligent 7/3 and 8/2 split recommendations based on dock time availability.

---

### 1.2 Scenario Templates (JSON-Based, No Database Model)

**New File:** `apps/backend/data/scenarios.json`

```json
{
  "scenarios": [
    {
      "scenario_id": "SCENARIO-001",
      "name": "Simple Route - 2 Stops",
      "description": "Baseline scenario with plenty of HOS remaining. 2 stops, 200 miles, driver fresh.",
      "category": "simple",
      "driver_state": {
        "driver_id": "DRV-SCENARIO-001",
        "hours_driven": 1.0,
        "on_duty_time": 1.5,
        "hours_since_break": 1.0
      },
      "vehicle_state": {
        "vehicle_id": "VEH-SCENARIO-001",
        "fuel_capacity_gallons": 200.0,
        "current_fuel_gallons": 180.0,
        "mpg": 6.5
      },
      "stops": [
        {
          "stop_id": "chicago-warehouse",
          "name": "Chicago Warehouse",
          "lat": 41.8781,
          "lon": -87.6298,
          "location_type": "warehouse",
          "is_origin": true,
          "is_destination": false,
          "estimated_dock_hours": 1.0
        },
        {
          "stop_id": "indianapolis-customer",
          "name": "Indianapolis Customer",
          "lat": 39.7684,
          "lon": -86.1581,
          "location_type": "customer",
          "is_origin": false,
          "is_destination": true,
          "estimated_dock_hours": 0.75
        }
      ],
      "expected_outcomes": {
        "rest_stops": 0,
        "fuel_stops": 0,
        "violations": []
      }
    },
    {
      "scenario_id": "SCENARIO-002",
      "name": "HOS Constrained - Rest Required",
      "description": "Driver at 9h driven, 3 stops totaling 500 miles. Must insert 10h rest stop.",
      "category": "hos_constrained",
      "driver_state": {
        "driver_id": "DRV-SCENARIO-002",
        "hours_driven": 9.0,
        "on_duty_time": 11.0,
        "hours_since_break": 7.5
      },
      "vehicle_state": {
        "vehicle_id": "VEH-SCENARIO-002",
        "fuel_capacity_gallons": 200.0,
        "current_fuel_gallons": 150.0,
        "mpg": 6.5
      },
      "stops": [
        {
          "stop_id": "la-warehouse",
          "name": "Los Angeles Warehouse",
          "lat": 34.0522,
          "lon": -118.2437,
          "location_type": "warehouse",
          "is_origin": true,
          "estimated_dock_hours": 1.5
        },
        {
          "stop_id": "phoenix-customer",
          "name": "Phoenix Customer",
          "lat": 33.4484,
          "lon": -112.0740,
          "location_type": "customer",
          "estimated_dock_hours": 1.0
        },
        {
          "stop_id": "tucson-distribution",
          "name": "Tucson Distribution Center",
          "lat": 32.2226,
          "lon": -110.9747,
          "location_type": "distribution_center",
          "is_destination": true,
          "estimated_dock_hours": 1.0
        }
      ],
      "expected_outcomes": {
        "rest_stops": 1,
        "fuel_stops": 0,
        "violations": []
      }
    },
    {
      "scenario_id": "SCENARIO-003",
      "name": "Low Fuel - Fuel Stop Required",
      "description": "Fuel at 20%, 4 stops, 400 miles. Must insert fuel stop mid-route.",
      "category": "fuel_constrained",
      "driver_state": {
        "driver_id": "DRV-SCENARIO-003",
        "hours_driven": 3.0,
        "on_duty_time": 4.0,
        "hours_since_break": 3.0
      },
      "vehicle_state": {
        "vehicle_id": "VEH-SCENARIO-003",
        "fuel_capacity_gallons": 200.0,
        "current_fuel_gallons": 40.0,
        "mpg": 6.5
      },
      "stops": [
        {
          "stop_id": "houston-warehouse",
          "name": "Houston Warehouse",
          "lat": 29.7604,
          "lon": -95.3698,
          "is_origin": true,
          "estimated_dock_hours": 1.0
        },
        {
          "stop_id": "dallas-customer-1",
          "name": "Dallas Customer A",
          "lat": 32.7767,
          "lon": -96.7970,
          "estimated_dock_hours": 0.5
        },
        {
          "stop_id": "dallas-customer-2",
          "name": "Dallas Customer B",
          "lat": 32.8207,
          "lon": -96.8720,
          "estimated_dock_hours": 0.5
        },
        {
          "stop_id": "oklahoma-distribution",
          "name": "Oklahoma City Distribution",
          "lat": 35.4676,
          "lon": -97.5164,
          "is_destination": true,
          "estimated_dock_hours": 1.0
        }
      ],
      "expected_outcomes": {
        "rest_stops": 0,
        "fuel_stops": 1,
        "violations": []
      }
    },
    {
      "scenario_id": "SCENARIO-004",
      "name": "Split Sleeper Optimization - 7/3 Split",
      "description": "Long haul with 4h dock time. Opportunity for 7/3 split sleeper berth.",
      "category": "complex",
      "driver_state": {
        "driver_id": "DRV-SCENARIO-004",
        "hours_driven": 5.0,
        "on_duty_time": 8.0,
        "hours_since_break": 5.0
      },
      "vehicle_state": {
        "vehicle_id": "VEH-SCENARIO-004",
        "fuel_capacity_gallons": 250.0,
        "current_fuel_gallons": 200.0,
        "mpg": 6.5
      },
      "stops": [
        {
          "stop_id": "seattle-warehouse",
          "name": "Seattle Warehouse",
          "lat": 47.6062,
          "lon": -122.3321,
          "is_origin": true,
          "estimated_dock_hours": 1.5
        },
        {
          "stop_id": "portland-customer",
          "name": "Portland Customer",
          "lat": 45.5152,
          "lon": -122.6784,
          "estimated_dock_hours": 4.0
        },
        {
          "stop_id": "eugene-customer",
          "name": "Eugene Customer",
          "lat": 44.0521,
          "lon": -123.0868,
          "estimated_dock_hours": 1.0
        },
        {
          "stop_id": "san-francisco-distribution",
          "name": "San Francisco Distribution",
          "lat": 37.7749,
          "lon": -122.4194,
          "is_destination": true,
          "estimated_dock_hours": 1.5
        }
      ],
      "expected_outcomes": {
        "rest_stops": 1,
        "rest_type": "partial_rest_7_3",
        "fuel_stops": 0,
        "violations": []
      }
    },
    {
      "scenario_id": "SCENARIO-005",
      "name": "Time Window Pressure",
      "description": "3 stops with tight time windows (2pm-4pm). Driver at 6h driven.",
      "category": "complex",
      "driver_state": {
        "driver_id": "DRV-SCENARIO-005",
        "hours_driven": 6.0,
        "on_duty_time": 7.5,
        "hours_since_break": 6.0
      },
      "vehicle_state": {
        "vehicle_id": "VEH-SCENARIO-005",
        "fuel_capacity_gallons": 200.0,
        "current_fuel_gallons": 160.0,
        "mpg": 6.5
      },
      "stops": [
        {
          "stop_id": "chicago-warehouse",
          "name": "Chicago Warehouse",
          "lat": 41.8781,
          "lon": -87.6298,
          "is_origin": true,
          "estimated_dock_hours": 1.0
        },
        {
          "stop_id": "indianapolis-customer-urgent",
          "name": "Indianapolis Customer (Urgent)",
          "lat": 39.7684,
          "lon": -86.1581,
          "earliest_arrival": "14:00",
          "latest_arrival": "16:00",
          "estimated_dock_hours": 0.75
        },
        {
          "stop_id": "cincinnati-distribution",
          "name": "Cincinnati Distribution",
          "lat": 39.1031,
          "lon": -84.5120,
          "is_destination": true,
          "estimated_dock_hours": 1.0
        }
      ],
      "expected_outcomes": {
        "rest_stops": 1,
        "fuel_stops": 0,
        "violations": []
      }
    },
    {
      "scenario_id": "SCENARIO-006",
      "name": "Multi-Stop Urban Route",
      "description": "6 stops within 150 miles. On-duty time constrained, not drive hours.",
      "category": "complex",
      "driver_state": {
        "driver_id": "DRV-SCENARIO-006",
        "hours_driven": 2.0,
        "on_duty_time": 10.0,
        "hours_since_break": 2.0
      },
      "vehicle_state": {
        "vehicle_id": "VEH-SCENARIO-006",
        "fuel_capacity_gallons": 150.0,
        "current_fuel_gallons": 120.0,
        "mpg": 6.0
      },
      "stops": [
        {
          "stop_id": "nyc-warehouse",
          "name": "NYC Warehouse (Bronx)",
          "lat": 40.8448,
          "lon": -73.8648,
          "is_origin": true,
          "estimated_dock_hours": 1.5
        },
        {
          "stop_id": "brooklyn-customer-1",
          "name": "Brooklyn Customer A",
          "lat": 40.6782,
          "lon": -73.9442,
          "estimated_dock_hours": 0.75
        },
        {
          "stop_id": "brooklyn-customer-2",
          "name": "Brooklyn Customer B",
          "lat": 40.6501,
          "lon": -73.9496,
          "estimated_dock_hours": 0.5
        },
        {
          "stop_id": "queens-customer",
          "name": "Queens Customer",
          "lat": 40.7282,
          "lon": -73.7949,
          "estimated_dock_hours": 1.0
        },
        {
          "stop_id": "manhattan-customer",
          "name": "Manhattan Customer",
          "lat": 40.7580,
          "lon": -73.9855,
          "estimated_dock_hours": 0.75
        },
        {
          "stop_id": "newark-distribution",
          "name": "Newark Distribution",
          "lat": 40.7357,
          "lon": -74.1724,
          "is_destination": true,
          "estimated_dock_hours": 1.0
        }
      ],
      "expected_outcomes": {
        "rest_stops": 0,
        "fuel_stops": 0,
        "violations": []
      }
    },
    {
      "scenario_id": "SCENARIO-007",
      "name": "Break Required Soon",
      "description": "Driver at 7.5h since break. 30-min break required within 30 minutes.",
      "category": "simple",
      "driver_state": {
        "driver_id": "DRV-SCENARIO-007",
        "hours_driven": 7.5,
        "on_duty_time": 9.0,
        "hours_since_break": 7.5
      },
      "vehicle_state": {
        "vehicle_id": "VEH-SCENARIO-007",
        "fuel_capacity_gallons": 200.0,
        "current_fuel_gallons": 170.0,
        "mpg": 6.5
      },
      "stops": [
        {
          "stop_id": "atlanta-warehouse",
          "name": "Atlanta Warehouse",
          "lat": 33.7490,
          "lon": -84.3880,
          "is_origin": true,
          "estimated_dock_hours": 1.0
        },
        {
          "stop_id": "birmingham-customer",
          "name": "Birmingham Customer",
          "lat": 33.5186,
          "lon": -86.8104,
          "is_destination": true,
          "estimated_dock_hours": 0.75
        }
      ],
      "expected_outcomes": {
        "rest_stops": 0,
        "break_required": true,
        "fuel_stops": 0,
        "violations": []
      }
    }
  ]
}
```

**Why JSON instead of Database Model:**
- No migrations needed
- Easy to edit/version control
- Can add scenarios without DB changes
- Future: Allow users to save custom scenarios to DB (Phase 2)

**IMPORTANT: How Scenarios Work with Form Parameters**

Scenarios are **templates** that pre-fill the route planning form. When a user selects a scenario:

1. **Scenario loads default values** → Populates sliders/inputs
2. **User can edit any parameter** → Full control over all inputs
3. **User clicks "Generate Plan"** → Uses current form state (not scenario)

**Example Flow:**
```
User selects "HOS Constrained" scenario
  ↓
Form pre-fills:
  - Driver: hours_driven = 9.0h, on_duty_time = 11.0h
  - Vehicle: fuel = 150 gallons, mpg = 6.5
  - Stops: 3 stops (LA → Phoenix → Tucson)
  ↓
User adjusts fuel to 180 gallons (overrides scenario)
  ↓
User clicks "Generate Plan"
  ↓
Plan generated with:
  - Driver HOS from scenario (9.0h driven)
  - Vehicle fuel from user edit (180 gallons) ← OVERRIDE
  - Stops from scenario (3 stops)
```

**All Parameters Always Editable:**
- ✅ Driver HOS state (hours_driven, on_duty_time, hours_since_break)
- ✅ Vehicle state (fuel_capacity, current_fuel, mpg)
- ✅ Stops (add, remove, reorder, edit dock times)
- ✅ Optimization priority (time vs. cost)

**Best UX Approach:**
- Scenario selector is a **quick start**, not a constraint
- Form is always the source of truth for route generation
- Scenarios just save user time by providing realistic starting points

---

### 1.3 Scenarios API Endpoint

**New File:** `apps/backend/app/api/v1/endpoints/scenarios.py`

```python
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from typing import List

router = APIRouter(prefix="/scenarios", tags=["scenarios"])

SCENARIOS_FILE = Path(__file__).parent.parent.parent.parent / "data" / "scenarios.json"


@router.get("/", response_model=List[dict])
def get_scenarios():
    """
    List all available test scenarios.

    Returns scenarios from JSON file for quick route planning setup.
    """
    try:
        with open(SCENARIOS_FILE, "r") as f:
            data = json.load(f)
        return data["scenarios"]
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Scenarios file not found")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid scenarios JSON")


@router.get("/{scenario_id}", response_model=dict)
def get_scenario(scenario_id: str):
    """
    Get a specific scenario by ID.
    """
    scenarios = get_scenarios()
    scenario = next((s for s in scenarios if s["scenario_id"] == scenario_id), None)

    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found")

    return scenario


@router.post("/{scenario_id}/instantiate", response_model=dict)
def instantiate_scenario(scenario_id: str):
    """
    Convert scenario template into RoutePlanningRequest format.

    Returns ready-to-use request payload for /route-planning/optimize endpoint.
    """
    scenario = get_scenario(scenario_id)

    # Transform to RoutePlanningRequest format
    request_payload = {
        "driver_id": scenario["driver_state"]["driver_id"],
        "vehicle_id": scenario["vehicle_state"]["vehicle_id"],
        "driver_state": scenario["driver_state"],
        "vehicle_state": scenario["vehicle_state"],
        "stops": scenario["stops"],
        "optimization_priority": "minimize_time",  # Default
    }

    return request_payload
```

**Register in:** `apps/backend/app/api/v1/api.py`
```python
from app.api.v1.endpoints import scenarios

api_router.include_router(scenarios.router, prefix="/scenarios")
```

---

### 1.4 Enhanced Trigger Simulation Endpoint

**File:** `apps/backend/app/api/v1/endpoints/route_planning.py`

**Add New Endpoint (~50 lines):**
```python
@router.post(
    "/simulate-triggers",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def simulate_triggers(
    request: SimulateTriggersRequest,
    db: Session = Depends(get_db),
):
    """
    Apply multiple triggers to route plan and generate new version.

    Triggers are applied sequentially:
    1. Load current plan (version N)
    2. For each trigger: update state, re-run planner
    3. Increment version (N → N+1)
    4. Return new plan + impact summary
    """

    # Get current plan
    repo = RoutePlanRepository(db)
    current_plan = repo.get_by_id(request.plan_id)

    if not current_plan:
        raise HTTPException(status_code=404, detail=f"Plan {request.plan_id} not found")

    # Initialize update handler
    handler = DynamicUpdateHandler()

    # Apply triggers sequentially
    impact_summary = {
        "total_eta_change_hours": 0.0,
        "rest_stops_added": 0,
        "fuel_stops_added": 0,
        "compliance_issues": [],
    }

    for trigger in request.triggers:
        # Use existing dynamic_update_handler logic
        update_result = handler.apply_trigger(
            plan_id=request.plan_id,
            trigger_type=trigger.trigger_type,
            trigger_data=trigger.data,
            db=db,
        )

        # Aggregate impact
        if update_result.replan_triggered:
            impact_summary["total_eta_change_hours"] += update_result.eta_change_hours
            impact_summary["rest_stops_added"] += update_result.rest_stops_added
            impact_summary["fuel_stops_added"] += update_result.fuel_stops_added

    # Get updated plan
    updated_plan = repo.get_by_id(request.plan_id)

    return {
        "previous_plan_version": current_plan.plan_version,
        "new_plan_version": updated_plan.plan_version,
        "new_plan": updated_plan,
        "impact_summary": impact_summary,
        "triggers_applied": len(request.triggers),
    }
```

**New Schema:** `apps/backend/app/api/v1/schemas/route_requests.py`
```python
class TriggerInput(BaseModel):
    trigger_type: str  # dock_time_change, traffic_delay, etc.
    segment_id: Optional[str] = None
    data: dict  # Trigger-specific data

class SimulateTriggersRequest(BaseModel):
    plan_id: str
    triggers: List[TriggerInput]
```

---

## Phase 2: Frontend - Apple-Level UX (Week 1.5-2 - 5 days)

### 2.1 Route Planner Page

**New File:** `apps/web/src/app/route-planner/page.tsx`

**Pattern Reference:** Reuse layout from `/simulator` page

```tsx
"use client";

import { useState } from "react";
import { useRoutePlanStore } from "@/lib/store/routePlanStore";
import { ScenarioSelector } from "@/components/route-planner/ScenarioSelector";
import { DriverStateInput } from "@/components/route-planner/DriverStateInput";
import { VehicleStateInput } from "@/components/route-planner/VehicleStateInput";
import { StopsManager } from "@/components/route-planner/StopsManager";
import { RouteSummaryCard } from "@/components/route-planner/RouteSummaryCard";
import { SegmentsTimeline } from "@/components/route-planner/SegmentsTimeline";
import { ComplianceStatus } from "@/components/route-planner/ComplianceStatus";
import { SimulationPanel } from "@/components/route-planner/SimulationPanel";
import { Button } from "@/components/ui/button";
import { useRoutePlanning } from "@/lib/hooks/useRoutePlanning";

export default function RoutePlannerPage() {
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const { currentPlan } = useRoutePlanStore();
  const { optimizeRoute, isOptimizing } = useRoutePlanning();

  const handleGeneratePlan = () => {
    const store = useRoutePlanStore.getState();
    optimizeRoute({
      driver_id: store.driverState?.driver_id || "DRV-001",
      vehicle_id: store.vehicleState?.vehicle_id || "VEH-001",
      driver_state: store.driverState!,
      vehicle_state: store.vehicleState!,
      stops: store.stops,
      optimization_priority: store.optimizationPriority,
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Setup */}
      <div className="w-2/5 border-r border-gray-200 bg-white p-6 overflow-y-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Route Planner</h1>

        {/* Load Source Selection */}
        <ScenarioSelector />

        {/* Driver State */}
        <div className="mt-6">
          <DriverStateInput />
        </div>

        {/* Vehicle State */}
        <div className="mt-6">
          <VehicleStateInput />
        </div>

        {/* Stops */}
        <div className="mt-6">
          <StopsManager />
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGeneratePlan}
          disabled={isOptimizing}
          className="w-full mt-6"
          size="lg"
        >
          {isOptimizing ? "Generating Plan..." : "Generate Route Plan"}
        </Button>
      </div>

      {/* Right Panel - Visualization */}
      <div className="flex-1 p-6 overflow-y-auto">
        {!currentPlan ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg">No route plan generated yet</p>
              <p className="text-sm mt-2">Select a scenario or configure manually, then click Generate</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Card */}
            <RouteSummaryCard plan={currentPlan} />

            {/* Compliance Status */}
            <ComplianceStatus plan={currentPlan} />

            {/* Segments Timeline */}
            <SegmentsTimeline segments={currentPlan.segments} />

            {/* Simulate Triggers Button */}
            <Button
              onClick={() => setIsSimulationOpen(true)}
              variant="outline"
              className="w-full"
            >
              Simulate Triggers
            </Button>
          </div>
        )}
      </div>

      {/* Simulation Panel (Slide-in) */}
      {isSimulationOpen && (
        <SimulationPanel
          planId={currentPlan?.plan_id || ""}
          onClose={() => setIsSimulationOpen(false)}
        />
      )}
    </div>
  );
}
```

**UX Highlights:**
- Two-panel layout (40% setup, 60% visualization)
- Progressive disclosure (plan shown only after generation)
- Apple-level spacing and typography
- Clear CTA buttons

---

### 2.2 Key Components

**Component:** `apps/web/src/components/route-planner/ScenarioSelector.tsx`

```tsx
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoutePlanStore } from "@/lib/store/routePlanStore";
import { getScenarios, instantiateScenario } from "@/lib/api/scenarios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export function ScenarioSelector() {
  const { scenarios, setScenarios, setDriverState, setVehicleState, setStops } = useRoutePlanStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const { data: scenariosData } = useQuery({
    queryKey: ["scenarios"],
    queryFn: getScenarios,
  });

  useEffect(() => {
    if (scenariosData) {
      setScenarios(scenariosData);
    }
  }, [scenariosData, setScenarios]);

  const handleLoadScenario = async () => {
    if (!selectedId) return;

    const payload = await instantiateScenario(selectedId);

    // Populate store (these become editable immediately)
    setDriverState(payload.driver_state);
    setVehicleState(payload.vehicle_state);
    setStops(payload.stops);

    setIsLoaded(true);

    // Reset after 2 seconds to allow loading another scenario
    setTimeout(() => setIsLoaded(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Start (Optional)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Test Scenario
              <span className="text-xs text-gray-500 ml-2">(Pre-fills form below)</span>
            </label>
            <Select value={selectedId || ""} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a scenario..." />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((s) => (
                  <SelectItem key={s.scenario_id} value={s.scenario_id}>
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleLoadScenario} disabled={!selectedId} className="w-full">
            {isLoaded ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Loaded!
              </>
            ) : (
              "Load Scenario"
            )}
          </Button>

          {isLoaded && (
            <p className="text-sm text-green-600 bg-green-50 p-2 rounded">
              ✓ Scenario loaded. You can now edit any parameters below before generating the plan.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**UX Flow:**
1. User selects scenario from dropdown
2. User clicks "Load Scenario"
3. Form fields below populate with scenario values
4. **User edits any field** (driver hours, fuel, stops, etc.)
5. User clicks "Generate Route Plan" (uses current form state)

**Key UX Decisions:**
- Scenario selector is clearly labeled as "Quick Start (Optional)"
- Helper text: "(Pre-fills form below)" makes it clear it's not final
- Success message after load: "You can now edit any parameters"
- All form fields below scenario selector are always editable

---

**Component:** `apps/web/src/components/route-planner/SegmentsTimeline.tsx`

```tsx
import { RouteSegment } from "@/lib/types/routePlan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Moon, Fuel, Building } from "lucide-react";

interface SegmentsTimelineProps {
  segments: RouteSegment[];
}

const SEGMENT_ICONS = {
  drive: <Truck className="w-5 h-5 text-blue-600" />,
  rest: <Moon className="w-5 h-5 text-purple-600" />,
  fuel: <Fuel className="w-5 h-5 text-yellow-600" />,
  dock: <Building className="w-5 h-5 text-green-600" />,
};

export function SegmentsTimeline({ segments }: SegmentsTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Segments Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {segments.map((segment, idx) => (
            <div key={idx} className="border-l-4 border-gray-300 pl-4 py-2">
              <div className="flex items-start gap-3">
                {SEGMENT_ICONS[segment.segment_type]}

                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {segment.segment_type === "drive" && `Drive: ${segment.from_location} → ${segment.to_location}`}
                    {segment.segment_type === "rest" && `REST: ${segment.rest_type} (${segment.rest_duration_hours}h)`}
                    {segment.segment_type === "fuel" && `Fuel Stop: ${segment.fuel_station_name}`}
                    {segment.segment_type === "dock" && `Dock: ${segment.to_location} (${segment.dock_duration_hours}h)`}
                  </h4>

                  {segment.segment_type === "drive" && (
                    <p className="text-sm text-gray-600">
                      {segment.drive_time_hours}h | {segment.distance_miles} miles
                    </p>
                  )}

                  {segment.hos_state_after && (
                    <p className="text-xs text-gray-500 mt-1">
                      HOS After: {segment.hos_state_after.hours_driven.toFixed(1)}h driven, {segment.hos_state_after.on_duty_time.toFixed(1)}h on-duty
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 2.3 Simulation Panel (Multi-Trigger Support)

**Component:** `apps/web/src/components/route-planner/SimulationPanel.tsx`

```tsx
import { useState } from "react";
import { useTriggerSimulation } from "@/lib/hooks/useRoutePlanning";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface SimulationPanelProps {
  planId: string;
  onClose: () => void;
}

interface Trigger {
  type: string;
  enabled: boolean;
  data: Record<string, any>;
}

export function SimulationPanel({ planId, onClose }: SimulationPanelProps) {
  const { applyTriggers, isApplying } = useTriggerSimulation();
  const [triggers, setTriggers] = useState<Trigger[]>([
    {
      type: "dock_time_change",
      enabled: false,
      data: { segment_id: "", actual_dock_hours: 4.0 },
    },
    {
      type: "traffic_delay",
      enabled: false,
      data: { segment_id: "", delay_minutes: 45 },
    },
    {
      type: "driver_rest_request",
      enabled: false,
      data: { location: "", reason: "Fatigue" },
    },
  ]);

  const handleApply = () => {
    const enabledTriggers = triggers
      .filter((t) => t.enabled)
      .map((t) => ({ trigger_type: t.type, data: t.data }));

    applyTriggers({ planId, triggers: enabledTriggers });
  };

  const enabledCount = triggers.filter((t) => t.enabled).length;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-50 overflow-y-auto">
      <Card className="border-0 rounded-none h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Simulation Mode</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-sm text-gray-600">
            Select triggers to simulate real-world events. Multiple triggers will be applied sequentially.
          </p>

          {/* Trigger Checkboxes */}
          <div className="space-y-4">
            {triggers.map((trigger, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    checked={trigger.enabled}
                    onCheckedChange={(checked) => {
                      const updated = [...triggers];
                      updated[idx].enabled = !!checked;
                      setTriggers(updated);
                    }}
                  />
                  <label className="font-medium">
                    {trigger.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </label>
                </div>

                {trigger.enabled && (
                  <div className="ml-6 space-y-2">
                    {Object.keys(trigger.data).map((key) => (
                      <Input
                        key={key}
                        placeholder={key}
                        value={trigger.data[key]}
                        onChange={(e) => {
                          const updated = [...triggers];
                          updated[idx].data[key] = e.target.value;
                          setTriggers(updated);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Apply Button */}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-3">
              Triggers Selected: <strong>{enabledCount}</strong>
            </p>
            <Button
              onClick={handleApply}
              disabled={enabledCount === 0 || isApplying}
              className="w-full"
            >
              {isApplying ? "Applying Triggers..." : "Apply Triggers"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Phase 3: State Management & Integration (Week 2.5 - 2 days)

### 3.1 Zustand Store Enhancement

**File:** `apps/web/src/lib/store/routePlanStore.ts`

```typescript
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { RoutePlan, Scenario, DriverStateInput, VehicleStateInput, StopInput } from "@/lib/types/routePlan";

interface RoutePlanStore {
  // Scenarios
  scenarios: Scenario[];

  // Current inputs
  driverState: DriverStateInput | null;
  vehicleState: VehicleStateInput | null;
  stops: StopInput[];
  optimizationPriority: "minimize_time" | "minimize_cost" | "balance";

  // Current plan
  currentPlan: RoutePlan | null;
  planVersions: RoutePlan[];
  currentVersion: number;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  setScenarios: (scenarios: Scenario[]) => void;
  setDriverState: (state: DriverStateInput) => void;
  setVehicleState: (state: VehicleStateInput) => void;
  setStops: (stops: StopInput[]) => void;
  setOptimizationPriority: (priority: "minimize_time" | "minimize_cost" | "balance") => void;

  setCurrentPlan: (plan: RoutePlan) => void;
  addPlanVersion: (plan: RoutePlan) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useRoutePlanStore = create<RoutePlanStore>()(
  devtools(
    (set) => ({
      scenarios: [],
      driverState: null,
      vehicleState: null,
      stops: [],
      optimizationPriority: "minimize_time",
      currentPlan: null,
      planVersions: [],
      currentVersion: 1,
      isLoading: false,
      error: null,

      setScenarios: (scenarios) => set({ scenarios }),
      setDriverState: (state) => set({ driverState: state }),
      setVehicleState: (state) => set({ vehicleState: state }),
      setStops: (stops) => set({ stops }),
      setOptimizationPriority: (priority) => set({ optimizationPriority: priority }),

      setCurrentPlan: (plan) => set({
        currentPlan: plan,
        planVersions: [plan],
        currentVersion: 1,
      }),

      addPlanVersion: (plan) => set((state) => ({
        currentPlan: plan,
        planVersions: [...state.planVersions, plan],
        currentVersion: plan.plan_version,
      })),

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      reset: () => set({
        driverState: null,
        vehicleState: null,
        stops: [],
        currentPlan: null,
        planVersions: [],
        currentVersion: 1,
        error: null,
      }),
    }),
    { name: "RoutePlanStore" }
  )
);
```

---

### 3.2 Custom Hooks

**File:** `apps/web/src/lib/hooks/useRoutePlanning.ts`

```typescript
import { useMutation } from "@tanstack/react-query";
import { optimizeRoute, simulateTriggers } from "@/lib/api/routePlanning";
import { useRoutePlanStore } from "@/lib/store/routePlanStore";

export function useRoutePlanning() {
  const { setCurrentPlan, setLoading, setError } = useRoutePlanStore();

  const { mutate, isPending, error } = useMutation({
    mutationFn: optimizeRoute,
    onMutate: () => setLoading(true),
    onSuccess: (plan) => {
      setCurrentPlan(plan);
      setLoading(false);
    },
    onError: (err: Error) => {
      setError(err.message);
      setLoading(false);
    },
  });

  return {
    optimizeRoute: mutate,
    isOptimizing: isPending,
    error,
  };
}

export function useTriggerSimulation() {
  const { addPlanVersion, setLoading, setError } = useRoutePlanStore();

  const { mutate, isPending } = useMutation({
    mutationFn: ({ planId, triggers }: { planId: string; triggers: any[] }) =>
      simulateTriggers(planId, triggers),
    onMutate: () => setLoading(true),
    onSuccess: (result) => {
      addPlanVersion(result.new_plan);
      setLoading(false);
    },
    onError: (err: Error) => {
      setError(err.message);
      setLoading(false);
    },
  });

  return {
    applyTriggers: mutate,
    isApplying: isPending,
  };
}
```

---

## Implementation Timeline (2.5 Weeks)

### Week 1 (5 days): Backend Enhancements
**Day 1:**
- Add 7/3 and 8/2 enum values to `RestRecommendation`
- Update `rest_optimization.py` with split sleeper logic
- Add constants

**Day 2:**
- Create `scenarios.json` with 7 test scenarios
- Test scenario data integrity

**Day 3:**
- Create `scenarios.py` API endpoint
- Test `GET /scenarios` and `POST /scenarios/{id}/instantiate`

**Day 4:**
- Enhance `route_planning.py` with `/simulate-triggers` endpoint
- Add `SimulateTriggersRequest` schema

**Day 5:**
- Integration tests for all new endpoints
- Test scenario instantiation flow
- Test multi-trigger application

---

### Week 2 (5 days): Frontend Development
**Day 1:**
- Create `/route-planner` page structure
- Two-panel layout implementation

**Day 2:**
- Build `ScenarioSelector` component
- Build `DriverStateInput` and `VehicleStateInput` components

**Day 3:**
- Build `StopsManager` component
- Build `RouteSummaryCard` component

**Day 4:**
- Build `SegmentsTimeline` component
- Build `ComplianceStatus` component

**Day 5:**
- Update `routePlanStore` with new fields
- Create API client functions (`scenarios.ts`)
- Wire up data fetching

---

### Week 3 (2 days): Simulation & Polish
**Day 1:**
- Build `SimulationPanel` component
- Multi-trigger selection UI
- Apply triggers flow

**Day 2:**
- End-to-end testing (all 7 scenarios)
- UX refinements (loading states, error handling)
- Apple-level polish (spacing, animations, accessibility)

---

## Critical Files Reference

### Backend Files to Modify
```
apps/backend/app/core/constants.py              [UPDATE - 10 lines]
apps/backend/app/services/rest_optimization.py  [UPDATE - 20 lines]
apps/backend/app/api/v1/endpoints/route_planning.py [UPDATE - 50 lines]
apps/backend/app/api/v1/schemas/route_requests.py   [UPDATE - 15 lines]
```

### Backend Files to Create
```
apps/backend/data/scenarios.json                [NEW - 7 scenarios]
apps/backend/app/api/v1/endpoints/scenarios.py  [NEW - 30 lines]
```

### Frontend Files to Create
```
apps/web/src/app/route-planner/page.tsx                       [NEW]
apps/web/src/components/route-planner/ScenarioSelector.tsx    [NEW]
apps/web/src/components/route-planner/DriverStateInput.tsx    [NEW]
apps/web/src/components/route-planner/VehicleStateInput.tsx   [NEW]
apps/web/src/components/route-planner/StopsManager.tsx        [NEW]
apps/web/src/components/route-planner/RouteSummaryCard.tsx    [NEW]
apps/web/src/components/route-planner/SegmentsTimeline.tsx    [NEW]
apps/web/src/components/route-planner/ComplianceStatus.tsx    [NEW]
apps/web/src/components/route-planner/SimulationPanel.tsx     [NEW]
apps/web/src/lib/api/scenarios.ts                             [NEW]
apps/web/src/lib/hooks/useRoutePlanning.ts                    [NEW]
apps/web/src/lib/types/scenario.ts                            [NEW]
```

### Frontend Files to Update
```
apps/web/src/lib/store/routePlanStore.ts        [UPDATE - add scenarios, versions]
apps/web/src/lib/api/routePlanning.ts           [UPDATE - add simulateTriggers]
apps/web/src/components/dashboard/TopNavigation.tsx [UPDATE - add Route Planner link]
```

---

## Success Criteria

### Functional Requirements
✅ **Scenario Loading:** User selects scenario, clicks "Load", form pre-fills
✅ **Route Generation:** HOS-compliant plan with 7/3, 8/2, or 10h rest
✅ **Multi-Trigger Simulation:** Select 2+ triggers, apply, see new version (v1 → v2)
✅ **Version Tracking:** Plan history preserved (v1, v2, v3...)
✅ **Compliance:** Zero HOS violations in all generated plans
✅ **Impact Visibility:** Clear summary of what changed between versions

### UX (Apple-Level Standards)
✅ **Visual Hierarchy:** Large headers (32px), clear sections, ample whitespace (16px)
✅ **Loading States:** Skeleton loaders (not spinners)
✅ **Error Handling:** Friendly messages with recovery suggestions
✅ **Responsive:** Works on tablet (768px+) and desktop
✅ **Micro-Interactions:** 200ms transitions, hover states, success animations
✅ **Accessibility:** Keyboard navigation, ARIA labels, 4.5:1 color contrast

### Performance
✅ **Route Optimization:** <3s for 5-stop route
✅ **Trigger Simulation:** <2s for 3 triggers
✅ **Scenario Loading:** <500ms

---

## Verification Plan

### Backend Testing
```bash
cd apps/backend

# 1. Test scenarios endpoint
curl http://localhost:8000/api/v1/scenarios
curl http://localhost:8000/api/v1/scenarios/SCENARIO-001/instantiate

# 2. Test route optimization with scenario
curl -X POST http://localhost:8000/api/v1/route-planning/optimize \
  -H "Content-Type: application/json" \
  -d @scenario_payload.json

# 3. Test multi-trigger simulation
curl -X POST http://localhost:8000/api/v1/route-planning/simulate-triggers \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "plan_abc123",
    "triggers": [
      {"trigger_type": "dock_time_change", "data": {"actual_dock_hours": 4.0}},
      {"trigger_type": "traffic_delay", "data": {"delay_minutes": 45}}
    ]
  }'

# 4. Run unit tests
poetry run pytest tests/unit/services/test_rest_optimization.py -v
poetry run pytest tests/integration/api/test_scenarios.py -v
```

### Frontend Testing
```bash
cd apps/web
npm run dev

# Manual Test Flow:
1. Navigate to http://localhost:3000/route-planner
2. Select "HOS Constrained - Rest Required" scenario
3. Click "Load Scenario" → Verify form pre-fills
4. Click "Generate Route Plan" → Verify plan displays with 10h rest stop
5. Click "Simulate Triggers" → Select "Dock Time Change" (2h → 4h)
6. Apply trigger → Verify plan v2 shows with 7/3 split rest recommendation
7. Check compliance panel → Verify "✓ Compliant"
```

### End-to-End Scenarios
**Scenario 1: Simple Route**
- Load SCENARIO-001
- Generate plan
- Expected: 2 drive segments, 0 rest stops, 0 violations

**Scenario 2: HOS Constrained**
- Load SCENARIO-002
- Generate plan
- Expected: 10h rest stop inserted, compliant

**Scenario 3: Split Sleeper**
- Load SCENARIO-004
- Generate plan with 4h dock
- Apply "Dock Time Change" trigger (4h → 7h)
- Expected: Plan v2 recommends 7/3 split rest

**Scenario 4: Multi-Trigger**
- Load SCENARIO-005
- Generate plan
- Apply 3 triggers: Traffic delay + Appointment change + Driver rest request
- Expected: Plan v4 generated, still HOS-compliant

---

## Risk Mitigation

### Risk 1: Split Sleeper Complexity
**Mitigation:** Implement 7/3 first (Day 1), test thoroughly, then add 8/2 (Day 2)

### Risk 2: Multi-Trigger Sequencing
**Mitigation:** Use existing `dynamic_update_handler` sequential logic (already proven)

### Risk 3: Frontend State Complexity
**Mitigation:** Use Zustand with devtools, explicit state transitions, no mutations

### Risk 4: UX Overwhelm
**Mitigation:** Progressive disclosure - hide advanced triggers behind "More Triggers" expander

---

## Future Enhancements (Post-MVP)

1. **Map Visualization:** Leaflet integration for route display on map
2. **Version Comparison UI:** Side-by-side diff view with change highlighting
3. **Custom Scenario Builder:** Save user-created scenarios to database
4. **Load Model (Phase 2):** Add Load/LoadStop models for TMS integration
5. **Real-Time Monitoring:** WebSocket for live plan updates during execution
6. **Export Reports:** PDF generation for plan summaries

---

## Apple-Level UX Checklist

- [ ] **Spacing:** 8px base unit, 16px between sections, 32px between major blocks
- [ ] **Typography:** 32px page headers, 24px card headers, 16px body, 14px labels
- [ ] **Colors:** Gray-900 text, blue-500 accent, red-500 errors, green-500 success
- [ ] **Animations:** 200ms ease-in-out for all transitions
- [ ] **Focus States:** 2px blue ring on all interactive elements
- [ ] **Empty States:** Friendly icon + message + CTA button
- [ ] **Success Feedback:** Checkmark animation (scale 0 → 1), green accent
- [ ] **Loading States:** Skeleton loaders with shimmer effect
- [ ] **Touch Targets:** Minimum 44px × 44px (buttons, checkboxes, inputs)
- [ ] **Accessibility:** ARIA labels, keyboard nav (Tab, Enter, Esc), color contrast 4.5:1

---

**Plan Status:** ✅ Ready for implementation
**Total Effort:** 2.5 weeks (12 days)
**Next Step:** User approval → Begin Day 1 (Backend enhancements)
