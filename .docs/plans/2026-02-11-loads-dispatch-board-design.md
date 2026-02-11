# Loads Dispatch Board — Feature Design

**Created:** February 11, 2026
**Status:** Design Complete — Ready for Implementation Planning
**Epic:** Load Management & Dispatcher Workflow
**Personas:** Dispatcher (primary), Operations Manager (secondary)

---

## Problem Statement

Dispatchers at small/medium carriers spend their day getting loads into the system and moving them through the pipeline: intake → plan → activate → deliver. Currently SALLY has basic load creation as a tab inside Fleet, which is insufficient for a dispatcher's primary daily workflow.

Loads arrive from many sources (email, Excel, phone calls, TMS sync, load boards) and the dispatcher needs a fast, unified way to process them all.

---

## Design Decisions

1. **Loads gets its own top-level sidebar page** — separated from Fleet (which is assets: drivers, vehicles). Loads = work. Fleet = resources.
2. **Hybrid intake model** — some customers have TMS integrations (Project44, Samsara, McLeod), others use SALLY as primary system with manual entry.
3. **All intake sources funnel into one review flow** — regardless of how a load enters (manual, email, Excel, DAT, TMS), it lands in the same draft → review → confirm pipeline.
4. **No live tracking on Loads page** — that lives on Live Routes. Loads page is purely intake, planning workflow, and status overview.
5. **Google Places API for all address entry** — no custom autocomplete, just Google Places everywhere.
6. **DAT integration is inbound only** — search and import loads from DAT into SALLY. No outbound posting for now.

---

## Navigation Change

```
Sidebar (Dispatcher):
  Command Center    /dispatcher/overview
  Loads             /dispatcher/loads          ← NEW top-level page
  Plan Route        /dispatcher/create-plan
  Live Routes       /dispatcher/active-routes
  Fleet             /dispatcher/fleet          ← drivers, vehicles only
  Operations        (alerts, monitoring)
  Settings
```

---

## Load Status Flow

```
Load enters (any source)
  ↓
DRAFT → dispatcher reviews, confirms
  ↓
PENDING → confirmed, needs route planning
  ↓
Dispatcher clicks [Plan Route →]
  → navigates to /dispatcher/create-plan?load_id=LD-XXXX
  → load data pre-filled, dispatcher picks driver + vehicle
  → generates route, reviews on map
  ↓
PLANNED → route generated, not yet activated
  ↓
Dispatcher clicks [Activate]
  → appears on Live Routes page
  → monitoring kicks in
  → alerts go to Command Center
  ↓
ACTIVE → in transit, tracked on Live Routes
  ↓
COMPLETED → delivered, POD available
```

---

## Page Layout: The Dispatch Board

### Top Bar

```
Loads                                    [+ New Load]  [Import ▾]
                                                        ├─ Excel/CSV
                                                        ├─ From Email
                                                        └─ Search DAT
```

One primary action (New Load), one dropdown for other intake methods.

### Quick Stats Strip

```
Today: 24 active  •  3 drafts  •  5 need planning  •  2 planned  •  8 completed  •  $47,200 revenue
```

One line. Entire operation health at a glance.

### View Toggle

```
[Active Board]    [Completed]    [Cancelled]
```

Active Board shows the 4-column Kanban. Completed/Cancelled show a simple searchable table.

### The Board — 4-Column Kanban

```
┌─ Drafts ────────┐ ┌─ Ready to Plan ──┐ ┌─ Planned ────────┐ ┌─ Active ─────────┐
│                  │ │                   │ │                   │ │                   │
│ Loads from email │ │ Confirmed loads   │ │ Route planned,    │ │ Activated, now    │
│ or import that   │ │ that need route   │ │ not yet activated │ │ on Live Routes    │
│ need review      │ │ planning          │ │                   │ │                   │
│                  │ │                   │ │                   │ │                   │
│ Action: Review   │ │ Action: [Plan     │ │ Action: [Activate]│ │ Action: [View on  │
│ & confirm        │ │ Route →]          │ │ or [Edit Plan]    │ │ Live Routes →]    │
└──────────────────┘ └───────────────────┘ └───────────────────┘ └───────────────────┘
```

---

## Load Cards Per Column

### Draft Card (from email/import)

```
┌──────────────────────────────────┐
│ 📧 From: ABC Furniture           │
│ Dallas, TX → Atlanta, GA         │
│ Feb 12 pickup • 20k lbs          │
│                                  │
│ [Review & Confirm]               │
└──────────────────────────────────┘
```

### Ready to Plan Card

```
┌──────────────────────────────────┐
│ LD-4821              ✋ Manual   │
│ ABC Furniture                    │
│ Dallas, TX → Atlanta, GA         │
│ 780 mi • 3 stops • Dry Van      │
│ Feb 12, 6am • 20k lbs           │
│                                  │
│ [Plan Route →]                   │
└──────────────────────────────────┘
```

Clicking [Plan Route →] navigates to `/dispatcher/create-plan?load_id=LD-4821` with all load data pre-filled.

### Planned Card

```
┌──────────────────────────────────┐
│ LD-4821              ✋ Manual   │
│ ABC Furniture                    │
│ Dallas, TX → Atlanta, GA         │
│ 🚛 Mike T. • Truck #204         │
│ Departs: Feb 12, 5:30am         │
│                                  │
│ [Activate]    [Edit Plan]        │
└──────────────────────────────────┘
```

### Active Card (minimal — detail lives on Live Routes)

```
┌──────────────────────────────────┐
│ LD-4821              🟢 Active  │
│ ABC Furniture                    │
│ Dallas, TX → Atlanta, GA         │
│ 🚛 Mike T.                      │
│                                  │
│ [View on Live Routes →]          │
│ [🔗 Copy Tracking Link]         │
└──────────────────────────────────┘
```

---

## Load Detail — Slide-Out Panel

Clicking any card opens a right-side slide-out panel (never leaves the board):

```
┌──────────────────────────────────────────────┐
│ ← Back                          LD-4818      │
│                                              │
│ Global Parts Inc           Status: Active    │
│ Chicago, IL → Dallas, TX                     │
│ 920 mi • Dry Van • 22,000 lbs               │
│                                              │
│ ─── Driver & Vehicle ────────────────────    │
│ 🚛 Mike Thompson • Truck #204               │
│ Phone: (555) 123-4567                        │
│                                              │
│ ─── Stops ───────────────────────────────    │
│                                              │
│ 1. Pickup: ABC Warehouse, Chicago            │
│    Window: Feb 12, 6am–2pm • Dock: 3hrs     │
│                                              │
│ 2. Delivery: XYZ Depot, Dallas               │
│    Window: Feb 14, 6pm–8pm • Dock: 2hrs     │
│                                              │
│ ─── Details ─────────────────────────────    │
│ Customer: Global Parts Inc                   │
│ Weight: 22,000 lbs                           │
│ Commodity: General                           │
│ Equipment: Dry Van                           │
│ Special Requirements: Liftgate required      │
│                                              │
│ ─── Activity Log ────────────────────────    │
│ 8:15am  Departed Chicago                     │
│ 7:02am  Loading complete                     │
│ 6:02am  Arrived at pickup                    │
│ Yesterday  Driver assigned (you)             │
│ Yesterday  Load created from email           │
└──────────────────────────────────────────────┘
```

---

## Load Intake Methods

### 1. Manual Creation (Enhanced)

Current form enhanced with:
- **Google Places API** for address autocomplete on all address fields
- Streamlined stop entry with type-ahead for previously used locations
- Equipment type field (Dry Van, Reefer, Flatbed, Step Deck)

### 2. Copy / Duplicate Load

- "Copy" button on any existing load card or in detail panel
- Creates new load with same details, clears dates
- Dispatcher just updates dates and weight

### 3. Quick-Create Templates

- Save any load as a template ("Save as Template" option)
- Templates page accessible from Import dropdown or settings
- Click template → pre-fills form → dispatcher changes dates
- Useful for repeat lanes (60-70% of loads are repeat lanes)

### 4. Excel/CSV Import

- Drag-drop .xlsx or .csv file
- SALLY auto-detects columns (load #, origin, destination, weight, dates)
- Preview table → dispatcher reviews column mapping
- Fix mismatches → one click → all loads created as drafts
- **Save column mappings per customer** so next import is faster

### 5. Email-to-Load

- Each tenant gets a dedicated inbox: `loads@{tenant}.sally.app`
- Dispatcher forwards shipper email to this address
- AI (LLM) parses email → extracts origin, destination, weight, dates, customer
- Creates load as draft with source indicator "from email"
- Dispatcher reviews in Intake queue, confirms or edits
- **Implementation:** SendGrid Inbound Parse or AWS SES → LLM extraction → draft creation

### 6. DAT Load Board Search (Inbound Only)

- Search interface within SALLY for available DAT loads
- Filter by lane (origin → destination), equipment type, rate
- One-click import: DAT load → SALLY draft
- Rate intelligence: show lane averages to help dispatcher evaluate
- **Implementation:** DAT Power API integration

### 7. TMS Sync (Existing Pattern)

- Project44, McLeod, Samsara push loads via API/webhook
- Auto-creates as pending (or draft if configured for review)
- Existing external source protection applies (TMS loads are read-only)

---

## Intake Summary Table

| Method | Source Indicator | Initial Status | Effort |
|--------|-----------------|----------------|--------|
| Manual | ✋ Manual | Pending | Enhance existing |
| Copy/Template | ✋ Manual | Pending | Quick build |
| Excel import | 📊 Import | Draft | Medium build |
| Email forward | 📧 Email | Draft | Medium build |
| DAT search | 🔍 DAT | Draft | API integration |
| TMS sync | 🔗 TMS name | Pending or Draft | Existing pattern |

---

## Route Planning Integration

When dispatcher clicks [Plan Route →] on a load card:

1. Navigate to `/dispatcher/create-plan?load_id=LD-XXXX`
2. Route planning page detects `load_id` query param
3. Auto-fills: origin, destination, all stops, weight, equipment type, customer
4. Dispatcher selects: driver, vehicle
5. System auto-suggests best driver (closest, most HOS hours, right equipment)
6. Generate route → review on map → confirm
7. Load status updates to PLANNED
8. Dispatcher can activate from planning page or back on Loads board

---

## Schema Changes

### New Status: `draft`

Add `draft` to load status enum (before `pending`):

```
draft → pending → planned → active → in_transit → completed
                                                 → cancelled
```

### Equipment Type Field

Add to Load model:
```
equipment_type: enum (dry_van, reefer, flatbed, step_deck, other)
```

### Source Tracking Enhancement

Add to Load model:
```
intake_source: enum (manual, template, import, email, dat, tms_sync)
intake_metadata: jsonb (original email, import file name, DAT posting ID, etc.)
```

### Load Template Table (New)

```
LoadTemplate:
  template_id
  tenant_id
  template_name
  customer_name
  origin (address, city, state, lat, lng)
  destination (address, city, state, lat, lng)
  stops (jsonb — array of stop templates)
  weight_lbs
  commodity_type
  equipment_type
  special_requirements
  created_by
  usage_count
  last_used_at
```

### Column Mapping Table (New, for Excel import)

```
ImportMapping:
  mapping_id
  tenant_id
  mapping_name (e.g., "ABC Furniture weekly format")
  column_map (jsonb — maps file columns to SALLY fields)
  created_by
  last_used_at
```

---

## Implementation Phases

### Phase 1: Core Board & Manual Enhancement
- New /dispatcher/loads route with Kanban board
- Move loads out of Fleet tab
- Draft status support
- Enhanced manual creation with Google Places API
- Copy/Duplicate load
- Slide-out detail panel
- [Plan Route →] integration with /create-plan
- Quick stats strip

### Phase 2: Bulk Intake
- Excel/CSV import with column mapping
- Quick-create templates (save/use)
- Saved column mappings per customer

### Phase 3: Smart Intake
- Email-to-load (dedicated inbox + AI parsing)
- DAT inbound load board search
- Auto-suggestions for repeat lanes

---

## UX Principles

1. **Zero-click awareness** — dispatcher opens page and instantly knows state of everything
2. **Problems float up** — drafts needing review are always visible in first column
3. **Left-to-right flow** — loads naturally progress: Drafts → Ready to Plan → Planned → Active
4. **One review flow** — every intake source funnels into same draft → confirm pipeline
5. **Never leave the board** — detail panel slides out, planning opens in new page with context preserved
6. **Progressive detail** — cards show summary, panel shows full details
7. **Mobile responsive** — cards stack vertically on mobile, board scrolls horizontally on tablet

---

## Dependencies

- Google Places API key and integration
- Route Planning page (`/dispatcher/create-plan`) must accept `load_id` query param
- Email service (SendGrid or AWS SES) for email-to-load
- DAT Power API credentials for load board search
- LLM API access for email parsing

---

## Success Metrics

- Load creation time: < 60 seconds for manual, < 30 seconds for template/copy
- Email-to-load: < 5 seconds from forward to draft appearing
- Excel import: < 2 minutes for 20+ loads
- Dispatcher should never need to leave the Loads page to understand their workload
