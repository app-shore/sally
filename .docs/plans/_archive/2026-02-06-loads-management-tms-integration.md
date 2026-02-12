# Loads Management & TMS Integration - Feature Design & Implementation Plan

**Created:** February 6, 2026
**Status:** Brainstorming → Ready for Implementation
**Epic:** Fleet Operations - Load Management
**Backend:** Node.js (NestJS + Prisma)
**Frontend:** Next.js 15 + TypeScript

---

## Executive Summary

**Goal:** Build a complete **Loads Management** feature that integrates with Transportation Management Systems (TMS) to sync load data into SALLY's route planning engine.

**Current State:**
- ✅ **Database schema** exists (`loads`, `load_stops` tables) - Prisma schema correct
- ✅ **Basic API endpoints** built (POST /loads, GET /loads, GET /loads/:id)
- ✅ **Service layer** implemented (LoadsService with create, findAll, findOne)
- ✅ **Load model** with proper relationships to stops
- ✅ **UI tab exists** in Settings > Fleet > Loads (placeholder)
- ✅ **Frontend API client** exists (`features/fleet/loads/api.ts`)
- ✅ **Mock driver/vehicle pattern** established (sync from external source)
- ❌ **TMS loads sync** NOT implemented (only drivers/vehicles syncing)
- ❌ **No mock TMS loads endpoint** yet
- ❌ **Load management UI** incomplete (no table, no details view)
- ❌ **Load assignment** to drivers/vehicles NOT implemented
- ❌ **Route planning integration** NOT implemented (loads → route plans)

**What We're Building:**
1. **TMS integration for load data sync** (mock endpoint + sync service)
2. **Complete load management UI** (list view, details, assignment)
3. **Load assignment flow** (assign driver/vehicle to load)
4. **Route planning integration** (generate route plan from load)

---

## Part 1: Understanding Loads in Fleet Management

### What is a Load?

In fleet management/trucking, a **load** represents:
- **A freight shipment** that needs to be moved from origin to destination
- **Multiple stops** (pickup locations, delivery locations, or both)
- **Customer orders** (one or many orders consolidated into one load)
- **Load assignments** to drivers and vehicles

### Load Lifecycle in TMS

```
1. ORDER RECEIVED (from customer)
   ↓
2. LOAD CREATED (order → load conversion in TMS)
   ↓
3. LOAD TENDERED (offered to carrier/driver)
   ↓
4. LOAD ACCEPTED (driver assigned)
   ↓
5. ROUTE PLANNED (SALLY generates optimized route)
   ↓
6. IN TRANSIT (driver executing route)
   ↓
7. DELIVERED (proof of delivery captured)
   ↓
8. INVOICED (billing to customer)
```

**SALLY's Role:** Steps 5-6 (Route Planning + Execution Monitoring)

### Loads vs Orders vs Shipments (Terminology)

| Term | Meaning | Example |
|------|---------|---------|
| **Order** | Single customer request | "Ship 100 pallets from Chicago to Boston" |
| **Shipment** | What physically moves | "1 truckload containing 3 orders" |
| **Load** | TMS assignment unit | "LOAD-12345: Pick up from 2 warehouses, deliver to 3 customers" |

**Key Insight:** One LOAD can contain multiple ORDERS with multiple STOPS.

---

## Part 2: Current Implementation Review

### Database Schema (✅ Good Foundation - Prisma)

#### `Load` Model (Prisma schema)
```prisma
model Load {
  id                    Int          @id @default(autoincrement())
  loadId                String       @unique @map("load_id") @db.VarChar(50)
  loadNumber            String       @map("load_number") @db.VarChar(50)
  status                String       @default("pending") @db.VarChar(30)
  weightLbs             Float        @map("weight_lbs")
  commodityType         String       @map("commodity_type") @db.VarChar(100)
  specialRequirements   String?      @map("special_requirements") @db.Text
  customerName          String       @map("customer_name") @db.VarChar(200)
  isActive              Boolean      @default(true) @map("is_active")
  createdAt             DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt             DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  // External system linkage (for TMS integration sync)
  externalLoadId        String?      @map("external_load_id") @db.VarChar(100)
  externalSource        String?      @map("external_source") @db.VarChar(50)
  lastSyncedAt          DateTime?    @map("last_synced_at") @db.Timestamptz

  stops                 LoadStop[]

  @@unique([externalLoadId])
  @@map("loads")
}
```

**✅ Verdict:** Schema is CORRECT for TMS integration.

**Key Fields:**
- `externalLoadId` - TMS load ID (for deduplication on sync)
- `externalSource` - "truckbase_tms", "mcleod_tms", etc.
- `lastSyncedAt` - Last sync timestamp for UI display

#### `LoadStop` Model (Prisma schema)
```prisma
model LoadStop {
  id                    Int          @id @default(autoincrement())
  loadId                Int          @map("load_id")
  stopId                Int          @map("stop_id")
  sequenceOrder         Int          @map("sequence_order")
  actionType            String       @map("action_type") @db.VarChar(20) // "pickup", "delivery", "both"
  earliestArrival       String?      @map("earliest_arrival") @db.VarChar(10) // "HH:MM" format
  latestArrival         String?      @map("latest_arrival") @db.VarChar(10)
  estimatedDockHours    Float        @map("estimated_dock_hours")
  actualDockHours       Float?       @map("actual_dock_hours")
  createdAt             DateTime     @default(now()) @map("created_at") @db.Timestamptz

  load                  Load         @relation(fields: [loadId], references: [id])
  stop                  Stop         @relation(fields: [stopId], references: [id])

  @@index([loadId])
  @@map("load_stops")
}
```

**✅ Verdict:** Schema is CORRECT. Smart design with reusable `stops` table.

### API Endpoints (Node.js NestJS Backend)

**✅ Implemented:**
- `POST /loads` - Create load with stops
  - **Controller:** `LoadsController.createLoad()`
  - **Service:** `LoadsService.create()`
- `GET /loads` - List loads (with filters: status, customer_name, limit, offset)
  - **Controller:** `LoadsController.listLoads()`
  - **Service:** `LoadsService.findAll()`
- `GET /loads/:load_id` - Get load details + stops
  - **Controller:** `LoadsController.getLoad()`
  - **Service:** `LoadsService.findOne()`

**❌ Missing (To Be Implemented):**
- `PATCH /loads/:load_id/status` - Update load status
- `POST /loads/:load_id/assign` - Assign driver/vehicle to load
- `POST /loads/:load_id/plan-route` - Generate route plan from load
- `GET /external/tms/loads` - Mock TMS loads endpoint (for sync)

### Seed Data (❌ NOT YET IMPLEMENTED)

**Current State:**
- ❌ No seed data for loads in Node.js backend
- ✅ Prisma schema migration complete
- ✅ Python backend has excellent seed data (can be ported)

**Need to Create:** `apps/backend/prisma/seed/loads.ts`

**Seed Data Plan:**
- Port 7 realistic loads from Python seed data
- Walmart, Target, FedEx, Amazon, Caterpillar, CVS, Home Depot
- Multi-stop configurations (2-3 stops per load)
- Different commodity types, time windows, dock estimates

---

## Part 3: TMS Integration Architecture

### Current State Analysis

**What's Working:**
- ✅ Drivers synced from TMS (mock endpoint: `/api/v1/external/hos/{driver_id}`)
- ✅ Vehicles synced from TMS (similar pattern)
- ✅ Telematics (ELD) updating HOS and fuel data in real-time

**What's Missing:**
- ❌ Loads NOT synced from TMS
- ❌ No mock TMS loads endpoint
- ❌ No sync service for loads

### TMS Integration Design (Sync & Cache Pattern)

**Strategy:** Follow the **same pattern** used for drivers/vehicles.

#### Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     TMS Integration Hub                          │
│                                                                   │
│  Background Sync Jobs (every 15 minutes)                        │
│  ├─ Fetch drivers from TMS → store in `drivers` table          │
│  ├─ Fetch vehicles from TMS → store in `vehicles` table        │
│  └─ Fetch loads from TMS → store in `loads` table ⭐ NEW       │
│                                                                   │
│  Mock TMS Endpoints (POC Phase)                                 │
│  ├─ GET /api/v1/external/tms/drivers → returns mock data       │
│  ├─ GET /api/v1/external/tms/vehicles → returns mock data      │
│  └─ GET /api/v1/external/tms/loads → returns mock data ⭐ NEW  │
│                                                                   │
│  Real TMS Adapters (Phase 2 - Future)                          │
│  ├─ McLeod TMS Adapter                                          │
│  ├─ TMW Systems Adapter                                         │
│  └─ TruckBase Adapter                                           │
└─────────────────────────────────────────────────────────────────┘
```

#### Data Source Labeling

```python
# app/utils/data_sources.py (ALREADY EXISTS)

class DataSource(str, Enum):
    STOP_MANUAL = "stop_manual"
    STOP_TMS = "stop_tms"  # Already defined!
    # Add:
    LOAD_MANUAL = "load_manual"  # ⭐ NEW
    LOAD_TMS = "load_tms"        # ⭐ NEW
```

**UI Display:**
- **Manual loads:** Badge = "Manual Entry" (gray) → "Future: TMS Integration"
- **TMS loads:** Badge = "TMS API" (green) → "Live data source"

---

## Part 4: Implementation Plan

### Phase 1: Mock TMS Loads Integration (Week 1)

**Goal:** Get loads flowing from "TMS" (mock) into SALLY's database.

#### Task 1.1: Create Mock TMS Loads Endpoint

**File:** `apps/backend-py/app/api/v1/endpoints/external_mock.py` (NEW)

```python
@router.get("/tms/loads", response_model=List[TMSLoadResponse])
async def get_tms_loads(
    status: str = None,  # pending, assigned, in_transit
    customer_id: str = None,
    db: AsyncSession = Depends(get_db),
) -> List[TMSLoadResponse]:
    """
    Mock TMS API - Returns load data.

    Simulates McLeod/TMW/TruckBase TMS API response.
    Phase 2: Replace with real TMS adapter.
    """
    # Generate 10-15 mock loads with realistic data
    # Include: load_number, customer, weight, commodity, stops, time windows
    pass
```

**Mock Data Structure:**
```python
{
    "load_number": "WMT-45892",
    "customer_name": "Walmart Distribution",
    "weight_lbs": 44500.0,
    "commodity_type": "general",
    "special_requirements": "Delivery appointment required",
    "status": "pending",  # TMS status
    "stops": [
        {
            "sequence": 1,
            "action_type": "pickup",
            "location": {
                "name": "Chicago Distribution Center",
                "address": "1000 W Distribution Dr",
                "city": "Chicago",
                "state": "IL",
                "zip": "60601",
                "lat": 41.8781,
                "lon": -87.6298
            },
            "time_window": {
                "earliest": "06:00",
                "latest": "10:00"
            },
            "estimated_dock_hours": 1.5
        },
        {
            "sequence": 2,
            "action_type": "delivery",
            "location": {...},
            "time_window": {...},
            "estimated_dock_hours": 2.0
        }
    ]
}
```

#### Task 1.2: Build TMS Sync Service

**File:** `apps/backend-py/app/services/tms_sync_service.py` (NEW)

```python
class TMSSyncService:
    """Service for syncing data from TMS to SALLY."""

    async def sync_loads(self, db: AsyncSession) -> None:
        """
        Sync loads from TMS mock endpoint.

        Process:
        1. Fetch loads from /api/v1/external/tms/loads
        2. For each load:
           a. Check if load exists (by load_number)
           b. If exists: update status and stops
           c. If new: create load + stops
        3. Create/update stops (locations) as needed
        4. Log sync results (loads added, updated, errors)
        """
        logger.info("tms_load_sync_started")

        # Call mock TMS endpoint
        tms_loads = await self._fetch_tms_loads()

        for tms_load in tms_loads:
            await self._upsert_load(db, tms_load)

        logger.info("tms_load_sync_completed", count=len(tms_loads))

    async def _fetch_tms_loads(self) -> List[dict]:
        """Fetch loads from TMS API (mock for now)."""
        # Call internal mock endpoint
        pass

    async def _upsert_load(self, db: AsyncSession, tms_load: dict) -> None:
        """Create or update load from TMS data."""
        # 1. Find or create stops (locations)
        # 2. Find or create load
        # 3. Create load_stops (junction table)
        pass
```

#### Task 1.3: Add Background Sync Job

**File:** `apps/backend-py/app/services/background_jobs.py` (EXISTS - ADD TO IT)

```python
async def sync_tms_data_job():
    """Background job: Sync drivers, vehicles, loads from TMS."""
    while True:
        try:
            async with async_session_maker() as db:
                # Existing syncs
                await sync_drivers_from_tms(db)
                await sync_vehicles_from_tms(db)

                # NEW: Sync loads
                tms_sync = TMSSyncService()
                await tms_sync.sync_loads(db)

        except Exception as e:
            logger.error("tms_sync_failed", error=str(e))

        await asyncio.sleep(900)  # 15 minutes
```

#### Task 1.4: Update Load API Endpoints

**Add Missing Endpoints:**

```python
# apps/backend-py/app/api/v1/endpoints/loads.py

@router.patch("/{load_id}", response_model=LoadResponse)
async def update_load_status(
    load_id: str,
    status: str,
    db: AsyncSession = Depends(get_db),
) -> LoadResponse:
    """Update load status (pending → planned → active → in_transit → completed)."""
    pass

@router.post("/{load_id}/assign", response_model=LoadResponse)
async def assign_load(
    load_id: str,
    driver_id: str,
    vehicle_id: str,
    db: AsyncSession = Depends(get_db),
) -> LoadResponse:
    """Assign driver and vehicle to load."""
    # Creates association, doesn't plan route yet
    pass

@router.post("/{load_id}/plan-route", response_model=RoutePlanResponse)
async def plan_route_for_load(
    load_id: str,
    db: AsyncSession = Depends(get_db),
) -> RoutePlanResponse:
    """
    Generate optimized route plan from load.

    Process:
    1. Validate load has driver and vehicle assigned
    2. Get driver's current HOS state
    3. Get vehicle's current fuel level
    4. Call route planning engine with load stops
    5. Return route plan with segments
    """
    pass
```

### Phase 2: Load Management UI (Week 2)

**Goal:** Build dispatcher dashboard for load management.

#### Task 2.1: Load List Page

**File:** `apps/web/src/app/loads/page.tsx` (NEW)

**Features:**
- Table view with columns: Load #, Customer, Status, Stops, Weight, Commodity
- Filters: Status (pending, planned, active, in_transit, completed), Customer
- Search: By load number or customer name
- Actions: View Details, Assign Driver, Plan Route
- Status badges with icons (from LOAD_STATUS_SYSTEM.md):
  - `pending` ⏳ (outline badge)
  - `planned` 📋 (secondary badge)
  - `active` 🔄 (secondary badge)
  - `in_transit` 🚚 (default badge - blue)
  - `completed` ✅ (secondary badge)
  - `cancelled` ❌ (destructive badge)

**UI Components (Shadcn):**
- ✅ Use `<Table>`, `<TableHeader>`, `<TableRow>`, `<TableCell>`
- ✅ Use `<Badge>` for status display
- ✅ Use `<Button>` for actions
- ✅ Use `<Select>` for filters
- ✅ Use `<Input>` for search
- ✅ Dark theme support (bg-background, text-foreground)
- ✅ Responsive design (mobile-first)

#### Task 2.2: Load Details Page

**File:** `apps/web/src/app/loads/[id]/page.tsx` (NEW)

**Features:**
- Load header: Load #, Customer, Status, Weight, Commodity
- Stops section: Map + ordered list of pickup/delivery stops
- Assignment section: Driver, Vehicle (with "Assign" button if unassigned)
- Special requirements: Display notes, time windows, dock hours
- Route planning: "Plan Route" button → generates route plan
- History: Status changes, updates, notes

**Sections:**
1. **Load Overview Card** (Card component)
   - Load number, customer, status badge
   - Weight, commodity type
   - Special requirements

2. **Stops List** (Card component)
   - Ordered list with sequence numbers
   - Stop type indicator (pickup/delivery)
   - Location details (name, city, state)
   - Time windows (if specified)
   - Estimated dock hours

3. **Assignment Card** (Card component)
   - Driver: John Smith (DRV-001) [Change]
   - Vehicle: TRUCK-101 (VEH-001) [Change]
   - If unassigned: [Assign Driver & Vehicle]

4. **Route Planning Card** (Card component)
   - If no route plan: [Plan Route] button
   - If route exists: Show route summary + [View Route] link
   - Route status, ETA, compliance summary

5. **Activity Timeline** (Card component)
   - Load created
   - Driver assigned
   - Route planned
   - Status changes

#### Task 2.3: Load Assignment Flow

**File:** `apps/web/src/app/loads/[id]/assign-dialog.tsx` (NEW)

**Dialog Component:**
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Assign Driver & Vehicle</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Assign Driver & Vehicle</DialogTitle>
    </DialogHeader>

    <Label>Driver</Label>
    <Select>
      {/* List available drivers with HOS status */}
    </Select>

    <Label>Vehicle</Label>
    <Select>
      {/* List available vehicles with fuel level */}
    </Select>

    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button onClick={onAssign}>Assign</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Task 2.4: Route Planning Integration

**Flow:**
1. Dispatcher clicks "Plan Route" on load details page
2. System validates:
   - Driver assigned? ✓
   - Vehicle assigned? ✓
   - Driver has HOS hours available? ✓
   - Vehicle has sufficient fuel? ✓
3. Call route planning API: `POST /api/v1/loads/{load_id}/plan-route`
4. Show loading state with progress indicator
5. On success: Redirect to route plan details page
6. On failure: Show error message with explanation

**Error Handling:**
- "Driver not assigned" → Show assign dialog
- "Driver out of HOS hours" → Suggest different driver
- "Route infeasible" → Show feasibility issues + override option

### Phase 3: Route Planning Integration (Week 3)

**Goal:** Connect loads → route plans seamlessly.

#### Task 3.1: Route Planner Accepts Load Input

**Update:** `apps/backend-py/app/services/route_planning_engine.py`

```python
class RoutePlanInput:
    # Existing fields...
    driver_id: str
    vehicle_id: str
    stops: List[StopInput]

    # NEW: Optional load reference
    load_id: str | None = None  # Links route plan to load

class RoutePlanningEngine:
    async def plan_route_from_load(
        self,
        load: Load,
        driver: Driver,
        vehicle: Vehicle,
    ) -> RoutePlan:
        """
        Generate route plan from load.

        Process:
        1. Extract stops from load (ordered by sequence)
        2. Get driver's current HOS state
        3. Get vehicle's current fuel level
        4. Run TSP optimization (stop sequence already set by load)
        5. Run HOS simulation (insert rest stops as needed)
        6. Insert fuel stops (if needed)
        7. Generate segments
        8. Save route plan (linked to load via load_id)
        """
        # Convert load stops → route planner input
        input_data = RoutePlanInput(
            driver_id=driver.driver_id,
            vehicle_id=vehicle.vehicle_id,
            load_id=load.load_id,  # Link to load
            stops=[
                StopInput(
                    stop_id=ls.stop.stop_id,
                    action_type=ls.action_type,
                    earliest_arrival=ls.earliest_arrival,
                    latest_arrival=ls.latest_arrival,
                    estimated_dock_hours=ls.estimated_dock_hours,
                )
                for ls in sorted(load.stops, key=lambda s: s.sequence_order)
            ],
        )

        # Run existing route planning logic
        route_plan = await self.plan_route(input_data)

        # Update load status: pending → planned
        load.status = "planned"
        await self.db.commit()

        return route_plan
```

#### Task 3.2: Load Status Automation

**Trigger Status Changes:**
- `pending` → `planned` (when route plan created)
- `planned` → `active` (when driver starts work on load)
- `active` → `in_transit` (when driver begins driving)
- `in_transit` → `active` (when driver arrives at stop)
- `active` → `completed` (when final delivery done)

**Implementation:**
```python
# apps/backend-py/app/services/load_status_service.py (NEW)

class LoadStatusService:
    """Manages load status transitions based on route execution."""

    async def update_load_status_from_route(
        self,
        load_id: str,
        route_event: str,  # route_started, segment_started, segment_completed
    ) -> None:
        """
        Update load status based on route execution events.

        Triggers:
        - route_started → planned → active
        - segment_started (type=drive) → active → in_transit
        - segment_completed (type=drive) → in_transit → active
        - route_completed → active → completed
        """
        pass
```

---

## Part 5: Future Considerations

### Phase 4: Real TMS Integration (Future)

**When ready for real TMS:**
1. Build TMS adapters (McLeod, TMW, TruckBase)
2. Implement OAuth flow for TMS authentication
3. Replace mock endpoints with real adapter calls
4. Add webhook support (TMS pushes load updates to SALLY)
5. Implement bi-directional sync (SALLY updates TMS status)

### Phase 5: Order → Load Conversion (Future)

**Allowing load creation in SALLY:**
- UI for creating loads manually (if customer doesn't have TMS)
- Order aggregation (combine multiple orders into one load)
- Stop optimization (suggest best pickup/delivery sequence)

**Use Cases:**
- Small fleets without TMS
- Owner-operators
- Brokerage operations

---

## Part 6: Questions & Design Decisions

### Q1: Should SALLY create loads or only consume them?

**Answer:** For POC, SALLY **only consumes** loads from TMS.

**Rationale:**
- Most customers have TMS already (McLeod, TMW, TruckBase)
- TMS is system of record for billing, customer orders
- SALLY's value = route planning + execution monitoring
- Future: Allow manual load creation for TMS-less customers

### Q2: How do we handle load updates from TMS?

**Answer:** **Sync & Cache** pattern with conflict resolution.

**Scenarios:**
1. TMS updates load stop: SALLY syncs on next 15min cycle
2. SALLY generates route: Store route plan linked to load
3. TMS cancels load: Mark load as `cancelled` in SALLY, archive route plan
4. Conflict (load changed while route active): Show alert to dispatcher

**Conflict Resolution:**
- If route is `draft`: Auto-accept TMS changes, regenerate route
- If route is `active`: Alert dispatcher, require manual decision

### Q3: What if load has no driver/vehicle assigned in TMS?

**Answer:** Load status = `pending`, can't plan route until assigned.

**UI Behavior:**
- Show loads with status = `pending` in "Unassigned Loads" section
- Dispatcher can assign driver/vehicle in SALLY
- Option: Sync assignment back to TMS (Phase 4)

### Q4: How do we handle multi-pickup or multi-delivery loads?

**Answer:** Already supported in schema via `load_stops.action_type`.

**Example:**
```
LOAD-007 (Home Depot - Construction Materials)
  Stop 1: Chicago Warehouse (pickup)
  Stop 2: Indianapolis Supplier (pickup)  ← Second pickup!
  Stop 3: Phoenix Distribution (delivery)
```

**Route Planner:**
- Respects stop sequence from TMS
- Applies TSP within pickup group and delivery group
- Never reorders pickups after deliveries

### Q5: What about partial deliveries?

**Answer:** Phase 2 enhancement.

**Current:** Load is either `in_transit` or `completed` (all stops done)

**Future:** Add `partially_delivered` status:
- Track which stops are completed
- Update ETA for remaining stops
- Generate partial proof of delivery

---

## Part 7: Success Metrics

**POC Success Criteria:**
1. ✅ 15+ mock loads synced from TMS endpoint
2. ✅ Load list page shows all loads with correct status badges
3. ✅ Load details page displays stops in correct sequence
4. ✅ Dispatcher can assign driver/vehicle to load
5. ✅ "Plan Route" generates route plan from load stops
6. ✅ Route plan linked to load (database relationship)
7. ✅ Load status updates: pending → planned → active → in_transit → completed

**Performance Targets:**
- Load list page load time: <2 seconds
- Route planning from load: <5 seconds
- TMS sync cycle: Every 15 minutes (background job)

**Quality Metrics:**
- Zero data loss on TMS sync (all loads imported)
- Zero route planning failures (with proper error messages)
- 100% dark theme support (no hardcoded colors)
- 100% responsive design (mobile/tablet/desktop)

---

## Part 8: Implementation Timeline

### Week 1: Mock TMS Integration (Backend)
- **Day 1-2:** Mock TMS loads endpoint + test data
- **Day 3-4:** TMS sync service (background job)
- **Day 5:** Load API endpoints (update, assign, plan-route)

### Week 2: Load Management UI (Frontend)
- **Day 1-2:** Load list page (table, filters, search)
- **Day 3-4:** Load details page (overview, stops, assignment)
- **Day 5:** Assignment dialog + route planning trigger

### Week 3: Route Planning Integration
- **Day 1-2:** Route planner accepts load input
- **Day 3-4:** Load status automation (status transitions)
- **Day 5:** End-to-end testing + bug fixes

### Week 4: Polish & Documentation
- **Day 1-2:** UI polish (responsive, dark theme, error states)
- **Day 3:** Documentation (API docs, user guide)
- **Day 4:** Demo preparation
- **Day 5:** Code review + merge

---

## Part 9: Risk Mitigation

### Risk 1: TMS Data Format Mismatch

**Risk:** Real TMS APIs might have different data structures than our mock.

**Mitigation:**
- Design adapter pattern (interface + implementations)
- Mock adapter matches real TMS structure (research McLeod API docs)
- Add validation layer (reject malformed TMS data)

### Risk 2: Load Sync Performance

**Risk:** Syncing 1000+ loads every 15 minutes might be slow.

**Mitigation:**
- Implement incremental sync (only fetch updated loads)
- Add pagination to TMS endpoint
- Use async batch processing (10 loads at a time)
- Monitor sync duration, adjust interval if needed

### Risk 3: Route Planning Failures

**Risk:** Some loads might be infeasible (HOS violations, no rest stops available).

**Mitigation:**
- Always validate before planning (driver HOS, fuel, time windows)
- Show clear error messages to dispatcher
- Allow manual override (dispatcher edits stops, HOS assumptions)
- Log all failures for debugging

---

## Appendix A: Database Relationships

```
loads (id, load_id, load_number, status, customer_name, weight, commodity)
  ↓
load_stops (load_id, stop_id, sequence_order, action_type, dock_hours)
  ↓
stops (id, stop_id, name, address, city, state, lat_lon, location_type)
  ↓
route_plans (id, plan_id, load_id, driver_id, vehicle_id, status)
  ↓
route_segments (plan_id, sequence_order, segment_type, from_location, to_location)
```

**Key Relationships:**
- `loads.id` ← `load_stops.load_id` (one-to-many)
- `stops.id` ← `load_stops.stop_id` (many-to-one, reusable stops)
- `loads.id` ← `route_plans.load_id` (one-to-many, multiple plan versions)

---

## Appendix B: API Endpoint Summary

### Loads Management
- `POST /api/v1/loads` - Create load (manual entry)
- `GET /api/v1/loads` - List loads (with filters)
- `GET /api/v1/loads/{load_id}` - Get load details
- `PATCH /api/v1/loads/{load_id}` - Update load status ⭐ NEW
- `POST /api/v1/loads/{load_id}/assign` - Assign driver/vehicle ⭐ NEW
- `POST /api/v1/loads/{load_id}/plan-route` - Generate route plan ⭐ NEW

### Mock TMS Integration
- `GET /api/v1/external/tms/loads` - Mock TMS loads ⭐ NEW
- `GET /api/v1/external/tms/drivers` - Mock TMS drivers (exists)
- `GET /api/v1/external/tms/vehicles` - Mock TMS vehicles (exists)

### Route Planning (Updated)
- `POST /api/v1/routes/plan` - Plan route (accepts load_id) ⭐ UPDATED

---

## Appendix C: UI Design Mockups

### Load List Page (Desktop)

```
┌─────────────────────────────────────────────────────────────────────┐
│  SALLY                                            [Search loads...]  │
├─────────────────────────────────────────────────────────────────────┤
│  Loads                                                               │
│                                                                       │
│  [All Statuses ▼]  [All Customers ▼]  [+ Create Load]              │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Load #      │ Customer        │ Status    │ Stops │ Weight    ││
│  ├─────────────────────────────────────────────────────────────────┤│
│  │ WMT-45892   │ Walmart Dist.  │ 🚚 in_transit │ 2  │ 44,500 lbs││
│  │ TGT-12034   │ Target Logistics│ ⏳ pending    │ 3  │ 42,000 lbs││
│  │ FDX-78234   │ FedEx Freight  │ 📋 planned    │ 3  │ 28,000 lbs││
│  │ AMZ-99201   │ Amazon FF      │ 🔄 active     │ 2  │ 38,750 lbs││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Load Details Page (Desktop)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Loads                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Load WMT-45892                           🚚 in_transit             │
│                                                                       │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│  ┃ LOAD OVERVIEW                                                 ┃ │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫ │
│  ┃ Customer: Walmart Distribution                                ┃ │
│  ┃ Weight: 44,500 lbs                                            ┃ │
│  ┃ Commodity: General Freight                                    ┃ │
│  ┃ Special Requirements: Delivery appointment required - call    ┃ │
│  ┃ 24h ahead                                                     ┃ │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                                                       │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│  ┃ STOPS                                                         ┃ │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫ │
│  ┃ 1. 📦 PICKUP                                                  ┃ │
│  ┃    Chicago Distribution Center                                ┃ │
│  ┃    1000 W Distribution Dr, Chicago, IL 60601                 ┃ │
│  ┃    Time Window: 6:00 AM - 10:00 AM                           ┃ │
│  ┃    Dock Time: 1.5 hours                                      ┃ │
│  ┃                                                               ┃ │
│  ┃ 2. 🚚 DELIVERY                                                ┃ │
│  ┃    Indianapolis Customer - XYZ Inc                            ┃ │
│  ┃    200 Commerce Ave, Indianapolis, IN 46204                  ┃ │
│  ┃    Time Window: 2:00 PM - 6:00 PM                            ┃ │
│  ┃    Dock Time: 2.0 hours                                      ┃ │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                                                       │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│  ┃ ASSIGNMENT                                                    ┃ │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫ │
│  ┃ Driver: John Smith (DRV-001)                      [Change]   ┃ │
│  ┃ Vehicle: TRUCK-101 (VEH-001)                      [Change]   ┃ │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                                                       │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│  ┃ ROUTE PLAN                                                    ┃ │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫ │
│  ┃ Status: Active                                                ┃ │
│  ┃ ETA: Feb 6, 2026 6:30 PM                                     ┃ │
│  ┃ Total Distance: 185 miles                                    ┃ │
│  ┃ HOS Compliance: ✅ Zero violations                            ┃ │
│  ┃                                                               ┃ │
│  ┃ [View Route Details]                                         ┃ │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Ready to Implement? ✅

This plan provides:
- ✅ Complete understanding of loads in fleet management
- ✅ Review of existing implementation (database, API, seed data)
- ✅ TMS integration architecture (mock + future real)
- ✅ Detailed implementation tasks (backend + frontend)
- ✅ UI mockups and component specifications
- ✅ Risk mitigation strategies
- ✅ Success metrics and timeline

**Next Steps:**
1. Review this plan with product team
2. Prioritize Phase 1 tasks (mock TMS integration)
3. Create Jira tickets from task list
4. Begin Week 1 implementation

**Questions for Product Team:**
1. Do we want to support manual load creation in POC, or only TMS sync?
2. Should load assignment in SALLY sync back to TMS (bi-directional)?
3. What TMS systems do our pilot customers use? (prioritize adapter development)
4. Do we need load analytics/reporting in POC, or Phase 2?
