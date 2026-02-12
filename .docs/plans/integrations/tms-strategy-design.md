# TMS Market Strategy & Phase 0/1 Roadmap

> **Status:** ⚠️ Partial (Phase 0 in progress) | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-09-sally-tms-strategy-and-phase0-design.md`

---

## Executive Summary

Carriers using TMS platforms without public APIs (like Truckbase) cannot integrate with SALLY's route intelligence. The strategy is to build SALLY into a minimum viable TMS so carriers can either (a) use SALLY alongside their existing TMS via integration, or (b) use SALLY as their primary operational platform with manual data entry.

SALLY's moat is **intelligent route planning with HOS compliance** -- something no TMS for small carriers (20-100 trucks) offers today. The TMS features are table-stakes that get carriers in the door; the intelligence is what keeps them.

---

## The Problem

1. **Truckbase** (leading TMS for 10-50 truck carriers) has **no public API**
2. Carriers managing operations in closed TMS systems cannot benefit from SALLY's route intelligence
3. SALLY currently requires TMS integration to populate drivers, vehicles, and loads
4. Without data, SALLY's route planning engine sits idle

## The Opportunity

**Market research (February 2026):**

- No TMS for small carriers (20-100 trucks) combines dispatch with HOS-aware route planning
- Only competitor: **Trimble** -- at enterprise pricing ($1,000+/mo for 50+ truck fleets)
- Truckbase has no route planning, no HOS-aware dispatch, no fuel optimization, no monitoring
- SALLY already has the hardest parts built: route planning engine, HOS compliance, rest/fuel optimization, continuous monitoring
- US TMS market: $5.2B in 2025, growing to $37B by 2030 (15% CAGR)

---

## Competitive Positioning

### SALLY vs. Truckbase Capabilities

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

The bottom 7 rows are SALLY's moat. No competitor offers these at the small carrier price point.

---

## Strategy: Dual-Source Data Model

Every entity (driver, vehicle, load) can come from **either manual entry OR TMS integration**, and the system treats them identically.

```
                    --- TMS with API (auto-sync) ---
                    external_source = "project44_tms"
                                |
                                v
Drivers ----------+       +-----------+
Vehicles ---------+------>|   SALLY   |---> Route Planning
Loads ------------+       | Database  |---> HOS Compliance
                                ^     ---> Monitoring
                                |     ---> Alerts
                    --- Manual Entry ---
                    (dispatcher types in)
                    external_source = null
```

### Rules

1. **Manual entries** (`external_source = null`): Fully editable -- dispatcher can change anything
2. **TMS-synced entries** (`external_source = "project44_tms"`): Read-only for synced fields. SALLY-specific data (route plan, notes, alerts) remains editable
3. **Status sync-back**: For TMS loads, SALLY syncs operational status back to TMS. For manual loads, SALLY is the source of truth
4. **ExternalSourceGuard**: Already implemented in backend -- blocks modification of synced records

### Load Flow: Two Scenarios

**Carrier A: Has TMS with API (e.g., project44)**
```
project44 creates load -> Sync pulls into SALLY ->
Dispatcher assigns driver + vehicle in SALLY ->
SALLY plans HOS-compliant route ->
Driver executes -> Status updates sync back to project44
```

**Carrier B: No TMS or TMS without API (e.g., Truckbase)**
```
Dispatcher creates load manually in SALLY ->
Assigns driver + vehicle ->
SALLY plans HOS-compliant route ->
Driver executes -> No sync needed, SALLY is source of truth
```

---

## Phased Roadmap

### Phase 0: Enable Manual Entry + Load Lifecycle (Current Phase)

**Goal:** Let carriers use SALLY without TMS integration by manually creating drivers, vehicles, and loads.

#### What to build

- Enable "Add Driver" button -- wire to existing `POST /drivers` API
- Enable "Add Truck" button -- wire to existing `POST /vehicles` API
- Enable "Add Load" button -- build load creation form with stops
- Load status lifecycle UI (Pending -> Dispatched -> In Transit -> Delivered)
- Load assignment flow (assign driver + vehicle to load)
- Smart messaging: show integration banner only when integrations exist

#### What already exists (backend)

| Component | Status | Notes |
|-----------|--------|-------|
| `POST /drivers` | Built | Create driver API |
| `POST /vehicles` | Built | Create vehicle API |
| `POST /loads` | Built | Create load with stops API |
| `PATCH /loads/:id/status` | Built | Update load status |
| `POST /loads/:id/assign` | Built | Assign driver + vehicle |
| `ExternalSourceGuard` | Built | Protects synced records |
| Driver form component | Built | Exists in fleet page |
| Vehicle form component | Built | Exists in fleet page |

#### What's missing (frontend)

| Component | Status | Notes |
|-----------|--------|-------|
| Load creation modal/form | Designed, not yet built | Needs stop entry with address/time windows |
| Un-disable "Add" buttons | Designed, not yet built | Currently disabled when no external source exists |
| Load status transition UI | Designed, not yet built | Visual status badges + manual transition |
| Load assignment UI | Designed, not yet built | Before route planning |

#### Load Lifecycle Status

```
pending --> dispatched --> in_transit --> delivered
   |              |                       |
   +-- cancelled  +-- cancelled           +-- (future: invoiced -> paid)
```

Current valid statuses in backend: `pending, planned, active, in_transit, completed, cancelled`

Status transitions should update automatically when:
- Load assigned + route planned -> `dispatched`
- Route activated / driver starts moving -> `in_transit`
- All delivery stops completed -> `delivered`

#### Load-to-RoutePlan Connection (Already Built)

The `RoutePlanLoad` join table (many-to-many) connects Load to RoutePlan:

```prisma
model RoutePlanLoad {
  id       Int       @id @default(autoincrement())
  planId   Int       @map("plan_id")
  loadId   Int       @map("load_id")
  plan     RoutePlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  load     Load      @relation(fields: [loadId], references: [id])
  @@unique([planId, loadId])
}
```

This is better than putting `driverId`/`vehicleId` on Load because:
- A single route plan can carry multiple loads (multi-stop, multi-load)
- A load can be re-assigned (old plan cancelled, new plan created) with full history
- Driver + vehicle live on RoutePlan, not Load

**Assignment flow:**
```
Load (pending) -> Create RoutePlan (pick driver + vehicle + load(s))
  -> RoutePlanLoad links them -> Load status = "dispatched"
```

#### Schema Gap: Status Sync-Back (Designed, not yet built)

For loads with `external_source != null`, status changes in SALLY should be pushed back to the source TMS:

```typescript
async updateLoadStatus(loadId: string, status: string) {
  const load = await this.updateStatus(loadId, status);
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

For Phase 0, this is a no-op with logging. The architecture is in place for when real integrations are built.

---

### Phase 1: Invoicing + Settlements -> Becomes TMS

**Goal:** Add the two capabilities that transform SALLY from "route planning tool" into a "TMS".

**Status:** Designed, not yet built

#### What to build

| Feature | Priority | Notes |
|---------|----------|-------|
| Invoice generation from delivered loads | High | Rate + accessorials + detention |
| Driver settlement calculation | High | Per-mile, percentage, flat rate, deductions |
| Settlement statement PDF generation | High | Required for driver pay |
| QuickBooks Online integration | High | Push invoices + settlements |
| Basic AR tracking | Medium | Invoice status: sent -> viewed -> paid -> overdue |

#### Why this matters

- Without invoicing: you're "dispatch software" -- not a TMS
- Without settlements: carriers can't pay drivers -- deal breaker
- QuickBooks integration: non-negotiable for 80%+ of 20-100 truck carriers

#### Schema additions needed

- `loads.rate` -- revenue rate in dollars (deferred from Phase 0)
- Invoice model with line items, status tracking
- Settlement model with calculation rules
- QuickBooks sync configuration

---

### Phase 2: Full Feature Parity

**Goal:** Match or exceed Truckbase feature set.

**Status:** Designed, not yet built

| Feature | Priority | Notes |
|---------|----------|-------|
| IFTA reporting | Medium | Auto-calculated from ELD mileage data |
| Factoring integration | Medium | RTS Financial, Triumph, OTR Solutions |
| Document management | Medium | BOL/POD upload from driver mobile app |
| Load board integration | Medium | DAT, Truckstop.com |
| EDI integration | Low | Electronic data interchange with shippers |
| Customer portal | Low | Shippers track their loads without calling dispatch |
| Fuel card integration | Low-Medium | Comdata, WEX for expense tracking |
| AI-powered rate confirmation import | Low | OCR/LLM to parse PDF rate confirmations |

---

## Success Criteria

### Phase 0 Complete When

- [ ] Dispatcher can manually create drivers, vehicles, and loads
- [ ] Dispatcher can assign driver + vehicle to a load
- [ ] Load status tracks through lifecycle (pending -> dispatched -> in_transit -> delivered)
- [ ] Loads with `external_source` remain read-only (existing behavior preserved)
- [ ] Manual loads (`external_source = null`) are fully editable
- [ ] Mixed fleet: some entities from TMS, some manual -- works seamlessly
- [ ] Route planning can be initiated from a load

### Phase 1 Complete When (becomes "TMS")

- [ ] Invoice generated from delivered load with rate + accessorials
- [ ] Driver settlement calculated from completed loads
- [ ] QuickBooks Online integration syncs invoices + settlements
- [ ] Basic AR dashboard shows outstanding invoices

---

## Market Research Context

### What Makes a TMS a TMS (Day-One Requirements)

1. **Load/Order Management** -- Create, track loads through lifecycle
2. **Dispatch** -- Assign drivers/trucks to loads
3. **Invoicing** -- Generate invoices from completed loads
4. **Driver Settlements** -- Calculate and generate driver pay
5. **Document Storage** -- BOLs, rate confirmations, PODs
6. **Basic Reporting** -- Revenue, profitability, AR aging
7. **QuickBooks Integration** -- #1 asked-for integration in small trucking

Without items 1-2: not even dispatch software.
Without items 3-4: dispatch software but not a TMS.
Items 5-7: round out the minimum viable TMS.

### Competitors Without Public APIs

- Truckbase -- No public API docs, no developer portal
- TruckingOffice -- No API
- Truckpedia -- No API
- Toro TMS -- No API

### Competitors WITH APIs (Integration Possible)

- Rose Rocket (TMS.AI) -- Open API + webhooks
- Alvys -- API-first, 120+ integrations
- McLeod LoadMaster -- RESTful API with developer portal
- Tailwind TMS -- API + webhooks on Unlimited tier
- Trimble TMW -- Extensive API (enterprise)

---

## Current State vs. Roadmap

| Capability | Status | Phase |
|-----------|--------|-------|
| TMS integration pull (project44, McLeod) | Built (mock mode) | Phase 0 |
| ELD integration pull (Samsara) | Built (live) | Phase 0 |
| Manual driver/vehicle creation (backend) | Built | Phase 0 |
| Manual driver/vehicle creation (frontend) | Built (form exists, button may be disabled) | Phase 0 |
| Manual load creation (backend) | Built | Phase 0 |
| Manual load creation (frontend) | Designed, not yet built | Phase 0 |
| Load status lifecycle (backend) | Built | Phase 0 |
| Load status lifecycle (frontend) | Designed, not yet built | Phase 0 |
| Load assignment to route plan | Built | Phase 0 |
| Status sync-back to TMS | Designed, not yet built | Phase 0 |
| Invoicing | Designed, not yet built | Phase 1 |
| Driver settlements | Designed, not yet built | Phase 1 |
| QuickBooks integration | Designed, not yet built | Phase 1 |
| IFTA reporting | Designed, not yet built | Phase 2 |
| Document management | Designed, not yet built | Phase 2 |
| Load board integration | Designed, not yet built | Phase 2 |
| Customer portal | Designed, not yet built | Phase 2 |
