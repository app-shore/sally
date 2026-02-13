# Implementation Plan: Load Creation UX Improvements

**Date:** February 12, 2026
**Based on:** `.docs/plans/2026-02-12-load-creation-ux-review.md`
**Scope:** Phase 1 improvements - high impact, moderate effort
**Dialog Tier:** Stays Tier 2 (`max-w-2xl`) — more fields but progressive disclosure keeps it manageable

---

## Overview

Upgrade the load creation form from a technical prototype to a dispatcher-grade tool. Three pillars:

1. **Auto-generate load number** — remove friction from the #1 action
2. **Add missing operational fields** — reference number, appointment windows, ZIP code
3. **Progressive disclosure** — core fields always visible, details collapsed by default
4. **UX polish** — better commodity list, state dropdown, visual hierarchy

---

## Step 1: Schema Migration — Add New Fields to Load Model

**Files to modify:**
- `apps/backend/prisma/schema.prisma` (Load model, lines 630-681)

**Add these fields to the Load model (after `specialRequirements`, before `isActive`):**

```prisma
  // Customer reference / PO number
  referenceNumber       String?      @map("reference_number") @db.VarChar(100)

  // Rate / revenue for this load
  rateCents             Int?         @map("rate_cents")

  // Pieces / pallets count
  pieces                Int?
```

**Why `rateCents` as Int?** Store money as cents to avoid floating-point precision issues. $2,450.00 → 245000. Frontend converts for display.

**Add `zipCode` field to the `CreateLoadStopDto` inline stop creation flow** — the Stop model already has `zipCode` in schema (line ~580). We just need to pass it through.

**Migration command:** `npx prisma migrate dev --name add-load-reference-rate-pieces`

**Estimated changes:** ~10 lines in schema, 1 migration file auto-generated

---

## Step 2: Backend — Auto-Generate Load Number + Accept New Fields

### 2a: Auto-generate load number in LoadsService.create()

**File:** `apps/backend/src/domains/fleet/loads/services/loads.service.ts` (lines 15-58)

**Current logic (line 40):**
```ts
const loadId = `LOAD-${data.load_number}`;
```

**New logic:** Generate load number from a tenant-scoped sequence:

```ts
// Generate load number: LD-YYYYMMDD-NNN (where NNN = daily sequence for tenant)
const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const countToday = await this.prisma.load.count({
  where: {
    tenantId: data.tenant_id,
    createdAt: {
      gte: new Date(new Date().setHours(0, 0, 0, 0)),
    },
  },
});
const seq = String(countToday + 1).padStart(3, '0');
const loadNumber = `LD-${today}-${seq}`;
const loadId = `LOAD-${loadNumber}`;
```

**Make `load_number` optional in the DTO** — if provided (e.g., from import/TMS sync), use it. If not, auto-generate.

### 2b: Update CreateLoadDto

**File:** `apps/backend/src/domains/fleet/loads/dto/create-load.dto.ts`

**Changes:**
- Make `load_number` optional (add `@IsOptional()`)
- Add `reference_number?: string` (optional)
- Add `rate_cents?: number` (optional)
- Add `pieces?: number` (optional)

### 2c: Update CreateLoadStopDto

**File:** `apps/backend/src/domains/fleet/loads/dto/create-load-stop.dto.ts`

**Changes:**
- Add `zip_code?: string` (optional, passed through to Stop creation)

### 2d: Update LoadsService.create() to handle new fields

**File:** `apps/backend/src/domains/fleet/loads/services/loads.service.ts`

- Pass `referenceNumber`, `rateCents`, `pieces` to `prisma.load.create()`
- Pass `zipCode` to inline `prisma.stop.create()` (line 69-81)

### 2e: Update formatLoadResponse to include new fields

Same file — ensure new fields appear in the API response.

**Estimated changes:** ~40 lines across 3 files

---

## Step 3: Frontend Types — Add New Fields

**File:** `apps/web/src/features/fleet/loads/types.ts`

### Update `LoadCreate` interface (lines 74-85):

```ts
export interface LoadCreate {
  load_number?: string;          // Now optional (auto-generated)
  weight_lbs: number;
  commodity_type: string;
  equipment_type?: string;
  special_requirements?: string;
  customer_name: string;
  customer_id?: number;
  intake_source?: string;
  status?: string;
  reference_number?: string;     // NEW
  rate_cents?: number;           // NEW
  pieces?: number;               // NEW
  stops: LoadStopCreate[];
}
```

### Update `LoadStopCreate` interface (lines 61-72):

```ts
export interface LoadStopCreate {
  stop_id: string;
  sequence_order: number;
  action_type: "pickup" | "delivery" | "both";
  earliest_arrival?: string;
  latest_arrival?: string;
  estimated_dock_hours: number;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;            // NEW
}
```

### Update `Load` interface (lines 22-43):

Add `reference_number?: string`, `rate_cents?: number`, `pieces?: number`.

### Update `LoadListItem` interface (lines 45-59):

Add `reference_number?: string` (useful for kanban card display).

**Estimated changes:** ~10 lines

---

## Step 4: Install shadcn Calendar Component

**Needed for:** Appointment window date-time pickers in stops.

```bash
cd apps/web && npx shadcn@latest add calendar
```

This installs `calendar.tsx` into `src/shared/components/ui/` and adds the `react-day-picker` dependency. We already have `popover.tsx` for the date picker wrapper.

**Note:** We'll build a simple `DateTimePicker` composite component using Calendar + Popover + time input, rather than installing a heavy third-party date-time picker. For MVP, the appointment windows are just time-of-day strings (e.g., "08:00", "17:00") — the schema stores them as VarChar(10). So we actually just need simple time inputs, not full date-time pickers. Even simpler.

**Revised approach:** Use plain `<Input type="time" />` for appointment windows. No calendar needed for this step. The appointment window is a time-of-day constraint (e.g., "dock open 06:00-14:00"), not a calendar date.

**Estimated changes:** 0 new components needed

---

## Step 5: Rewrite NewLoadForm with Progressive Disclosure

**File:** `apps/web/src/app/dispatcher/loads/page.tsx` (lines 851-1205)

This is the biggest change. The form gets restructured into three visual sections with progressive disclosure.

### New Form Layout

```
┌─────────────────────────────────────────────┐
│ Create Load                                  │
├─────────────────────────────────────────────┤
│                                              │
│ SECTION 1: CORE DETAILS (always visible)     │
│ ┌─────────────────┬────────────────────────┐ │
│ │ Customer *      │ Equipment Type *       │ │
│ ├─────────────────┼────────────────────────┤ │
│ │ Weight (lbs) *  │ Reference / PO #       │ │
│ └─────────────────┴────────────────────────┘ │
│                                              │
│ SECTION 2: STOPS (always visible)            │
│ ┌───────────────────────────────────────────┐│
│ │ ● Stop 1 — Pickup                        ││
│ │   Location Name *    Appt: [08:00]-[14:00]│|
│ │   Address    City    State    ZIP         ││
│ │   Dock Hours: [2.0]                       ││
│ ├───────────────────────────────────────────┤│
│ │ ● Stop 2 — Delivery                      ││
│ │   Location Name *    Appt: [--:--]-[--:--]││
│ │   Address    City    State    ZIP         ││
│ │   Dock Hours: [2.0]                       ││
│ └───────────────────────────────────────────┘│
│ [+ Add Stop]                                 │
│                                              │
│ ▸ More Details  (collapsed by default)       │
│ ┌───────────────────────────────────────────┐│
│ │ Commodity   │ Rate ($)   │ Pieces/Pallets ││
│ │ Special Requirements                      ││
│ └───────────────────────────────────────────┘│
│                                              │
│                     [Cancel]  [Create Load]  │
└─────────────────────────────────────────────┘
```

### Form State Changes

```ts
const [formData, setFormData] = useState({
  customer_name: '',
  weight_lbs: 0,
  equipment_type: 'dry_van',     // Default to most common
  reference_number: '',           // NEW
  commodity_type: 'general',
  special_requirements: '',
  rate_cents: undefined as number | undefined,  // NEW
  pieces: undefined as number | undefined,      // NEW
});
// Note: load_number removed from form state (auto-generated)
```

### Stop State Changes

```ts
const [stops, setStops] = useState<LoadStopCreate[]>([
  {
    stop_id: `STOP-${Date.now().toString(36)}`,
    sequence_order: 1,
    action_type: 'pickup',
    estimated_dock_hours: 2,
    earliest_arrival: '',         // NEW - exposed in UI
    latest_arrival: '',           // NEW - exposed in UI
    name: '',
    city: '',
    state: '',
    zip_code: '',                 // NEW
  },
  {
    stop_id: `STOP-${(Date.now() + 1).toString(36)}`,
    sequence_order: 2,
    action_type: 'delivery',
    estimated_dock_hours: 2,
    earliest_arrival: '',
    latest_arrival: '',
    name: '',
    city: '',
    state: '',
    zip_code: '',
  },
]);
```

### Progressive Disclosure

Use the existing `Collapsible` component from `@/shared/components/ui/collapsible`:

```tsx
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/shared/components/ui/collapsible';

<Collapsible>
  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
    <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
    More Details
  </CollapsibleTrigger>
  <CollapsibleContent className="space-y-4 pt-3">
    {/* Commodity, Rate, Pieces, Special Requirements */}
  </CollapsibleContent>
</Collapsible>
```

### Core Details Section (always visible)

**Row 1:** Customer (select/new) + Equipment Type (select, default "Dry Van")
**Row 2:** Weight (lbs) + Reference/PO Number

The Customer field stays as-is (dropdown with "New customer" option). Equipment type gets a default value of `dry_van` since it's the most common.

### Stops Section (always visible)

Each stop card gets:
- **Row 1:** Type (select) + Location Name (text) — same as current
- **Row 2:** Appointment window — `Earliest [time input]` — `Latest [time input]`
  - Uses `<Input type="time" />` for simple time-of-day entry
  - Label: "Appointment Window" with "(optional)" hint
- **Row 3:** Address + City + State (select dropdown for US states) + ZIP
- **Row 4:** Dock Hours (number)

**State dropdown:** Replace free-text state input with a Select of US state abbreviations. This prevents typos and enables consistent data.

```tsx
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];
```

### More Details Section (collapsed)

- **Row 1:** Commodity (select, expanded list) + Rate (currency input) + Pieces/Pallets (number)
- **Row 2:** Special Requirements (text input)

**Updated commodity list:**
```
general, dry_goods, refrigerated, frozen, hazmat, fragile, oversized, other
```

### Rate Input

Display as dollars, store as cents:

```tsx
<div>
  <Label className="text-xs">Rate ($)</Label>
  <Input
    className="h-8 text-xs"
    type="number"
    step="0.01"
    placeholder="0.00"
    value={formData.rate_cents ? (formData.rate_cents / 100).toFixed(2) : ''}
    onChange={(e) => {
      const dollars = parseFloat(e.target.value);
      setFormData({
        ...formData,
        rate_cents: isNaN(dollars) ? undefined : Math.round(dollars * 100),
      });
    }}
  />
</div>
```

### Submit Handler Changes

```ts
const loadData: LoadCreate = {
  // load_number removed — backend auto-generates
  customer_name: formData.customer_name,
  weight_lbs: formData.weight_lbs,
  commodity_type: formData.commodity_type,
  equipment_type: formData.equipment_type || undefined,
  special_requirements: formData.special_requirements || undefined,
  reference_number: formData.reference_number || undefined,
  rate_cents: formData.rate_cents || undefined,
  pieces: formData.pieces || undefined,
  customer_id: selectedCustomerId && selectedCustomerId !== 'new'
    ? parseInt(selectedCustomerId) : undefined,
  stops: stops.map(s => ({
    ...s,
    earliest_arrival: s.earliest_arrival || undefined,
    latest_arrival: s.latest_arrival || undefined,
    zip_code: s.zip_code || undefined,
  })),
};
```

**Estimated changes:** ~200 lines rewritten in the form component

---

## Step 6: Update Kanban Card & Detail Panel

**File:** `apps/web/src/app/dispatcher/loads/page.tsx`

### Kanban Card Updates

Show reference number on the card (if present) — helps dispatchers quickly identify loads:

```tsx
{/* Inside kanban card, after customer name */}
{load.reference_number && (
  <span className="text-xs text-muted-foreground font-mono">
    Ref: {load.reference_number}
  </span>
)}
```

### Detail Panel Updates

In the Sheet detail view, add:
- Reference/PO number display
- Rate display (formatted as currency)
- Pieces count
- Appointment windows per stop (already partially rendered via time windows)

**Estimated changes:** ~30 lines

---

## Step 7: Update Load List Backend Response

**File:** `apps/backend/src/domains/fleet/loads/services/loads.service.ts`

In `findAll()` and `formatLoadResponse()`, ensure new fields (`referenceNumber`, `rateCents`, `pieces`) are included in responses.

**Estimated changes:** ~10 lines

---

## Implementation Order (dependency-aware)

```
Step 1: Schema migration (backend)
  ↓
Step 2: Backend DTO + service changes (backend)
  ↓
Step 3: Frontend types (frontend)
  ↓
Step 5: Rewrite NewLoadForm (frontend) ← biggest step
  ↓
Step 6: Update kanban card + detail panel (frontend)
  ↓
Step 7: Update backend list response (backend)
```

Steps 1-2 must be sequential (migration → code).
Steps 3, 5, 6 are frontend-only and Step 5 depends on Step 3.
Step 7 is independent of frontend work.

---

## Files Changed Summary

| File | Change Type | Lines (est.) |
|------|------------|--------------|
| `apps/backend/prisma/schema.prisma` | Edit (Load model) | +5 |
| `apps/backend/prisma/migrations/...` | New (auto-generated) | auto |
| `apps/backend/src/domains/fleet/loads/dto/create-load.dto.ts` | Edit | +15 |
| `apps/backend/src/domains/fleet/loads/dto/create-load-stop.dto.ts` | Edit | +5 |
| `apps/backend/src/domains/fleet/loads/services/loads.service.ts` | Edit | +25 |
| `apps/web/src/features/fleet/loads/types.ts` | Edit | +8 |
| `apps/web/src/app/dispatcher/loads/page.tsx` | Rewrite (form section) | ~200 |

**Total:** ~7 files changed, ~260 lines modified

---

## What This Does NOT Include (Explicitly Deferred)

- **Date picker for pickup/delivery dates** — Using time-of-day appointment windows instead (matches how the industry works: "dock open 06:00-14:00")
- **Address autocomplete** — Requires Google Places API key and billing. Phase 3.
- **Template loads** — Phase 3.
- **Conditional fields** (temp range for reefer, hazmat details) — Phase 2. The commodity and equipment type are captured; details can be added later.
- **Smart defaults** (remember last equipment type) — Phase 3.
- **Miles estimate** — Would need geocoding. Phase 3.
- **Calendar component installation** — Not needed since appointment windows are time-of-day only.

---

## Testing Checklist

- [ ] Create load without load_number → backend auto-generates
- [ ] Create load with reference number → persists and displays
- [ ] Create load with rate → stores as cents, displays as dollars
- [ ] Create load with appointment windows on stops → persists correctly
- [ ] Create load with ZIP code on stops → persists to Stop record
- [ ] State dropdown shows all 50 US states
- [ ] "More Details" section collapses/expands correctly
- [ ] Equipment type defaults to "Dry Van"
- [ ] Kanban card shows reference number when present
- [ ] Detail panel shows all new fields
- [ ] Form works on mobile (375px), tablet (768px), desktop (1440px)
- [ ] Dark mode: all new elements use semantic tokens
- [ ] Existing load creation still works (backward compatibility)
