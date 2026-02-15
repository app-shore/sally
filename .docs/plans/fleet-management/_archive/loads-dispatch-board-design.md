# Loads Dispatch Board - Design Specification

**Status:** Implemented
**Domain:** Fleet Management > Loads > Dispatch Board UI
**Last Validated Against Code:** 2026-02-12
**Source Plans:** `_archive/2026-02-11-loads-dispatch-board-design.md`

---

## Current State

| Capability | Status |
|---|---|
| 4-column Kanban board (Drafts, Ready to Plan, Planned, Active) | Implemented |
| Load cards with customer, stops, weight, equipment, source | Implemented |
| Slide-out detail panel (Sheet) | Implemented |
| New load dialog with inline stop creation | Implemented |
| Customer selector with "New customer" option | Implemented |
| Status transitions from detail panel | Implemented |
| Load duplication | Implemented |
| Tracking link generation and copy | Implemented |
| "Plan Route" action on pending loads | Implemented |
| Completed/Cancelled table views | Implemented |
| Top-level Loads/Customers toggle | Implemented |
| Customer list + create + invite from Loads page | Implemented |
| Import dropdown (CSV, Email, DAT) | UI Only (disabled, marked Phase 2) |
| Stat pills (Drafts, Ready, Planned, Active, Total) | Implemented |
| Refresh button | Implemented |
| Equipment type display | Implemented |
| Intake source badge | Implemented |

---

## 1. Purpose

The Dispatch Board is the primary load management interface for dispatchers. It provides a Kanban-style board showing loads organized by lifecycle status, with actions to create, edit, plan, duplicate, and track loads. The same page also provides a customer management tab.

---

## 2. Page Structure

**Route:** `/dispatcher/loads`
**File:** `apps/web/src/app/dispatcher/loads/page.tsx`

### Top-Level Layout

```
+-------------------------------------------------------------+
| Loads                         [Import v] [+ New Load]       |
| Manage freight loads...                                      |
+-------------------------------------------------------------+
| [Loads] [Customers]     Drafts: 3  Ready: 5  ...  [Refresh] |
+-------------------------------------------------------------+
| [Active Board] [Completed (12)] [Cancelled (2)]             |
+-------------------------------------------------------------+
| Drafts     | Ready to Plan | Planned    | Active            |
| (cards)    | (cards)       | (cards)    | (cards)            |
+-------------------------------------------------------------+
```

### View Hierarchy

1. **Top-level toggle:** Loads | Customers (Tabs component)
2. **Loads view:** Contains sub-tabs for Active Board, Completed, Cancelled
3. **Active Board:** 4-column Kanban grid
4. **Completed/Cancelled:** Table views

---

## 3. Kanban Columns (Validated)

| Column | Title | Status Filter | Action |
|---|---|---|---|
| 1 | Drafts | `status === 'draft'` | Click to view detail |
| 2 | Ready to Plan | `status === 'pending'` | "Plan Route" button |
| 3 | Planned | `status === 'planned'` | Click to view detail |
| 4 | Active | `status in ['active', 'in_transit']` | Click to view detail |

Each column shows a badge with the count and scrollable card list.

### Load Card Content

Each card displays:
- Load number (monospace font)
- Intake source badge (Manual, Template, Import, Email, DAT, TMS)
- Customer name
- Stop count and weight
- Equipment type (if set)
- Optional "Plan Route" action button (on Ready to Plan column only)

---

## 4. Detail Slide-Out Panel

Clicking a load card opens a Sheet (slide-out from right) showing:

**Load info grid:**
- Customer, Weight, Commodity, Equipment, Intake source, Stop count
- Special requirements (if present)

**Stops timeline:**
- Numbered circles with pickup (blue) / delivery (green) color coding
- Stop name, city/state, dock hours, arrival window

**Status-aware actions:**
- `draft` -> "Confirm Load" (transitions to pending)
- `pending` -> "Plan Route" (navigates to route planner)
- `planned` -> "Activate" (transitions to active)
- `active` / `in_transit` -> "Copy Tracking Link" + "Mark Completed"
- Always available: "Duplicate" + "Cancel" (except completed/cancelled)

---

## 5. New Load Dialog

**Trigger:** "+ New Load" button in top bar

**Form fields:**
- Load Number (required, text)
- Customer (Select from existing customers, or "New customer" freetext)
- Weight in lbs (required, number)
- Commodity type (Select: General, Hazmat, Refrigerated, Fragile)
- Equipment type (Select: Dry Van, Reefer, Flatbed, Step Deck)
- Special requirements (optional text)

**Stops section:**
- Minimum 2 stops (cannot remove below 2)
- Each stop: Type (pickup/delivery/both), Location Name, Dock Hours, Address, City, State
- "+ Add Stop" button to add more
- Remove button (trash icon) on stops beyond minimum 2
- Stops auto-numbered with color-coded circles

**On submit:** Calls `loadsApi.create(data)` then refreshes the board.

---

## 6. Customer Management (Embedded Tab)

The Loads page has a top-level toggle between "Loads" and "Customers":

**Customers tab shows:**
- `CustomerList` component (from `features/fleet/customers/components/customer-list.tsx`)
- "Add Customer" button opening `Dialog` with form fields: Company Name, Contact Name, Email, Phone
- "Invite" action per customer (opens `InviteCustomerDialog`)
- Client-side validation: email format, phone format, company name required

---

## 7. Import Dropdown (Phase 2 Placeholder)

The Import dropdown button exists in the UI but all options are disabled:
- CSV/Excel Import (Phase 2)
- Email-to-Load (Phase 2)
- DAT Search (Phase 2)

This provides a visual anchor for the planned intake methods without misleading users about current capabilities.

---

## 8. Key UI Components

| Component | File | Status |
|---|---|---|
| `LoadsPage` (main) | `apps/web/src/app/dispatcher/loads/page.tsx` | Implemented |
| `KanbanColumn` | Same file (inline component) | Implemented |
| `LoadCard` | Same file (inline component) | Implemented |
| `LoadDetailPanel` | Same file (inline component) | Implemented |
| `NewLoadForm` | Same file (inline component) | Implemented |
| `LoadsTable` | Same file (inline component) | Implemented |
| `IntakeSourceBadge` | Same file (inline component) | Implemented |
| `StatPill` | Same file (inline component) | Implemented |
| `CustomerList` | `apps/web/src/features/fleet/customers/components/customer-list.tsx` | Implemented |
| `InviteCustomerDialog` | `apps/web/src/features/fleet/customers/components/invite-customer-dialog.tsx` | Implemented |

---

## 9. Responsive Design

The Kanban board uses a responsive grid:
- Mobile (< md): `grid-cols-1` - stacked columns
- Tablet (md): `grid-cols-2` - 2x2 grid
- Desktop (lg+): `grid-cols-4` - all 4 columns side by side

The detail Sheet is full-width on mobile (`w-full`) and constrained on desktop (`sm:max-w-lg`).

---

## 10. Design Decisions

1. **All components in one file:** The dispatch board page contains all its components inline (~1200 lines). This was a deliberate choice for cohesion - all Kanban-related components stay together.
2. **Loads + Customers on same page:** Rather than separate routes, the customer management is a tab on the Loads page, reflecting the dispatcher workflow where loads and customers are managed together.
3. **Sheet for detail panel:** Uses Shadcn Sheet (slide-out) rather than a modal or separate page, allowing the dispatcher to see the board context while reviewing a load.
4. **Status-aware actions:** The detail panel dynamically shows different action buttons based on the load's current status, guiding the dispatcher through the lifecycle.
5. **Import dropdown disabled:** Phase 2 features are visible but disabled, communicating the product roadmap without creating confusion.
