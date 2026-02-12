# Loads Dispatch Board - Implementation Reference

**Status:** Implemented
**Domain:** Fleet Management > Loads > Dispatch Board UI
**Last Validated Against Code:** 2026-02-12
**Source Plans:** `_archive/2026-02-11-loads-dispatch-board-implementation.md`

---

## 1. Implementation Summary

The original plan outlined 12 implementation tasks. Here is the status of each:

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | Schema migration (draft status, equipment_type, intake_source, tracking_token) | Implemented | Fields exist in Prisma schema |
| 2 | Customer entity | Implemented | Full CRUD + invitation flow |
| 3 | LoadsService updates (duplicate, tracking token, draft support) | Implemented | All methods in loads.service.ts |
| 4 | Frontend types and API client | Implemented | types.ts and api.ts in features/fleet/loads/ |
| 5 | Navigation update (Loads as top-level dispatcher page) | Implemented | Route: /dispatcher/loads |
| 6 | Kanban board UI | Implemented | 4-column responsive grid |
| 7 | Slide-out detail panel | Implemented | Sheet component with status-aware actions |
| 8 | New load dialog with inline stop creation | Implemented | Dialog with customer selector and stop builder |
| 9 | Duplicate and tracking link actions | Implemented | Both available from detail panel |
| 10 | Route planning integration | Implemented | "Plan Route" navigates to /dispatcher/create-plan?load_id=X |
| 11 | Remove loads from Fleet page | Implemented | Loads page is separate from Fleet page |
| 12 | Completed/cancelled views | Implemented | Tab-based table views |

---

## 2. Schema Changes Applied

The following fields were added to the Load model as part of the dispatch board implementation:

```prisma
// Added to Load model:
equipmentType     String?           // dry_van, reefer, flatbed, step_deck
intakeSource      String  @default("manual")  // manual, portal, tms_sync, etc.
intakeMetadata    Json?             // JSON context about intake method
trackingToken     String? @unique   // Public tracking URL token
```

The `status` field already supported `draft` as a valid value in the validation logic.

**Not added (originally planned):**
- `LoadTemplate` model - Deferred
- `ImportMapping` model - Deferred

---

## 3. Backend Endpoints Added

### Loads Controller Additions

| Endpoint | Purpose | Validated |
|---|---|---|
| `POST /loads/:load_id/duplicate` | Duplicate a load with all stops | Yes - loads.controller.ts line 103 |
| `POST /loads/:load_id/tracking-token` | Generate tracking token | Yes - loads.controller.ts line 96 |

These were added to the existing `LoadsController` alongside the original CRUD endpoints.

### Customer Controller (New)

**File:** `apps/backend/src/domains/fleet/customers/controllers/customers.controller.ts`

| Endpoint | Method | Purpose |
|---|---|---|
| `POST /customers` | create | Create customer entity |
| `GET /customers` | list | List all customers with portal access status |
| `GET /customers/:customer_id` | get | Get single customer |
| `PUT /customers/:customer_id` | update | Update customer details |
| `POST /customers/:customer_id/invite` | inviteCustomer | Send portal invitation |

---

## 4. Frontend Components

### Page: `/dispatcher/loads/page.tsx`

**State management:**
```typescript
const [loads, setLoads] = useState<LoadListItem[]>([]);        // All loads
const [selectedLoad, setSelectedLoad] = useState<Load | null>(); // Detail panel
const [isDetailOpen, setIsDetailOpen] = useState(false);         // Sheet visibility
const [isNewLoadOpen, setIsNewLoadOpen] = useState(false);       // Dialog visibility
const [activeView, setActiveView] = useState<'loads' | 'customers'>('loads'); // Top toggle
```

**Load grouping (client-side):**
```typescript
const drafts = loads.filter((l) => l.status === 'draft');
const readyToPlan = loads.filter((l) => l.status === 'pending');
const planned = loads.filter((l) => l.status === 'planned');
const active = loads.filter((l) => ['active', 'in_transit'].includes(l.status));
const completed = loads.filter((l) => l.status === 'completed');
const cancelled = loads.filter((l) => l.status === 'cancelled');
```

**Key interactions:**
- `handleCardClick` -> Fetches full load (with stops) via `loadsApi.getById`, opens Sheet
- `handleStatusChange` -> Calls `loadsApi.updateStatus`, refreshes board
- `handleDuplicate` -> Calls `loadsApi.duplicate`, refreshes board
- `handleCopyTrackingLink` -> Calls `loadsApi.generateTrackingToken`, copies URL to clipboard
- `handlePlanRoute` -> Navigates to `/dispatcher/create-plan?load_id={loadId}`

### NewLoadForm Component

**Customer selection logic:**
1. On mount, fetches customer list via `customersApi.list()`
2. If customers exist: shows Select dropdown with customer names + "New customer" option
3. If no customers: shows plain text input for customer name
4. When customer selected from dropdown, auto-fills `customer_name` in form data
5. Customer ID is passed to create API if selected from dropdown

**Stop management:**
- Initialized with 2 stops (pickup + delivery)
- Stop IDs generated as `STOP-{timestamp-base36}`
- Minimum 2 stops enforced (remove button hidden when at 2)
- Each stop has: type selector, location name, dock hours, address/city/state
- Submit sends to `loadsApi.create()` then calls `onSuccess` callback

### Customer Management (Embedded)

**Create customer dialog:**
```typescript
const [newCustomerForm, setNewCustomerForm] = useState<CustomerCreate>({
  company_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
});
```

Validation before submit:
1. Company name required (non-empty)
2. Email format validated if provided
3. Phone format validated if provided

Uses `useMutation` from React Query for create, invalidates `['customers']` query on success.

---

## 5. Navigation Changes

The Loads page is now a standalone dispatcher route at `/dispatcher/loads`, separate from the Fleet page at `/dispatcher/fleet`. The Fleet page retains Drivers and Assets (vehicles) tabs only.

---

## 6. File Reference

| File | Purpose | Lines |
|---|---|---|
| `apps/web/src/app/dispatcher/loads/page.tsx` | Dispatch board page | ~1229 |
| `apps/web/src/features/fleet/loads/types.ts` | Load TypeScript interfaces | ~85 |
| `apps/web/src/features/fleet/loads/api.ts` | Load API client functions | - |
| `apps/web/src/features/fleet/customers/components/customer-list.tsx` | Customer list component | - |
| `apps/web/src/features/fleet/customers/components/invite-customer-dialog.tsx` | Customer invite dialog | - |
| `apps/web/src/features/fleet/customers/api.ts` | Customer API client | - |
| `apps/web/src/features/fleet/customers/types.ts` | Customer TypeScript interfaces | - |
| `apps/backend/src/domains/fleet/loads/controllers/loads.controller.ts` | Load API endpoints | ~113 |
| `apps/backend/src/domains/fleet/loads/services/loads.service.ts` | Load business logic | ~590 |
| `apps/backend/src/domains/fleet/customers/controllers/customers.controller.ts` | Customer API endpoints | - |
| `apps/backend/src/domains/fleet/customers/services/customers.service.ts` | Customer business logic | - |
