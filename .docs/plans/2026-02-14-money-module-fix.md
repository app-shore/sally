# Money Module Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all bugs, data contract mismatches (snake_case→camelCase), and UX issues (manual text inputs→selectors) in the Money Module so Billing and Pay pages work end-to-end.

**Architecture:** The backend (NestJS + Prisma) returns camelCase fields. The frontend types/components all reference snake_case fields, so nothing displays. We fix frontend types to match backend output, replace manual ID text inputs with system-populated selectors, and fix backend code that references nonexistent Driver fields (firstName/lastName → name).

**Tech Stack:** NestJS 11, Prisma 7.3, Next.js 15, React Query, Shadcn/ui, TypeScript

---

## Summary of All Issues

| # | Issue | Scope |
|---|-------|-------|
| 1 | Backend: settlements.service.ts references `driver.firstName`/`driver.lastName` but Driver model has `driver.name` | Backend |
| 2 | Backend: settlements.service.ts selects `firstName`/`lastName` in findAll/findOne but field is `name` | Backend |
| 3 | Backend: profitability.service.ts references `totalMiles` but RoutePlan field is `totalDistanceMiles` | Backend |
| 4 | Frontend: billing/types.ts all fields snake_case, backend returns camelCase | Frontend |
| 5 | Frontend: pay/types.ts all fields snake_case, driver has `first_name`/`last_name` but model has `name` | Frontend |
| 6 | Frontend: billing page.tsx uses manual Load ID text input | Frontend UX |
| 7 | Frontend: pay page.tsx uses manual Driver ID text input | Frontend UX |
| 8 | Frontend: all components reference snake_case fields | Frontend |

---

### Task 1: Fix Backend — settlements.service.ts Driver Name References

**Files:**
- Modify: `apps/backend/src/domains/financials/settlements/services/settlements.service.ts`

**Step 1: Fix driver name references in calculate method**

At line 95, change:
```typescript
// FROM:
driver_name: `${driver.firstName} ${driver.lastName}`,
// TO:
driver_name: driver.name,
```

At line 107, change:
```typescript
// FROM:
const settlementNumber = await this.generateSettlementNumber(tenantId, driver.lastName, periodStart);
// TO:
const lastName = driver.name.split(' ').pop() || driver.name;
const settlementNumber = await this.generateSettlementNumber(tenantId, lastName, periodStart);
```

**Step 2: Fix driver select fields in findAll (line 144) and findOne (line 159)**

Change both occurrences:
```typescript
// FROM:
driver: { select: { driverId: true, firstName: true, lastName: true } },
// TO:
driver: { select: { driverId: true, name: true } },
```

**Step 3: Verify TypeScript compiles**

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | grep -i "settlements.service" | head -20`
Expected: No errors from settlements.service.ts

**Step 4: Commit**

```bash
git add apps/backend/src/domains/financials/settlements/services/settlements.service.ts
git commit -m "fix(settlements): use driver.name instead of firstName/lastName"
```

---

### Task 2: Fix Backend — profitability.service.ts RoutePlan Field

**Files:**
- Modify: `apps/backend/src/domains/financials/invoicing/services/profitability.service.ts`

**Step 1: Check the RoutePlan model field name**

Run: `grep -A 5 "totalMiles\|totalDistanceMiles" apps/backend/prisma/schema.prisma`

This confirms the correct field name. If it's `totalDistanceMiles`, change both occurrences in profitability.service.ts (lines 32 and 67-68):

```typescript
// In calculateForLoad (line 32):
// FROM:
routePlanLoads: { include: { plan: { select: { totalMiles: true } } } },
// TO:
routePlanLoads: { include: { plan: { select: { totalDistanceMiles: true } } } },

// Line 42:
// FROM:
const routeMiles = load.routePlanLoads?.[0]?.plan?.totalMiles ?? 0;
// TO:
const routeMiles = load.routePlanLoads?.[0]?.plan?.totalDistanceMiles ?? 0;
```

Same pattern for `calculateForTenant` (lines 67-68 and 77).

**Step 2: Verify TypeScript compiles**

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | grep -i "profitability" | head -20`

**Step 3: Commit**

```bash
git add apps/backend/src/domains/financials/invoicing/services/profitability.service.ts
git commit -m "fix(profitability): use totalDistanceMiles from RoutePlan model"
```

---

### Task 3: Fix Frontend — Billing Types (snake_case → camelCase)

**Files:**
- Modify: `apps/web/src/features/financials/billing/types.ts`

**Step 1: Rewrite types.ts to use camelCase matching Prisma output**

Replace the entire file content with:

```typescript
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'VOID' | 'FACTORED';
export type LineItemType = 'LINEHAUL' | 'FUEL_SURCHARGE' | 'DETENTION_PICKUP' | 'DETENTION_DELIVERY' | 'LAYOVER' | 'LUMPER' | 'TONU' | 'ACCESSORIAL' | 'ADJUSTMENT';

export interface InvoiceLineItem {
  id: number;
  type: LineItemType;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  sequenceOrder: number;
}

export interface InvoicePayment {
  id: number;
  paymentId: string;
  amountCents: number;
  paymentMethod: string | null;
  referenceNumber: string | null;
  paymentDate: string;
  notes: string | null;
}

export interface Invoice {
  id: number;
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  customerId: number;
  customer: { companyName: string; billingEmail?: string };
  loadId: number;
  load: { loadNumber: string; loadId: string };
  subtotalCents: number;
  adjustmentCents: number;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  paymentTermsDays: number;
  notes: string | null;
  internalNotes: string | null;
  qbInvoiceId: string | null;
  qbSyncedAt: string | null;
  createdAt: string;
  lineItems: InvoiceLineItem[];
  payments?: InvoicePayment[];
}

export interface InvoiceSummary {
  outstanding_cents: number;
  overdue_cents: number;
  paid_this_month_cents: number;
  draft_count: number;
  aging: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_over_90: number;
  };
}
```

> **Note:** `InvoiceSummary` keeps snake_case because the backend `getSummary()` method returns a hand-built object with snake_case keys (not Prisma output). The billing API already sends snake_case query params which is correct.

**Step 2: Verify no TypeScript errors in types file**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -40`
Expected: Errors in components that still reference old snake_case fields (will fix in Tasks 5-6).

**Step 3: Commit**

```bash
git add apps/web/src/features/financials/billing/types.ts
git commit -m "fix(billing): convert types to camelCase matching Prisma output"
```

---

### Task 4: Fix Frontend — Pay Types (snake_case → camelCase)

**Files:**
- Modify: `apps/web/src/features/financials/pay/types.ts`

**Step 1: Rewrite types.ts to use camelCase matching Prisma output**

Replace the entire file content with:

```typescript
export type SettlementStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'VOID';
export type PayStructureType = 'PER_MILE' | 'PERCENTAGE' | 'FLAT_RATE' | 'HYBRID';
export type DeductionType = 'FUEL_ADVANCE' | 'CASH_ADVANCE' | 'INSURANCE' | 'EQUIPMENT_LEASE' | 'ESCROW' | 'OTHER';

export interface DriverPayStructure {
  id: number;
  driverId: number;
  type: PayStructureType;
  ratePerMileCents: number | null;
  percentage: number | null;
  flatRateCents: number | null;
  hybridBaseCents: number | null;
  hybridPercent: number | null;
  effectiveDate: string;
  notes: string | null;
}

export interface SettlementLineItem {
  id: number;
  loadId: number;
  load?: { loadNumber: string; loadId: string };
  description: string;
  miles: number | null;
  loadRevenueCents: number | null;
  payAmountCents: number;
  payStructureType: PayStructureType;
}

export interface SettlementDeduction {
  id: number;
  type: DeductionType;
  description: string;
  amountCents: number;
}

export interface Settlement {
  id: number;
  settlementId: string;
  settlementNumber: string;
  status: SettlementStatus;
  driverId: number;
  driver: { driverId: string; name: string };
  periodStart: string;
  periodEnd: string;
  grossPayCents: number;
  deductionsCents: number;
  netPayCents: number;
  notes: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  lineItems: SettlementLineItem[];
  deductions: SettlementDeduction[];
}

export interface SettlementSummary {
  pending_approval: number;
  ready_to_pay: number;
  paid_this_month_cents: number;
  active_drivers: number;
}
```

> **Note:** `Settlement.driver` now has `{ driverId: string; name: string }` matching the fixed backend select. `SettlementSummary` keeps snake_case (hand-built backend response).

**Step 2: Commit**

```bash
git add apps/web/src/features/financials/pay/types.ts
git commit -m "fix(pay): convert types to camelCase, fix driver name field"
```

---

### Task 5: Fix Frontend — Billing Page + Components (camelCase + Load Selector)

**Files:**
- Modify: `apps/web/src/app/dispatcher/billing/page.tsx`
- Modify: `apps/web/src/features/financials/billing/components/invoice-detail-dialog.tsx`
- Modify: `apps/web/src/features/financials/billing/components/record-payment-dialog.tsx`

**Step 1: Update billing/page.tsx — Replace Load ID text input with delivered-loads selector**

Replace the entire `Generate Invoice` dialog and related state/handler code. Key changes:

1. Add state for loads query and selected load:
```typescript
const [loadSearch, setLoadSearch] = useState("");
```

2. Add a query to fetch delivered loads without invoices. Use the existing loads API with status filter:
```typescript
import { apiClient } from '@/shared/lib/api';

// Inside the component:
const { data: deliveredLoads } = useQuery({
  queryKey: ['loads', 'delivered'],
  queryFn: () => apiClient<Array<{ loadId: string; loadNumber: string; customerName: string; rateCents: number | null }>>('/loads/?status=delivered&limit=100'),
  enabled: generateOpen,
});
```

3. Replace the `<Input>` for Load ID with a searchable list of delivered loads using Shadcn `Select` or a filterable list:
```tsx
<div className="space-y-2">
  <Label>Select Delivered Load</Label>
  <Select value={loadIdInput} onValueChange={setLoadIdInput}>
    <SelectTrigger>
      <SelectValue placeholder="Choose a delivered load..." />
    </SelectTrigger>
    <SelectContent>
      {deliveredLoads?.map((load) => (
        <SelectItem key={load.loadId} value={load.loadId}>
          {load.loadNumber} — {load.customerName}
          {load.rateCents ? ` ($${(load.rateCents / 100).toFixed(2)})` : ''}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

4. Fix all snake_case field references in the table rows:
   - `invoice.invoice_id` → `invoice.invoiceId`
   - `invoice.invoice_number` → `invoice.invoiceNumber`
   - `invoice.customer?.company_name` → `invoice.customer?.companyName`
   - `invoice.load?.load_number` → `invoice.load?.loadNumber`
   - `invoice.total_cents` → `invoice.totalCents`
   - `invoice.balance_cents` → `invoice.balanceCents`
   - `invoice.due_date` → `invoice.dueDate`

**Step 2: Update invoice-detail-dialog.tsx — Fix all snake_case references**

All field references must be updated:
- `invoice.invoice_number` → `invoice.invoiceNumber`
- `invoice.customer?.company_name` → `invoice.customer?.companyName`
- `invoice.load?.load_number` → `invoice.load?.loadNumber`
- `invoice.issue_date` → `invoice.issueDate`
- `invoice.due_date` → `invoice.dueDate`
- `invoice.payment_terms_days` → `invoice.paymentTermsDays`
- `invoice.line_items` → `invoice.lineItems`
- `item.unit_price_cents` → `item.unitPriceCents`
- `item.total_cents` → `item.totalCents`
- `invoice.subtotal_cents` → `invoice.subtotalCents`
- `invoice.adjustment_cents` → `invoice.adjustmentCents`
- `invoice.total_cents` → `invoice.totalCents`
- `invoice.paid_cents` → `invoice.paidCents`
- `invoice.balance_cents` → `invoice.balanceCents`
- `payment.payment_id` → `payment.paymentId`
- `payment.payment_date` → `payment.paymentDate`
- `payment.payment_method` → `payment.paymentMethod`
- `payment.reference_number` → `payment.referenceNumber`
- `payment.amount_cents` → `payment.amountCents`
- `invoice.invoice_id` → `invoice.invoiceId`
- `invoice.invoice_number` in void confirm → `invoice.invoiceNumber`

**Step 3: Update record-payment-dialog.tsx**

The component props use `balanceCents` which is already camelCase. The API request body keys (`amount_cents`, `payment_method`, etc.) stay snake_case as they are request parameters, not response fields. No changes needed except verifying it compiles with the updated Invoice type.

**Step 4: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -i "billing\|invoice" | head -30`
Expected: No errors in billing files.

**Step 5: Commit**

```bash
git add apps/web/src/app/dispatcher/billing/page.tsx \
       apps/web/src/features/financials/billing/components/invoice-detail-dialog.tsx \
       apps/web/src/features/financials/billing/components/record-payment-dialog.tsx
git commit -m "fix(billing): camelCase fields, replace Load ID input with selector"
```

---

### Task 6: Fix Frontend — Pay Page + Components (camelCase + Driver Selector)

**Files:**
- Modify: `apps/web/src/app/dispatcher/pay/page.tsx`
- Modify: `apps/web/src/features/financials/pay/components/settlement-detail-dialog.tsx`
- Modify: `apps/web/src/features/financials/pay/components/pay-structure-dialog.tsx`

**Step 1: Update pay/page.tsx — Replace Driver ID text input with driver selector**

1. Add a query to fetch active drivers:
```typescript
import { apiClient } from '@/shared/lib/api';

// Inside the component:
const { data: drivers } = useQuery({
  queryKey: ['drivers'],
  queryFn: () => apiClient<Array<{ driver_id: string; name: string; is_active: boolean }>>('/drivers/'),
  enabled: calcOpen,
});
```

> **Note:** The drivers API returns snake_case because the controller manually builds the response object with snake_case keys. This is intentional — we use the driver_id from the API response directly.

2. Replace the Driver ID `<Input>` with a `<Select>`:
```tsx
<div className="space-y-2">
  <Label>Driver</Label>
  <Select value={driverIdInput} onValueChange={setDriverIdInput}>
    <SelectTrigger>
      <SelectValue placeholder="Select a driver..." />
    </SelectTrigger>
    <SelectContent>
      {drivers?.filter(d => d.is_active).map((driver) => (
        <SelectItem key={driver.driver_id} value={driver.driver_id}>
          {driver.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

3. Default period dates to current week (Mon-Sun):
```typescript
// Initialize period to current week
const getMonday = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
};
const getSunday = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
};

const [periodStart, setPeriodStart] = useState(getMonday());
const [periodEnd, setPeriodEnd] = useState(getSunday());
```

4. Fix all snake_case field references in the settlements table:
   - `s.settlement_id` → `s.settlementId`
   - `s.settlement_number` → `s.settlementNumber`
   - `s.driver?.first_name` / `s.driver?.last_name` → `s.driver?.name`
   - `s.period_start` → `s.periodStart`
   - `s.period_end` → `s.periodEnd`
   - `s.gross_pay_cents` → `s.grossPayCents`
   - `s.deductions_cents` → `s.deductionsCents`
   - `s.net_pay_cents` → `s.netPayCents`

**Step 2: Update settlement-detail-dialog.tsx — Fix all snake_case references**

All field references must be updated:
- `settlement.settlement_number` → `settlement.settlementNumber`
- `settlement.driver?.first_name` / `last_name` → `settlement.driver?.name`
- `settlement.period_start` → `settlement.periodStart`
- `settlement.period_end` → `settlement.periodEnd`
- `settlement.line_items` → `settlement.lineItems`
- `item.load?.load_number` → `item.load?.loadNumber`
- `item.load_id` → `item.loadId`
- `item.load_revenue_cents` → `item.loadRevenueCents`
- `item.pay_amount_cents` → `item.payAmountCents`
- `settlement.deductions_cents` → `settlement.deductionsCents` (in display)
- `d.amount_cents` → `d.amountCents`
- `settlement.gross_pay_cents` → `settlement.grossPayCents`
- `settlement.net_pay_cents` → `settlement.netPayCents`
- `settlement.settlement_id` → `settlement.settlementId`

**Step 3: Update pay-structure-dialog.tsx — Fix snake_case references**

Change field access on the `existing` pay structure:
- `existing.rate_per_mile_cents` → `existing.ratePerMileCents`
- `existing.percentage` → `existing.percentage` (already correct)
- `existing.flat_rate_cents` → `existing.flatRateCents`
- `existing.hybrid_base_cents` → `existing.hybridBaseCents`
- `existing.hybrid_percent` → `existing.hybridPercent`
- `existing.effective_date` → `existing.effectiveDate`
- `existing.notes` → `existing.notes` (already correct)

> **Note:** The `upsert` mutation sends snake_case request body keys (`rate_per_mile_cents`, `effective_date`, etc.) to the backend. These stay as-is because they are API request parameters matching the DTO.

**Step 4: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -i "pay\|settlement" | head -30`
Expected: No errors in pay files.

**Step 5: Commit**

```bash
git add apps/web/src/app/dispatcher/pay/page.tsx \
       apps/web/src/features/financials/pay/components/settlement-detail-dialog.tsx \
       apps/web/src/features/financials/pay/components/pay-structure-dialog.tsx
git commit -m "fix(pay): camelCase fields, replace Driver ID input with selector, default period to current week"
```

---

### Task 7: Full TypeScript Compilation Check

**Files:** None (verification only)

**Step 1: Run full backend TypeScript check**

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | tail -20`
Expected: No errors (or only pre-existing warnings unrelated to money module).

**Step 2: Run full frontend TypeScript check**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | tail -20`
Expected: No errors in billing or pay features.

**Step 3: Commit any remaining fixes if needed**

---

### Task 8: Manual Smoke Test

**Step 1: Start the backend**

Run: `cd apps/backend && pnpm dev`

**Step 2: Start the frontend**

Run: `cd apps/web && pnpm dev`

**Step 3: Test Billing page**

1. Navigate to `/dispatcher/billing`
2. Verify summary cards show numbers (not blank/undefined)
3. Click "Generate Invoice" — verify dropdown shows delivered loads (not a text input)
4. Click an invoice row — verify detail dialog shows all fields correctly
5. Verify line items table displays properly with amounts

**Step 4: Test Pay page**

1. Navigate to `/dispatcher/pay`
2. Verify summary cards show numbers
3. Click "Calculate Settlement" — verify driver dropdown shows drivers (not a text input)
4. Verify period dates default to current week
5. Click a settlement row — verify detail dialog shows driver name (not "undefined undefined")
6. Verify deductions section works

---

## File Change Summary

| File | Change |
|------|--------|
| `apps/backend/.../settlements.service.ts` | `firstName`/`lastName` → `name`, fix select fields |
| `apps/backend/.../profitability.service.ts` | `totalMiles` → `totalDistanceMiles` (if confirmed) |
| `apps/web/.../billing/types.ts` | All fields snake_case → camelCase |
| `apps/web/.../pay/types.ts` | All fields snake_case → camelCase, driver `first_name`/`last_name` → `name` |
| `apps/web/.../billing/page.tsx` | camelCase fields, Load ID input → delivered loads selector |
| `apps/web/.../invoice-detail-dialog.tsx` | All snake_case → camelCase |
| `apps/web/.../record-payment-dialog.tsx` | Verify compiles (props already camelCase) |
| `apps/web/.../pay/page.tsx` | camelCase fields, Driver ID input → driver selector, default period |
| `apps/web/.../settlement-detail-dialog.tsx` | All snake_case → camelCase, driver name fix |
| `apps/web/.../pay-structure-dialog.tsx` | `existing.*` snake_case → camelCase |
