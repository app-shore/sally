# SALLY TMS Strategy & Phase 0 Design

**Date:** February 9, 2026
**Status:** Design
**Author:** AI-assisted brainstorming session

---

## Executive Summary

Carriers using TMS platforms without public APIs (like Truckbase) cannot integrate with SALLY's route intelligence. The solution: build SALLY into a minimum viable TMS so carriers can either (a) use SALLY alongside their existing TMS via integration, or (b) use SALLY as their primary operational platform with manual data entry.

SALLY's moat is its **intelligent route planning with HOS compliance** — something no TMS for small carriers (20-100 trucks) offers today. The TMS features are table-stakes that get carriers in the door; the intelligence is what keeps them.

---

## The Problem

1. **Truckbase** (the leading TMS for 10-50 truck carriers) has **no public API**
2. Carriers who manage operations in closed TMS systems can't benefit from SALLY's route intelligence
3. SALLY currently requires TMS integration to populate drivers, vehicles, and loads
4. Without data, SALLY's route planning engine sits idle

## The Opportunity

**Market research findings (February 2026):**

- No TMS for small carriers (20-100 trucks) combines dispatch with HOS-aware route planning
- The only competitor doing this is **Trimble** — at enterprise pricing ($1,000+/mo for 50+ truck fleets)
- Truckbase has no route planning, no HOS-aware dispatch, no fuel optimization, no monitoring
- SALLY already has the hardest parts built: route planning engine, HOS compliance, rest/fuel optimization, continuous monitoring, Sally AI nerve center
- US TMS market: $5.2B in 2025, growing to $37B by 2030 (15% CAGR)

---

## Competitive Positioning

### What Truckbase Does vs. What SALLY Does

| Capability | Truckbase | SALLY (Today) | SALLY (Phase 1) |
|-----------|-----------|---------------|------------------|
| Load/dispatch management | Yes | Partial (read-only) | Yes (manual + sync) |
| Driver/vehicle management | Yes | Partial (read-only) | Yes (manual + sync) |
| Invoicing | Yes | No | Yes |
| Driver settlements | Yes | No | Yes |
| QuickBooks integration | Yes | No | Yes |
| ELD integration | Yes (30+ providers) | Yes (Samsara mock) | Yes (Samsara live) |
| Document management | Yes | No | Phase 2 |
| AI load importer | Yes | No | Phase 2 |
| **HOS-compliant route planning** | **No** | **Yes** | **Yes** |
| **Automatic rest stop insertion** | **No** | **Yes** | **Yes** |
| **Fuel stop optimization** | **No** | **Yes** | **Yes** |
| **Continuous monitoring (24/7)** | **No** | **Yes** | **Yes** |
| **Proactive dispatcher alerts** | **No** | **Yes** | **Yes** |
| **AI assistant (voice + text)** | **No** | **Yes** | **Yes** |
| **Dynamic route re-planning** | **No** | **Yes** | **Yes** |

**The bottom 7 rows are SALLY's moat.** No competitor offers these at the small carrier price point.

---

## Strategy: Dual-Source Data Model

### The Architecture

Every entity (driver, vehicle, load) can come from **either manual entry OR TMS integration**, and the system treats them identically.

```
                    ┌─── TMS with API ───────────┐
                    │  (auto-sync)               │
                    │  external_source = "rose_rocket" │
                    └────────────┬───────────────┘
                                 │
                                 ▼
Drivers ─────────┐        ┌───────────────┐
Vehicles ────────┤───────>│     SALLY     │──> Route Planning
Loads ───────────┘        │   Database    │──> HOS Compliance
                                 ▲        ──> Monitoring
                                 │        ──> Alerts
                    ┌────────────┴───────────────┐
                    │  Manual Entry               │
                    │  (dispatcher types)         │
                    │  external_source = null     │
                    └────────────────────────────┘
```

### Rules

1. **Manual entries** (`external_source = null`): Fully editable — dispatcher can change anything
2. **TMS-synced entries** (`external_source = "truckbase"`): Read-only for synced fields. SALLY-specific data (route plan, notes, alerts) remains editable
3. **Status sync-back**: For TMS loads, SALLY syncs operational status back to the TMS. For manual loads, SALLY IS the source of truth
4. **ExternalSourceGuard**: Already implemented in backend — blocks modification of synced records

### Load Flow: Two Scenarios

**Carrier A: Has TMS with API (e.g., Rose Rocket)**
```
Rose Rocket creates load → Sync pulls into SALLY →
Dispatcher assigns driver + vehicle in SALLY →
SALLY plans HOS-compliant route →
Driver executes → Status updates sync back to Rose Rocket
```

**Carrier B: No TMS or TMS without API (e.g., Truckbase)**
```
Dispatcher creates load manually in SALLY →
Assigns driver + vehicle →
SALLY plans HOS-compliant route →
Driver executes → No sync needed, SALLY is source of truth
```

---

## Phased Roadmap

### Phase 0: Enable Manual Entry + Load Lifecycle (NOW)

**Goal:** Let carriers use SALLY without TMS integration by manually creating drivers, vehicles, and loads.

**What to build:**
- Enable "Add Driver" button — wire to existing `POST /drivers` API
- Enable "Add Truck" button — wire to existing `POST /vehicles` API
- Enable "Add Load" button — build load creation form with stops
- Load status lifecycle UI (Pending → Dispatched → In Transit → Delivered)
- Load assignment flow (assign driver + vehicle to load)
- Smart messaging: show integration banner only when integrations exist; show "Add" buttons for manual entry

**What already exists (backend):**
- `POST /drivers` — Create driver API ✅
- `POST /vehicles` — Create vehicle API ✅
- `POST /loads` — Create load with stops API ✅
- `PATCH /loads/:id/status` — Update load status ✅
- `POST /loads/:id/assign` — Assign driver + vehicle ✅
- `ExternalSourceGuard` — Protects synced records ✅
- Driver form component (exists in fleet page) ✅
- Vehicle form component (exists in fleet page) ✅

**What's missing (frontend):**
- Load creation modal/form (needs stop entry with address/time windows)
- Un-disable "Add" buttons when no external source exists
- Load status transition UI
- Load assignment UI before route planning

**Schema gaps to address:**
- ~~`Load` model missing `tenantId`~~ — DONE (added as optional `Int?`, should be made required)
- ~~`Load` model missing `driverId` / `vehicleId`~~ — NOT NEEDED. `RoutePlanLoad` join table connects Load → RoutePlan, and RoutePlan already holds driver + vehicle. This is better because a single route can carry multiple loads (many-to-many).
- `Load` model missing `rate` / pricing fields — needed for Phase 1 invoicing (can defer)
- `LoadStop` references existing `Stop` by ID — for manual entry, need to create Stops inline or allow inline stop creation

### Phase 1: Invoicing + Settlements → BECOMES TMS

**Goal:** Add the two capabilities that transform SALLY from "route planning tool" into a "TMS".

**What to build:**
- Invoice generation from delivered loads (rate + accessorials + detention)
- Driver settlement calculation (per-mile, percentage, flat rate, deductions)
- Settlement statement PDF generation
- QuickBooks Online integration (push invoices + settlements)
- Basic AR tracking (invoice status: sent → viewed → paid → overdue)

**Why this matters:**
- Without invoicing, you're "dispatch software" — not a TMS
- Without settlements, carriers can't pay drivers — deal breaker
- QuickBooks integration is non-negotiable for 80%+ of 20-100 truck carriers

### Phase 2: Full Feature Parity

**Goal:** Match or exceed Truckbase feature set so carriers have zero reason to keep their old TMS.

**What to build:**
- IFTA reporting (auto-calculated from ELD mileage data)
- Factoring integration (RTS Financial, Triumph, OTR Solutions)
- Document management (BOL/POD upload from driver mobile app)
- Load board integration (DAT, Truckstop.com)
- EDI integration (electronic data interchange with shippers)
- Customer portal (shippers track their loads without calling dispatch)
- Fuel card integration (Comdata, WEX for expense tracking)
- AI-powered rate confirmation import (OCR/LLM to parse PDFs)

---

## Phase 0 Detailed Design

### 1. UI Changes to Fleet Management Page

#### Smart Banner Logic

Currently shows "One-way PULL integration" banner unconditionally. Change to:

```
IF tenant has active TMS integrations:
  Show integration banner + Sync Now button
  Show "Add [Entity]" button (enabled) with tooltip: "Create manual entry"

IF tenant has NO integrations:
  Hide integration banner entirely
  Show "Add [Entity]" button (enabled) — primary action
```

This ensures both paths work: carriers with integrations can ALSO add manual entries, and carriers without integrations see a clean "add your data" experience.

#### Driver Creation (Already Working)

The `DriverForm` component already exists at line 342 of the fleet page with fields:
- Name (required)
- License Number (required)
- Phone
- Email

Backend `POST /drivers` exists. **Just need to un-disable the button.**

Manual drivers created with `external_source = null`, `status = PENDING_ACTIVATION`.

#### Vehicle/Truck Creation (Already Working)

The `VehicleForm` component already exists at line 726 with fields:
- Unit Number (required)
- Make, Model, Year, VIN
- Fuel Capacity (required)
- MPG

Backend `POST /vehicles` exists. **Just need to un-disable the button.**

Manual vehicles created with `external_source = null`.

#### Load Creation (Needs New Form)

New `LoadForm` component needed with:

**Load Details:**
- Load Number (required) — e.g., "LD-2026-0142"
- Customer Name (required)
- Commodity Type (required) — dropdown or text
- Weight (lbs) (required)
- Special Requirements (optional) — text area
- Rate ($) (optional, for future invoicing)

**Stops (dynamic list, minimum 2):**
Each stop needs:
- Action Type: Pickup or Delivery (required)
- Stop Name (required) — e.g., "Walmart DC #4523"
- Address (required)
- City (required)
- State (required)
- Earliest Arrival (optional) — time window start
- Latest Arrival (optional) — time window end
- Estimated Dock Hours (required) — how long at this stop

**Form behavior:**
- Start with 1 Pickup + 1 Delivery (minimum)
- "Add Stop" button to add more stops
- Drag to reorder stops (or up/down arrows)
- Auto-generate sequence_order from position
- On submit: create Stop records if they don't exist, then create Load + LoadStops

### 2. Load Lifecycle Status

```
pending ──→ dispatched ──→ in_transit ──→ delivered
   │              │                          │
   └── cancelled  └── cancelled              └── (future: invoiced → paid)
```

Current valid statuses in backend: `pending, planned, active, in_transit, completed, cancelled`

**Recommended simplification for dispatcher UX:**
- `pending` — Load created, no driver/vehicle assigned
- `dispatched` — Driver + vehicle assigned, route planned
- `in_transit` — Driver has started the route
- `delivered` — All stops completed
- `cancelled` — Load cancelled

Status transitions should update automatically when:
- Load assigned + route planned → `dispatched`
- Route activated / driver starts moving → `in_transit`
- All delivery stops completed → `delivered`

Dispatcher can also manually change status via UI.

### 3. Load-to-RoutePlan Connection — ALREADY DONE

The merge already created `RoutePlanLoad` join table (many-to-many):

```prisma
model RoutePlanLoad {
  id          Int       @id @default(autoincrement())
  planId      Int       @map("plan_id")
  loadId      Int       @map("load_id")
  plan        RoutePlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  load        Load      @relation(fields: [loadId], references: [id])
  @@unique([planId, loadId])
}
```

This is **better than putting driverId/vehicleId on Load** because:
- A single route plan can carry multiple loads (multi-stop, multi-load)
- A load can be re-assigned (old plan cancelled, new plan created) with full history
- Driver + vehicle live on RoutePlan, not Load — loads don't inherently have a driver

**Assignment flow:**
```
Load (pending) → Create RoutePlan (pick driver + vehicle + load(s))
  → RoutePlanLoad links them → Load status = "dispatched"
```

**Remaining schema change for Phase 1:**
- Add `rate` field to Load model when invoicing is built

### 4. Status Sync-Back for TMS Loads

For loads with `external_source != null`, status changes in SALLY should be pushed back to the source TMS:

```typescript
async updateLoadStatus(loadId: string, status: string) {
  const load = await this.updateStatus(loadId, status);

  // If load came from TMS, sync status back
  if (load.external_source && load.external_load_id) {
    await this.integrationSyncService.pushStatusUpdate({
      source: load.external_source,
      external_id: load.external_load_id,
      status: status,
      updated_at: new Date(),
    });
  }

  return load;
}
```

For Phase 0, this can be a no-op with logging (since we don't have real TMS API connections yet). The architecture is in place for when real integrations are built.

---

## Schema Migration Summary (Phase 0)

**Most schema changes already merged.** Remaining:

```sql
-- Make tenant_id required (currently optional Int?)
-- This may require backfilling existing loads with a default tenant
ALTER TABLE loads ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_loads_tenant_id ON loads(tenant_id);
```

**Already done (from routing merge):**
- `loads.tenant_id` — added (optional)
- `route_plan_loads` join table — Load ↔ RoutePlan many-to-many
- RoutePlan already has `driver_id` and `vehicle_id`

**Deferred to Phase 1 (invoicing):**
- `loads.rate` — revenue rate in dollars

---

## Success Criteria

### Phase 0 Complete When:
- [ ] Dispatcher can manually create drivers, vehicles, and loads
- [ ] Dispatcher can assign driver + vehicle to a load
- [ ] Load status tracks through lifecycle (pending → dispatched → in_transit → delivered)
- [ ] Loads with `external_source` remain read-only (existing behavior preserved)
- [ ] Manual loads (`external_source = null`) are fully editable
- [ ] Mixed fleet: some entities from TMS, some manual — works seamlessly
- [ ] Route planning can be initiated from a load

### Phase 1 Complete When (becomes "TMS"):
- [ ] Invoice generated from delivered load with rate + accessorials
- [ ] Driver settlement calculated from completed loads
- [ ] QuickBooks Online integration syncs invoices + settlements
- [ ] Basic AR dashboard shows outstanding invoices

---

## Appendix: TMS Market Research Summary

### What Makes a TMS a TMS (Day-One Requirements)

1. **Load/Order Management** — Create, track loads through lifecycle
2. **Dispatch** — Assign drivers/trucks to loads
3. **Invoicing** — Generate invoices from completed loads
4. **Driver Settlements** — Calculate and generate driver pay
5. **Document Storage** — BOLs, rate confirmations, PODs
6. **Basic Reporting** — Revenue, profitability, AR aging
7. **QuickBooks Integration** — #1 asked-for integration in small trucking

Without items 1-2, you're not even dispatch software.
Without items 3-4, you're dispatch software but not a TMS.
Items 5-7 round out the minimum viable TMS.

### Phase 2 Features (Competitive Parity)

| Feature | Priority | Notes |
|---------|----------|-------|
| IFTA reporting | Medium | Quarterly requirement, can defer 3-6 months |
| Factoring integration | Medium | RTS, Triumph — important for cash flow |
| Load board integration | Medium | DAT, Truckstop.com — for non-contracted freight |
| Document management | Medium | BOL/POD upload from driver app |
| Fuel card integration | Low-Medium | Comdata, WEX expense tracking |
| EDI integration | Low | For enterprise shippers |
| Customer portal | Low | Shippers track loads without calling |
| Built-in accounting | Not planned | Most prefer QuickBooks |

### Competitors Without Public APIs (Stuck Like Truckbase)

- Truckbase — No public API docs, no developer portal
- TruckingOffice — No API
- Truckpedia — No API
- Toro TMS — No API

### Competitors WITH APIs (Integration Possible)

- Rose Rocket (TMS.AI) — Open API + webhooks
- Alvys — API-first, 120+ integrations
- McLeod LoadMaster — RESTful API with developer portal
- Tailwind TMS — API + webhooks on Unlimited tier
- Trimble TMW — Extensive API (enterprise)

### Sources

- FreightWaves TMS ratings 2025
- FleetOwner carrier TMS analysis
- G2 and Capterra TMS reviews
- Samsara developer documentation
- TruckersReport forums (carrier discussions)
- GM Insights TMS market report ($5.2B → $37B by 2030)
