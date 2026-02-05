# SALLY: Intelligent Dispatch & Driver Coordination Platform

## One-Line Idea

**The intelligent dispatch & driver coordination platform** that generates optimized end-to-end plans, continuously monitors real-world conditions, and simplifies communication between dispatchers and drivers through automated alerts and dynamic route updates.

---

## Problem

In US trucking, there's a **coordination gap** between dispatchers and drivers:

**Dispatcher Pain Points:**
* Manual HOS calculations prone to errors
* No visibility into whether routes are actually feasible
* Reactive problem-solving (find out about issues after they happen)
* Constant phone calls with drivers for status updates
* Unable to proactively prevent HOS violations or missed appointments

**Driver Pain Points:**
* Get a list of stops from dispatch but **no actual route plan**
* Manually plan routes in their heads or on paper
* Suboptimal stop sequences (unnecessary miles)
* Poor rest timing (forced breaks at inconvenient locations)
* HOS violations (run out of hours mid-route)
* Missed appointments (didn't account for dock delays)
* Wasted fuel (no fuel stop optimization)

**The Coordination Gap:**
* Current TMS: Assigns loads, tracks status, but doesn't plan routes or alert dispatchers
* Current ELD: Logs hours, enforces compliance, but doesn't suggest when/where to rest
* Samsara/Telematics: Tracks trucks, but doesn't optimize routing or provide proactive alerts
* **Result:** Dispatchers and drivers work in silos, leading to inefficiency and violations

**This is a massive gap in the trucking tech stack.**

---

## Core Insight

**Route planning isn't just about shortest distance—it's about HOS compliance, rest timing, fuel costs, and adapting to reality.**

Current routing tools (Google Maps, TMS) assume:
- Infinite drive hours
- Static conditions (no dock delays, traffic, load changes)
- No rest/fuel requirements

**SALLY is different:**
- Routes are HOS-aware (driver has X hours left, plan around it)
- Rest stops are inserted automatically (where, when, how long)
- Fuel stops are optimized (cheapest on route)
- Plans update dynamically (dock took 4h instead of 2h? Re-plan remaining route)

---

## Solution

A compliance-first route planning engine that:

1. **Optimizes stop sequence** (TSP/VRP algorithms)
2. **Inserts rest stops** where HOS requires (truck stops, service areas)
3. **Inserts fuel stops** based on range and price
4. **Validates HOS compliance** for entire route before driver starts
5. **Monitors and updates** dynamically when conditions change:
   - Dock time different than estimated
   - Traffic delays
   - New load added or cancelled
   - Driver wants to rest at current location
6. **Provides clear reasoning** for every decision (audit-ready)

You don't route trucks.
You **route drivers with hours, fuel, and rest built into every mile.**

---

## Product Definition

**Category:** Dispatch & Driver Coordination Platform (not TMS, not ELD, but integrates with both)

**Primary Users:**
* **Dispatchers/Ops Managers** (primary user - creating routes, monitoring progress, receiving alerts, managing interventions)
* **Drivers** (secondary user - following route plan, viewing rest recommendations, receiving updates)

**Core Value:**
- **For Dispatchers:** Automated route planning with HOS validation, proactive alerts when intervention needed, real-time monitoring of all active routes
- **For Drivers:** Clear turn-by-turn guidance with rest/fuel stops inserted, automatic plan updates as conditions change

**Target Market:**
* Mid-size carriers (50–500 trucks)
* Currently using TMS (McLeod, TMW) + ELD (Samsara, KeepTruckin)
* Pain: Manual route planning, constant dispatcher-driver communication, frequent HOS violations, missed appointments

---

## Core Features (MVP)

### 1. Route Planning Engine

**Input:**
- Driver (with current HOS status)
- Truck (fuel level, MPG, capacity)
- Stops (origin, waypoints, destination with time windows)

**Output:**
- Optimal stop sequence (shortest time or lowest cost)
- Complete route with segments:
  - Drive segments (from → to, distance, time)
  - Rest segments (location, duration, type: full/partial)
  - Fuel segments (station, gallons, cost)
  - Dock segments (customer, duration, appointment)
- HOS compliance validation
- Feasibility report (can driver complete this route?)

**Algorithm:**
- TSP optimization (greedy nearest-neighbor + 2-opt for MVP)
- HOS simulation segment-by-segment
- Rest stop insertion when driver runs out of hours
- Fuel stop insertion when tank low
- Time window constraint enforcement

**Example:**
```
Given: Driver (6h available), 3 stops (A, B, C)
Output:
  1. Origin → Stop A (2h drive)
  2. Stop A dock (2h)
  3. Stop A → Truck Stop X (1h drive)
  4. [REST: 10h at Truck Stop X] ← INSERTED
  5. Truck Stop X → Stop B (3h drive)
  6. Stop B dock (1h)
  7. Stop B → Stop C (2h drive)
  8. Stop C → Destination (1h)
Total: 300 miles, 22h (incl. rest), HOS compliant ✅
```

---

### 2. Dynamic Update System

**Triggers:**

**A. Dock Time Changes**
- Driver reports actual dock time differs from estimate
- System re-calculates HOS impact
- Decides: Can leverage dock for rest? Or need to re-plan?

**B. Traffic Delays**
- Real-time traffic alert (future phase: live API)
- System adjusts ETAs
- If delay > threshold (30min), triggers re-plan

**C. Load Added/Cancelled**
- Dispatcher adds urgent stop mid-route
- System re-sequences remaining stops
- Updates ETAs and feasibility

**D. Driver Rest Request**
- Driver says "I want to rest here"
- System updates HOS state
- Re-plans remaining route with fresh hours

**Re-Plan Logic:**
- Compare impact vs threshold
- If minor (< 30min ETA change): Update ETAs only
- If major: Trigger full re-plan
  - Generate new route from current location
  - May re-sequence stops
  - May insert/remove rest stops
  - Preserve version history (Plan v1 → Plan v2)

---

### 3. Intelligent Rest Management

**Types of Rest Recommendations:**

**A. Mandatory Rest**
- Route is not feasible with current hours
- Driver MUST rest (compliance issue)
- Confidence: 100%, cannot decline

**B. Opportunistic Rest**
- Route is feasible but marginal
- Dock time available, good opportunity to extend
- Confidence: 60-75%, driver can decline

**C. Dedicated Rest Stop**
- No suitable dock for rest nearby
- Insert truck stop/service area as waypoint
- Confidence: 100% (planned rest stop)

**Rest Types:**
- **Full Rest (10h):** Resets all hours (11h drive + 14h duty)
- **Partial Rest (7h/8h):** Sleeper berth split (7/3 or 8/2)
- **Break (30min):** Required after 8h driving

**Decision Factors:**
- Current HOS state (how close to limits?)
- Remaining route demand (how many hours needed?)
- Dock time availability (can leverage forced downtime?)
- Cost (how much extra time to extend rest?)
- Opportunity score (0-100, based on dock time, hours gainable, criticality)

---

### 4. Fuel Stop Optimization

**Fuel Tracking:**
- Track fuel consumption per segment (distance / MPG)
- Alert when fuel < 1/4 tank
- Insert fuel stop before running low

**Fuel Stop Selection:**
- Find stations on route (within 10 miles)
- Optimize for: Price (cheapest) OR Time (fastest)
- Prefer truck-friendly stations (Pilot, TA, Loves)

**Example:**
```
Segment: Stop A → Stop B (300 miles)
Fuel: 100 gallons remaining (6 MPG = 600 miles range)
Decision: No fuel stop needed

Segment: Stop B → Stop C (400 miles)
Fuel: 50 gallons remaining (300 miles range)
Decision: INSERT fuel stop at Exit 45 Pilot (150 miles into segment)
```

---

### 5. Automated Alert System

**Purpose:** Proactively notify dispatchers when intervention is needed, reducing reactive fire-fighting.

**Alert Types:**

| Alert Type | Priority | Trigger Condition | Recommended Action |
|-----------|----------|------------------|-------------------|
| DRIVER_NOT_MOVING | HIGH | Driver hasn't moved in 2+ hours during drive segment | Call driver to check status |
| HOS_APPROACHING_LIMIT | MEDIUM | <1h drive time remaining before limit | Monitor driver, ensure rest stop upcoming |
| HOS_VIOLATION | CRITICAL | Active HOS violation detected | Mandatory rest immediate |
| DOCK_TIME_EXCEEDED | HIGH | Actual dock time > estimated by 1h+ | Re-plan remaining route |
| ROUTE_DELAY | MEDIUM | ETA delay > 30min | Update customer, consider re-sequencing |
| FUEL_LOW | HIGH | Fuel < 20% capacity | Insert fuel stop |
| MISSED_APPOINTMENT | CRITICAL | Driver missed time window | Contact customer, re-plan |
| REST_NEEDED | MEDIUM | Rest recommended but driver hasn't stopped | Contact driver |

**Alert Flow:**
```
Event Detected (e.g., HOS approaching limit)
    ↓
Alert Engine evaluates severity
    ↓
Create Alert record (active status)
    ↓
Notify Dispatcher (in-app notification)
    ↓
Dispatcher Actions:
    - View alert details
    - Take action (call driver, update route, etc.)
    - Acknowledge alert
    - Resolve alert when handled
```

**Communication Flows:**

**Automated System Notifications:**
- Route updated due to conditions (driver notified automatically)
- HOS approaching limit (driver receives warning)
- Fuel stop inserted (driver sees updated plan)

**Dispatcher-Initiated Communications:**
- Critical alerts require dispatcher approval before notifying driver
- Dispatcher can manually trigger route updates
- Dispatcher can send custom notifications to driver

**Key Principle:** System handles routine updates automatically. Dispatchers only intervene when human judgment is needed.

---

### 6. Driver Dashboard (Mobile/Web)

**Route View:**
- Map with route line and markers (drive, rest, fuel, dock)
- Current segment progress bar
- Next 3 upcoming segments
- ETA to next stop

**Compliance Panel:**
- Drive hours: 8.5h / 11h ⚠️ (approaching limit)
- Duty hours: 12h / 14h ⚠️
- Break required: No ✅
- Next rest: Truck Stop X in 45 miles

**Update Feed:**
- Real-time log of route changes
- "2:15 PM - Dock at Stop A took 4h (est. 2h). Route updated."
- "2:20 PM - Rest extended to 7h partial rest. Remaining route adjusted."

**Actions:**
- "I'm here" (mark arrival at stop)
- "Dock taking longer" (update dock time)
- "I want to rest here" (extend current stop to rest)
- "Accept new route" (after re-plan)

---

### 7. Dispatcher Dashboard (Web)

**Tab 1: Create Plan** (Apple-style card-based workflow)
- Step 1: Select Load (card picker with load details)
- Step 2: Select Driver (card picker with **live HOS from Samsara mock**)
- Step 3: Select Vehicle (card picker with fuel level)
- Set optimization priority (time vs cost vs balanced)
- Click "Generate Plan" → View optimized route with preview
- Assign to driver → Route becomes active, monitoring starts

**Tab 2: Active Routes** (Kanban-style status board)
- See all active routes grouped by status:
  - 🟢 On Track (meeting ETAs, HOS compliant)
  - 🟡 Minor Delay (<1h, no action needed)
  - 🔴 At Risk (major delay, HOS critical, or alert active)
- Click route card → Expand to see full details
- Actions: View full route, update route, call driver

**Tab 3: Alerts** (Priority-based triage)
- List all active alerts sorted by priority (Critical → High → Medium → Low)
- Each alert shows:
  - Driver ID, route, alert type
  - Recommended action
  - Time since alert created
- Actions: Acknowledge, Resolve, Call Driver, View Route
- Auto-refresh every 30 seconds

**Analytics** (Future phase):
- Hours recovered (rest optimization impact)
- Routes completed on-time %
- Average re-plans per route
- Fuel savings (optimized stops)
- Compliance violations (should be zero)

---

## System Architecture

### Data Inputs (POC: Mock External APIs)

**Driver State (HOS):**
- Current HOS status (hours_driven, on_duty_time, hours_since_break)
- Duty status (driving, on_duty, sleeper_berth, off_duty)
- **Source (POC):** Mock Samsara ELD API (`/api/v1/external/hos/:driver_id`)
  - Returns realistic HOS data with simulated latency (100-150ms)
  - Includes "Samsara ELD (Mock)" data source badge
- **Source (Production):** Real Samsara/KeepTruckin ELD API

**Truck State:**
- Fuel level, fuel capacity, MPG
- Current location (GPS)
- **Source (POC):** Database (manual entry via Configuration screen)
- **Source (Production):** Telematics API (Samsara, Geotab)

**Stops/Loads:**
- Origin, waypoints, destination
- Time windows (earliest/latest arrival)
- Estimated dock times
- **Source (POC):** Database (manual entry via Configuration screen) + Mock TMS API
- **Source (Production):** TMS API (McLeod, TMW)

**Distance/Time:**
- Distance matrix (N x N stops)
- Drive time estimates
- Source: Static OSM data (MVP) → Google Maps Directions API (Phase 2)

**Traffic:**
- Live delays and road closures
- Source: N/A (MVP) → Google Maps Traffic API / HERE (Phase 2)

**Fuel Prices:**
- Price per gallon at nearby stations
- **Source (POC):** Mock Fuel Finder API (`/api/v1/external/fuel-prices`)
- **Source (Production):** GasBuddy API

**Weather:**
- Road conditions, temperature, wind speed
- **Source (POC):** Mock Weather API (`/api/v1/external/weather`)
- **Source (Production):** OpenWeatherMap API

---

### Core Services

**1. Route Planning Engine** (Primary)
- TSP/VRP optimization
- HOS simulation (segment-by-segment)
- Rest stop insertion (calls REST Engine)
- Fuel stop insertion
- Feasibility validation

**2. Continuous Monitoring Service** (Background daemon)
- 14 trigger types across 5 categories
- Runs every 60 seconds per active route
- Proactive HOS monitoring (warns before violations)
- Reactive violation handling (forces rest after violations)

**3. Alert Engine** (Dispatcher notifications)
- Generates alerts when triggers detected
- Priority-based categorization (CRITICAL, HIGH, MEDIUM, LOW)
- Stores alert records in database
- Exposes API for dispatcher dashboard
- Auto-evaluates every 60 seconds

**4. Dynamic Update Handler** (Re-planning orchestrator)
- Receives triggers from Monitoring Service
- Threshold-based re-plan decision
- Invokes Route Planning Engine for new plan
- Increments plan version (v1 → v2)
- Notifies driver and dispatcher
- Audit trail logging

**5. REST Optimization Engine** (Component - called by Route Planner)
- Opportunity scoring (0-100)
- Cost-benefit analysis
- Recommendation generation (FULL_REST, PARTIAL_REST, NO_REST)
- Confidence level calculation
- Supports both dock rest and dedicated rest stops

**6. HOS Rule Engine**
- FMCSA compliance validation
- 11h drive, 14h duty, 30min break rules
- Sleeper berth split provisions
- Remaining hours calculation

**7. Prediction Engine**
- Distance matrix calculation
- Drive time estimation
- Dock time estimation
- Fuel consumption calculation

**8. Mock External API Service** (POC only)
- Simulates Samsara ELD API (HOS data)
- Simulates Fuel Finder API (fuel prices)
- Simulates Weather API (road conditions)
- Simulates TMS API (load data)
- Artificial 100-150ms latency
- Includes "data_source" badge with "(Mock)" suffix

---

### Outputs

**For Drivers:**
- Optimized route plan (segment-by-segment)
- Rest recommendations (where, when, how long)
- Real-time updates (route changes, ETAs)
- Compliance alerts (approaching limits)

**For Dispatchers:**
- Route feasibility reports
- HOS constraint visibility
- Re-plan notifications
- Performance analytics

**For Auditors:**
- Full decision audit trail
- Compliance validation logs
- Route version history
- HOS reasoning for every recommendation

---

## Tech Stack

### Backend
- **Language:** Python 3.11+
- **Framework:** FastAPI (async)
- **Optimization:** Custom TSP (greedy + 2-opt) → OR-Tools (Phase 2 for VRP)
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **ORM:** SQLAlchemy 2.0 (async)
- **Validation:** Pydantic v2

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **State:** Zustand + React Query
- **UI:** Tailwind CSS + Shadcn/ui
- **Maps:** MapLibre or Leaflet
- **Charts:** Tremor + Recharts

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Cloud:** AWS (Phase 2 deployment)
- **CI/CD:** GitHub Actions (future)

---

## Optimization Logic (Enhanced)

### Route Planning Flow

```
1. Input: Driver, Truck, Stops (N locations)
    ↓
2. Calculate distance matrix (N x N)
    ↓
3. Apply TSP optimization
   - Respect time windows
   - Minimize total time OR total cost
    ↓
4. Simulate route segment-by-segment:
   FOR each segment:
     - Calculate drive time
     - Track HOS consumption (drive hours, duty hours)
     - Check fuel level

     IF hours_remaining < hours_needed:
       → INSERT rest stop (call REST Optimization Engine)
       → Decide: Full rest (10h) or Partial rest (7h)
       → Update HOS state (reset hours after rest)

     IF fuel_remaining < threshold:
       → INSERT fuel stop
       → Find cheapest station on route
       → Update fuel level

     IF break_required (8h since last break):
       → INSERT 30-min break
    ↓
5. Validate entire route:
   - HOS compliant? ✅/❌
   - Appointments met? ✅/❌
   - Feasible? ✅/❌
    ↓
6. Return RouteOptimizationResult
```

### Dynamic Update Flow

```
1. Trigger event detected:
   - Dock time changed
   - Traffic delay
   - Load added/cancelled
   - Driver rest request
    ↓
2. Calculate impact:
   - How much HOS consumed?
   - How much time added/removed?
   - Which stops affected?
    ↓
3. Decide: Re-plan needed?
   IF impact > threshold:
     → YES, trigger re-plan
   ELSE:
     → NO, just update ETAs
    ↓
4. IF re-plan:
   - Call Route Planning Engine
   - Input: Current location, current HOS, remaining stops
   - Generate new plan (version++)
   - Log update in audit trail
    ↓
5. Notify driver:
   - "Route updated. Review changes."
   - Highlight what changed
   - Request acceptance
```

### REST Decision Integration

```
Route Planner detects HOS shortfall:
  "Driver will run out of hours before reaching Stop B"
    ↓
Call REST Optimization Engine:
  Input: {
    current_location: "After Stop A",
    driver_state: {hours_driven: 8, on_duty: 10, ...},
    dock_duration_hours: 0,  # No dock available
    remaining_route: [Stop B, Stop C, ...],
    is_dedicated_rest_stop: true
  }
    ↓
REST Engine evaluates:
  - Feasibility: NOT FEASIBLE (needs 3h drive, has 3h left, but duty window exceeded)
  - Opportunity: N/A (dedicated rest stop)
  - Recommendation: FULL_REST (10h)
  - Reasoning: "Mandatory rest required. HOS 14h duty window exceeded."
    ↓
Route Planner inserts rest segment:
  Segment {
    type: 'rest',
    location: 'Truck Stop - Exit 45',
    rest_type: 'full_rest',
    duration_hours: 10,
    reason: 'HOS 14h duty window exceeded. Full rest required.'
  }
```

---

## Compliance Strategy

* **Conservative defaults:** Always err on side of safety
* **Advisory-first MVP:** Driver has final say (except mandatory rest)
* **Full audit trail:** Every decision logged with reasoning
* **Rule-based initially:** Transparent logic, no black-box ML
* **Future ML:** Learn from driver accept/decline patterns to personalize

**Compliance Reports Include:**
- HOS status at each segment
- Legal reasoning for rest recommendations
- Comparison vs FMCSA regulations
- Violation warnings (if any)

**Make auditors bored.**

---

## Pricing

* **$40–60 per truck / month** (premium vs basic TMS, justified by value)
* **Pilot:** Free analysis of last 30 days + 2 routes planned
* **Enterprise:** Unlimited routes + API access + analytics dashboard

**Value Calculation:**
- 1 HOS violation avoided: $1,000–$16,000 fine
- 1 missed appointment avoided: $500 accessorial charge
- 10% fuel savings (optimized stops): $200/month/truck
- 5% more miles driven (better rest timing): $400/month/truck

**ROI: Pays for itself in < 1 week**

---

## Go-To-Market

### Entry Wedge

* "We don't replace your TMS"
* "We don't replace your ELD"
* "We plug the gap: **route planning for drivers**"
* "Samsara tracks, McLeod dispatches, **SALLY routes**"

### Sales Motion

1. **Discovery:** Analyze historical routes
   - "How many HOS violations last month?"
   - "How many missed appointments?"
   - "How much time wasted on poor rest timing?"

2. **Pilot:** 5 drivers, 30 days
   - Manual input (no integrations needed)
   - Generate 10 routes, compare actual vs optimized
   - Measure: Time saved, violations avoided, fuel savings

3. **Prove Value:** Show ROI
   - "You saved 15 hours per driver this month"
   - "Zero HOS violations (vs 8 last month)"
   - "3 missed appointments avoided = $1,500 saved"

4. **Expand:** Fleet-wide rollout
   - Integrate with existing TMS (pull stops)
   - Integrate with existing ELD (pull HOS)
   - Automate route planning for all drivers

5. **Upsell:** Advanced features
   - Fleet-wide optimization (assign drivers to loads)
   - Predictive ML (learn driver preferences)
   - Live data (traffic, weather)

---

## Competitive Reality

### Existing Tools

**TMS (McLeod, TMW, etc.):**
- Dispatches loads
- Tracks shipment status
- **Does NOT:** Plan routes, optimize stop sequence, insert rest stops

**ELD (Samsara, KeepTruckin, etc.):**
- Logs driver hours
- Enforces HOS compliance
- **Does NOT:** Plan routes, recommend when/where to rest

**Telematics (Samsara, Geotab, etc.):**
- Tracks trucks
- Reports location, fuel, diagnostics
- **Does NOT:** Plan routes, optimize routing

**Routing Tools (Google Maps, PC*Miler):**
- Shortest route for cars/trucks
- **Does NOT:** Understand HOS, insert rest stops, handle dynamic updates

### SALLY Unique Position

**We sit at the intersection of:**
- TMS (load assignment)
- ELD (HOS tracking)
- Routing (directions)

**We solve what none of them solve:**
- Stop sequence optimization
- HOS-aware routing
- Automatic rest stop insertion
- Dynamic route updates
- Fuel stop optimization

**Category-creating, not feature-competing.**

---

## Roadmap

### Phase 1: Single-Driver Route Planning (MVP - 5 weeks)
- Route planning engine (TSP + HOS simulation)
- Rest stop insertion
- Fuel stop insertion
- Dynamic updates (4 trigger types)
- Web dashboard (plan routes, monitor routes)
- Static data (distance matrix, historical dock times)
- **Goal:** Prove value with 5 pilot drivers

### Phase 2: Fleet-Wide Optimization (3 months)
- Multi-driver assignment (VRP solver)
- Load matching (which driver gets which load)
- Driver preferences (home time, regions)
- Team driving support
- **Goal:** Scale to 50+ trucks per carrier

### Phase 3: Live Data Integration (3 months)
- ELD API integration (auto-populate HOS)
- TMS API integration (auto-pull stops)
- Telematics integration (live truck location)
- Google Maps Directions + Traffic API
- Weather API (adjust speeds)
- Fuel price API (GasBuddy)
- **Goal:** Fully automated route planning

### Phase 4: Predictive Intelligence (6 months)
- ML-based ETA prediction (learn from history)
- Driver preference learning (personalize recommendations)
- Lane-specific patterns (optimize by route)
- Demand forecasting (predict dock times)
- **Goal:** Self-optimizing system

### Phase 5: Advanced Features (ongoing)
- Load consolidation (combine partial loads)
- Toll optimization (avoid/minimize tolls)
- Fuel hedging (predict prices, route accordingly)
- Driver fatigue scoring (beyond HOS)
- Appointment negotiation (suggest better time windows)

---

## Risks & Mitigation

### Technical Risks

**1. HOS Compliance Accuracy**
- Risk: Recommendation violates HOS rule
- Mitigation: Conservative defaults, extensive testing, legal review
- Validation: Compare with known compliant routes

**2. TSP Performance (Large Routes)**
- Risk: >20 stops takes too long to optimize
- Mitigation: Use greedy + 2-opt (fast), upgrade to OR-Tools for Phase 2
- Validation: Target <5s for 20 stops

**3. Database Performance (Many Active Routes)**
- Risk: Queries slow down with 1000+ active plans
- Mitigation: Index on driver_id, plan_id, created_at, status
- Validation: Load test with 10,000 records

### Product Risks

**4. User Adoption (Too Complex?)**
- Risk: Drivers/dispatchers don't use it
- Mitigation: Simple UI, progressive disclosure, training materials
- Validation: User testing with 3-5 dispatchers

**5. Data Accuracy (Static Data Limitations)**
- Risk: Static estimates too inaccurate, users lose trust
- Mitigation: Clearly label data sources, set expectations, add live data in Phase 3
- Validation: Compare static vs actual (post-route analysis)

**6. Integration Challenges (ELD/TMS APIs)**
- Risk: APIs are limited, data quality poor
- Mitigation: Start with manual input (MVP), add integrations incrementally
- Validation: Pilot with 1 ELD integration, prove feasibility

### Market Risks

**7. TMS Vendors Add This Feature**
- Risk: McLeod/TMW adds route planning
- Mitigation: Move fast, establish category leadership, deeper HOS intelligence
- Reality: TMS vendors are slow, focus on big carriers, we target mid-size

**8. Price Sensitivity**
- Risk: $50/truck/month too expensive
- Mitigation: Prove ROI clearly (violation avoidance, fuel savings), offer pilot
- Validation: Test pricing with 10 carriers during pilot

---

## Success Metrics

### MVP (Phase 1)
- ✅ 5 pilot carriers (5–20 trucks each)
- ✅ 100 routes planned
- ✅ Zero HOS violations on planned routes
- ✅ 90% driver acceptance rate (on optional rest recommendations)
- ✅ <5s route optimization time (10 stops)
- ✅ Positive ROI (time saved + violations avoided > subscription cost)

### Phase 2 (Fleet-Wide)
- ✅ 10 paying customers (50–100 trucks each)
- ✅ 1,000 routes planned per week
- ✅ $100K ARR
- ✅ 80% renewal rate
- ✅ <10s route optimization (fleet-wide, 50 drivers, 200 loads)

### Phase 3 (Live Data)
- ✅ 50 customers
- ✅ 3 ELD integrations (Samsara, KeepTruckin, Omnitracs)
- ✅ 2 TMS integrations (McLeod, TMW)
- ✅ $500K ARR
- ✅ 90% driver satisfaction ("makes job easier")

---

## Final Framing

> **We don't just route trucks. We route drivers.**
>
> Drivers aren't unlimited resources—they have hours, they need rest, they need fuel. Every route plan must respect these constraints, not ignore them.
>
> SALLY is the first platform built for the reality of trucking, not the fantasy of infinite drive time.

**Rest is not downtime.**
**It's a resource.**
**Route planning is not optional.**
**It's survival.**

**SALLY: Where routing meets reality.**
