# Money Module Design: Billing & Pay

> **Status:** Approved | **Created:** 2026-02-13 | **Domain:** Financials
> **Nav Label:** Money > Billing | Pay
> **Depends on:** Fleet (drivers, vehicles, loads, customers), Route Planning (miles, route data)

---

## Executive Summary

The Money module adds **Billing** (invoicing customers for delivered loads) and **Pay** (calculating and managing driver settlements) to SALLY. Combined with the existing fleet and load management capabilities, this transforms SALLY from "dispatch software with route intelligence" into a **full minimum viable TMS**.

**Why this matters:**
- Without billing: carriers can't invoice customers — SALLY is incomplete
- Without pay: carriers can't pay drivers — deal breaker
- QuickBooks integration: non-negotiable for 80%+ of small carriers (20-100 trucks)
- Load profitability: the killer insight that no small-carrier TMS offers today

**Scope:**
- Invoice generation from delivered loads (auto + manual)
- AR tracking (outstanding, overdue, aging)
- Driver pay structure management (per-mile, percentage, flat rate, hybrid)
- Settlement calculation with deductions
- QuickBooks Online integration (invoices + settlements)
- Load profitability computation
- Factoring hooks (schema ready, integration deferred)

---

## Architecture: Unified Financial Module

Single `financials` domain containing both billing and pay, sharing common infrastructure.

```
Backend:
  financials/
  ├── invoicing/      # Invoice CRUD, generation, AR tracking
  ├── settlements/    # Pay structure, settlement calc, deductions
  ├── payments/       # Payment recording against invoices
  └── quickbooks/     # QB OAuth, sync (invoices + settlements)

Frontend:
  features/financials/
  ├── billing/        # Invoice list, detail, generation
  ├── pay/            # Settlement list, detail, pay structure
  ├── quickbooks/     # QB connection, sync status, mapping
  └── shared/         # Currency formatting, status badges
```

**Why unified:** Invoicing and settlements are two sides of the same load — revenue in, driver pay out. They share the load as their core entity, and QuickBooks needs both through one OAuth connection. Profitability = invoice total - settlement pay - fuel cost, which requires both modules in one place.

---

## Data Model

### New Enums

```prisma
enum InvoiceStatus {
  DRAFT           // Created, not yet sent
  SENT            // Emailed/delivered to customer
  VIEWED          // Customer opened (tracking pixel or portal)
  PARTIAL         // Partially paid
  PAID            // Fully paid
  OVERDUE         // Past due date, not paid
  VOID            // Cancelled/voided
  FACTORED        // Sold to factoring company (future hook)
}

enum SettlementStatus {
  DRAFT           // Calculated, not yet approved
  APPROVED        // Dispatcher/owner approved for payment
  PAID            // Driver has been paid
  VOID            // Cancelled
}

enum PayStructureType {
  PER_MILE        // e.g., $0.55/mile
  PERCENTAGE      // e.g., 27% of linehaul
  FLAT_RATE       // e.g., $800 per load
  HYBRID          // base + percentage (e.g., $200 base + 20% of linehaul)
}

enum DeductionType {
  FUEL_ADVANCE
  CASH_ADVANCE
  INSURANCE
  EQUIPMENT_LEASE
  ESCROW
  OTHER
}

enum LineItemType {
  LINEHAUL        // Base rate
  FUEL_SURCHARGE
  DETENTION_PICKUP
  DETENTION_DELIVERY
  LAYOVER
  LUMPER
  TONU            // Truck Order Not Used
  ACCESSORIAL     // Generic accessorial
  ADJUSTMENT      // Manual adjustment (+/-)
}
```

### Invoice Model

```prisma
model Invoice {
  id              Int             @id @default(autoincrement())
  invoiceId       String          @unique @map("invoice_id") @db.VarChar(50)
  invoiceNumber   String          @map("invoice_number") @db.VarChar(50)
  status          InvoiceStatus   @default(DRAFT)

  // Customer (who we're billing)
  customerId      Int             @map("customer_id")
  customer        Customer        @relation(fields: [customerId], references: [id])

  // Load reference
  loadId          Int             @map("load_id")
  load            Load            @relation(fields: [loadId], references: [id])

  // Financial
  subtotalCents   Int             @map("subtotal_cents")
  adjustmentCents Int             @default(0) @map("adjustment_cents")
  totalCents      Int             @map("total_cents")
  paidCents       Int             @default(0) @map("paid_cents")
  balanceCents    Int             @map("balance_cents")

  // Dates
  issueDate       DateTime        @map("issue_date") @db.Date
  dueDate         DateTime        @map("due_date") @db.Date
  paidDate        DateTime?       @map("paid_date") @db.Date

  // Payment terms
  paymentTermsDays Int            @default(30) @map("payment_terms_days")

  // Factoring hook (future)
  factoringCompany String?        @map("factoring_company") @db.VarChar(200)
  factoredAt       DateTime?      @map("factored_at") @db.Timestamptz

  // QuickBooks sync
  qbInvoiceId     String?         @map("qb_invoice_id") @db.VarChar(100)
  qbSyncedAt      DateTime?       @map("qb_synced_at") @db.Timestamptz
  qbSyncError     String?         @map("qb_sync_error") @db.Text

  // Notes
  notes           String?         @db.Text
  internalNotes   String?         @map("internal_notes") @db.Text

  // Tenant + audit
  tenantId        Int             @map("tenant_id")
  tenant          Tenant          @relation(fields: [tenantId], references: [id])
  createdAt       DateTime        @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime        @updatedAt @map("updated_at") @db.Timestamptz
  createdBy       Int?            @map("created_by")

  lineItems       InvoiceLineItem[]
  payments        Payment[]

  @@index([tenantId])
  @@index([customerId])
  @@index([loadId])
  @@index([status])
  @@index([dueDate])
  @@map("invoices")
}

model InvoiceLineItem {
  id              Int             @id @default(autoincrement())
  invoiceId       Int             @map("invoice_id")
  invoice         Invoice         @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  type            LineItemType
  description     String          @db.VarChar(500)
  quantity        Float           @default(1)
  unitPriceCents  Int             @map("unit_price_cents")
  totalCents      Int             @map("total_cents")
  sequenceOrder   Int             @default(0) @map("sequence_order")

  @@index([invoiceId])
  @@map("invoice_line_items")
}
```

### Settlement Model

```prisma
model DriverPayStructure {
  id              Int                @id @default(autoincrement())
  driverId        Int                @unique @map("driver_id")
  driver          Driver             @relation(fields: [driverId], references: [id])

  type            PayStructureType
  ratePerMileCents Int?             @map("rate_per_mile_cents")
  percentage      Float?
  flatRateCents   Int?               @map("flat_rate_cents")
  hybridBaseCents Int?               @map("hybrid_base_cents")
  hybridPercent   Float?             @map("hybrid_percent")

  effectiveDate   DateTime           @map("effective_date") @db.Date
  notes           String?            @db.Text

  tenantId        Int                @map("tenant_id")
  tenant          Tenant             @relation(fields: [tenantId], references: [id])
  createdAt       DateTime           @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime           @updatedAt @map("updated_at") @db.Timestamptz

  @@index([tenantId])
  @@index([driverId])
  @@map("driver_pay_structures")
}

model Settlement {
  id              Int                @id @default(autoincrement())
  settlementId    String             @unique @map("settlement_id") @db.VarChar(50)
  settlementNumber String            @map("settlement_number") @db.VarChar(50)
  status          SettlementStatus   @default(DRAFT)

  // Driver
  driverId        Int                @map("driver_id")
  driver          Driver             @relation(fields: [driverId], references: [id])

  // Period
  periodStart     DateTime           @map("period_start") @db.Date
  periodEnd       DateTime           @map("period_end") @db.Date

  // Financial summary
  grossPayCents   Int                @map("gross_pay_cents")
  deductionsCents Int                @default(0) @map("deductions_cents")
  netPayCents     Int                @map("net_pay_cents")

  // QuickBooks sync
  qbBillId        String?            @map("qb_bill_id") @db.VarChar(100)
  qbSyncedAt      DateTime?          @map("qb_synced_at") @db.Timestamptz
  qbSyncError     String?            @map("qb_sync_error") @db.Text

  notes           String?            @db.Text

  // Approval
  approvedBy      Int?               @map("approved_by")
  approvedAt      DateTime?          @map("approved_at") @db.Timestamptz
  paidAt          DateTime?          @map("paid_at") @db.Timestamptz

  tenantId        Int                @map("tenant_id")
  tenant          Tenant             @relation(fields: [tenantId], references: [id])
  createdAt       DateTime           @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime           @updatedAt @map("updated_at") @db.Timestamptz
  createdBy       Int?               @map("created_by")

  lineItems       SettlementLineItem[]
  deductions      SettlementDeduction[]

  @@index([tenantId])
  @@index([driverId])
  @@index([status])
  @@index([periodStart, periodEnd])
  @@map("settlements")
}

model SettlementLineItem {
  id              Int                @id @default(autoincrement())
  settlementId    Int                @map("settlement_id")
  settlement      Settlement         @relation(fields: [settlementId], references: [id], onDelete: Cascade)

  loadId          Int                @map("load_id")
  load            Load               @relation(fields: [loadId], references: [id])

  description     String             @db.VarChar(500)
  miles           Float?
  loadRevenueCents Int?              @map("load_revenue_cents")
  payAmountCents  Int                @map("pay_amount_cents")
  payStructureType PayStructureType  @map("pay_structure_type")

  @@index([settlementId])
  @@index([loadId])
  @@map("settlement_line_items")
}

model SettlementDeduction {
  id              Int                @id @default(autoincrement())
  settlementId    Int                @map("settlement_id")
  settlement      Settlement         @relation(fields: [settlementId], references: [id], onDelete: Cascade)

  type            DeductionType
  description     String             @db.VarChar(500)
  amountCents     Int                @map("amount_cents")

  @@index([settlementId])
  @@map("settlement_deductions")
}
```

### Payment Model (Shared)

```prisma
model Payment {
  id              Int             @id @default(autoincrement())
  paymentId       String          @unique @map("payment_id") @db.VarChar(50)

  invoiceId       Int             @map("invoice_id")
  invoice         Invoice         @relation(fields: [invoiceId], references: [id])

  amountCents     Int             @map("amount_cents")
  paymentMethod   String?         @map("payment_method") @db.VarChar(50)
  referenceNumber String?         @map("reference_number") @db.VarChar(100)
  paymentDate     DateTime        @map("payment_date") @db.Date
  notes           String?         @db.Text

  tenantId        Int             @map("tenant_id")
  tenant          Tenant          @relation(fields: [tenantId], references: [id])
  createdAt       DateTime        @default(now()) @map("created_at") @db.Timestamptz
  createdBy       Int?            @map("created_by")

  @@index([invoiceId])
  @@index([tenantId])
  @@map("payments")
}
```

### Relation Additions to Existing Models

```prisma
// Load adds:
invoices            Invoice[]
settlementLineItems SettlementLineItem[]

// Customer adds:
invoices            Invoice[]

// Driver adds:
payStructure        DriverPayStructure?
settlements         Settlement[]

// Tenant adds:
invoices            Invoice[]
settlements         Settlement[]
payments            Payment[]
driverPayStructures DriverPayStructure[]
```

---

## API Endpoints

### Billing (Invoicing)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/invoices` | Create invoice manually |
| `POST` | `/api/v1/invoices/generate/:loadId` | Auto-generate from delivered load |
| `POST` | `/api/v1/invoices/bulk-generate` | Generate for multiple delivered loads |
| `GET` | `/api/v1/invoices` | List invoices (filterable) |
| `GET` | `/api/v1/invoices/:id` | Invoice detail with line items |
| `PATCH` | `/api/v1/invoices/:id` | Update invoice (draft only) |
| `POST` | `/api/v1/invoices/:id/send` | Mark as sent |
| `POST` | `/api/v1/invoices/:id/void` | Void invoice |
| `POST` | `/api/v1/invoices/:id/payments` | Record payment |
| `GET` | `/api/v1/invoices/summary` | AR summary + aging buckets |

### Pay (Settlements)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/driver-pay-structures/:driverId` | Get driver pay structure |
| `PUT` | `/api/v1/driver-pay-structures/:driverId` | Set/update pay structure |
| `POST` | `/api/v1/settlements` | Create settlement for period |
| `POST` | `/api/v1/settlements/calculate` | Preview calc (dry run) |
| `GET` | `/api/v1/settlements` | List settlements |
| `GET` | `/api/v1/settlements/:id` | Settlement detail |
| `PATCH` | `/api/v1/settlements/:id` | Update (draft only) |
| `POST` | `/api/v1/settlements/:id/approve` | Approve settlement |
| `POST` | `/api/v1/settlements/:id/mark-paid` | Mark as paid |
| `POST` | `/api/v1/settlements/:id/void` | Void settlement |
| `POST` | `/api/v1/settlements/:id/deductions` | Add deduction |
| `DELETE` | `/api/v1/settlements/:id/deductions/:did` | Remove deduction |

### QuickBooks Integration

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/integrations/quickbooks/status` | Connection status |
| `POST` | `/api/v1/integrations/quickbooks/connect` | Start OAuth flow |
| `POST` | `/api/v1/integrations/quickbooks/callback` | OAuth callback |
| `POST` | `/api/v1/integrations/quickbooks/disconnect` | Disconnect |
| `POST` | `/api/v1/integrations/quickbooks/sync/invoices` | Push invoices to QB |
| `POST` | `/api/v1/integrations/quickbooks/sync/settlements` | Push settlements to QB |
| `GET` | `/api/v1/integrations/quickbooks/sync/status` | Sync status |
| `POST` | `/api/v1/integrations/quickbooks/map-customers` | Map customers |

---

## Settlement Calculation Logic

The core business logic for computing driver pay:

```typescript
function calculateSettlement(driver: Driver, loads: Load[], payStructure: DriverPayStructure): SettlementCalc {
  const lineItems = loads.map(load => {
    const miles = getLoadMiles(load);  // from RoutePlan or ELD actual
    const revenue = load.rateCents;

    let payAmountCents: number;
    switch (payStructure.type) {
      case 'PER_MILE':
        payAmountCents = Math.round(miles * payStructure.ratePerMileCents);
        break;
      case 'PERCENTAGE':
        payAmountCents = Math.round(revenue * (payStructure.percentage / 100));
        break;
      case 'FLAT_RATE':
        payAmountCents = payStructure.flatRateCents;
        break;
      case 'HYBRID':
        payAmountCents = payStructure.hybridBaseCents
          + Math.round(revenue * (payStructure.hybridPercent / 100));
        break;
    }

    return {
      loadId: load.id,
      description: `Load #${load.loadNumber}: ${formatRoute(load)} (${miles} mi)`,
      miles,
      loadRevenueCents: revenue,
      payAmountCents,
      payStructureType: payStructure.type,
    };
  });

  const grossPayCents = lineItems.reduce((sum, li) => sum + li.payAmountCents, 0);

  return { lineItems, grossPayCents };
}
```

**Miles source:** Planned route miles from `RoutePlan.totalDistanceMiles`. Future: actual ELD miles when telematics integration is live.

---

## UI Design

### Navigation Update

```
Current:                          New:
─── Financials ───                ─── Money ───
  Invoicing                         Billing
  Settlements                       Pay
```

Icons: `Receipt` (Billing), `Wallet` (Pay)

### Billing List Page (`/dispatcher/billing`)

**Summary Cards (top row):**

| Card | Value | Color |
|------|-------|-------|
| Outstanding | Total unpaid balance | Default |
| Overdue | Total past due | Red accent |
| Collected (month) | Total paid this month | Green accent |
| Drafts | Count of unsent invoices | Default |

**Table:**
- Invoice # | Customer | Load # | Amount | Status | Issue Date | Due Date | Balance | Actions
- Status badges: Draft (gray), Sent (blue), Paid (green), Overdue (red), Partial (yellow), Void (muted)
- Row click → opens invoice detail dialog

**Filters:** Status (multi-select), Customer, Date range, Overdue toggle

**Actions:**
- "Generate Invoice" → select delivered load(s) → auto-generates with line items
- Bulk select → Send Selected, Generate for Delivered Loads

### Invoice Detail (Tier 2 Dialog — max-w-2xl)

**Header:** Invoice #, Status badge, Customer name, QB sync indicator

**Body (2-column grid on desktop):**
- Left: Line items table (type, description, qty, unit price, total), add line item button
- Right: Summary (subtotal, adjustments, total), payment terms, due date, notes

**Footer:** Payment history table (date, amount, method, reference)

**Actions:** Edit (draft), Send, Record Payment, Void, Sync to QB

### Invoice Auto-Generation Flow

1. Dispatcher clicks "Generate Invoice" on delivered load
2. System pulls: load rate, stop detention times, accessorials
3. Auto-creates line items:
   - **Linehaul**: `load.rateCents`
   - **Detention (pickup)**: if `actualDockHours > freeTime` → overage × rate
   - **Detention (delivery)**: same logic
   - **Lumper**: if recorded on load
4. Draft invoice presented for review
5. Dispatcher can add/edit/remove line items
6. Save as draft or send immediately

### Pay List Page (`/dispatcher/pay`)

**Summary Cards (top row):**

| Card | Value |
|------|-------|
| Pending Approval | Count of drafts |
| Ready to Pay | Count of approved |
| Paid (period) | Total paid out |
| Active Drivers | Drivers with pay structures |

**Table:**
- Settlement # | Driver | Period | Loads | Gross Pay | Deductions | Net Pay | Status | Actions
- Row click → opens settlement detail dialog

**Actions:**
- "Calculate Settlements" → select period + drivers → auto-calculates
- Bulk approve → "Approve Selected"

### Settlement Detail (Tier 2 Dialog — max-w-2xl)

**Header:** Settlement #, Driver name, Period, Status badge

**Earnings Section:**
- Load-by-load table: Load #, Route, Miles, Rate, Pay Amount, Pay Type
- Gross total

**Deductions Section:**
- Deduction table: Type, Description, Amount
- "Add Deduction" button → inline form
- Deduction total

**Net Pay Summary:**
```
Gross Pay:       $X,XXX.XX
Deductions:      -$XXX.XX
─────────────────────────
Net Pay:         $X,XXX.XX
```

**Actions:** Approve, Mark Paid, Print/PDF, Sync to QB

### Driver Pay Structure (Tier 1 Dialog)

Added to existing Driver detail page as "Pay Structure" section:

- Pay type selector: Per Mile | Percentage | Flat Rate | Hybrid
- Conditional fields based on selection:
  - Per Mile: `$[___]/mile`
  - Percentage: `[___]% of linehaul`
  - Flat Rate: `$[___]/load`
  - Hybrid: `$[___] base + [___]% of linehaul`
- Effective date picker
- Save button

---

## QuickBooks Integration

### Connection Flow

1. Admin navigates to Settings > Integrations > QuickBooks
2. Clicks "Connect to QuickBooks"
3. OAuth 2.0 redirect to Intuit authorization
4. User authorizes SALLY to access their QB company
5. Callback stores encrypted tokens in `IntegrationConfig`
6. Customer mapping screen: match SALLY customers to QB customers
7. Driver mapping: SALLY drivers created as QB vendors

### Sync Behavior

**Invoices → QB (on SENT status):**
- Creates QB Invoice with mapped customer
- Maps line items to QB line items
- Stores `qbInvoiceId` for future updates
- Payment in SALLY → updates QB invoice payment

**Settlements → QB (on APPROVED status):**
- Creates QB Bill with driver as vendor
- Line items = settlement loads
- Deductions as separate bill line items
- Mark paid in SALLY → marks QB bill as paid

**Error Handling:**
- Sync errors stored in `qbSyncError` field
- Failed syncs flagged in sync dashboard
- Manual re-sync button per invoice/settlement
- Token refresh handled automatically (QB tokens expire every hour)

### Sync Dashboard (Settings > QuickBooks)

- Connection status (connected/disconnected, company name)
- Last successful sync timestamp
- Error log (recent failures with retry button)
- Customer mapping table (SALLY customer ↔ QB customer)
- Driver/vendor mapping table
- Manual full sync button

---

## Load Profitability

With both billing and pay data, compute per-load margin:

```
Revenue (from invoice):   linehaul + accessorials
Driver Pay (from settlement): calculated from pay structure
Fuel Cost (estimated):    route miles / mpg × fuel price
──────────────────────────────────────────────────────
Gross Margin:             revenue - driver pay - fuel cost
Margin %:                 gross margin / revenue × 100
```

**Surfaces in:**
1. **Loads table** — new "Margin" column (shows $ and %)
2. **Command Center** — Profitability widget (top 5 most/least profitable loads this week)
3. **Invoice detail** — shows cost breakdown alongside revenue
4. **Customer analytics** (future) — avg margin per customer

---

## Feature Flags

Update existing flags and add/rename:

| Key | Name | Description |
|-----|------|-------------|
| `billing_enabled` | Billing | Create, send, and track invoices for completed loads |
| `driver_pay_enabled` | Driver Pay | Calculate and manage driver pay with flexible rate structures |
| `quickbooks_integration_enabled` | QuickBooks Integration | Sync invoices and settlements to QuickBooks |

Rename from: `invoicing_enabled` → `billing_enabled`, `driver_settlements_enabled` → `driver_pay_enabled`

---

## Success Criteria

### Billing
- [ ] Invoice auto-generated from delivered load with correct line items
- [ ] Manual line item add/edit/remove on draft invoices
- [ ] Invoice status lifecycle: Draft → Sent → Paid (with Partial, Overdue, Void)
- [ ] Payment recording updates invoice balance
- [ ] AR summary shows outstanding, overdue, and aging buckets
- [ ] Bulk invoice generation for multiple delivered loads

### Pay
- [ ] Pay structure configurable per driver (all 4 types)
- [ ] Settlement auto-calculated from loads in period
- [ ] Deductions add/remove on draft settlements
- [ ] Settlement approval workflow: Draft → Approved → Paid
- [ ] Net pay = gross - deductions computed correctly

### QuickBooks
- [ ] OAuth 2.0 connection flow works end-to-end
- [ ] Invoices push to QB on send
- [ ] Settlements push to QB on approve
- [ ] Customer/driver mapping UI functional
- [ ] Sync errors surfaced in dashboard with retry

### Profitability
- [ ] Per-load margin visible on loads table
- [ ] Command Center profitability widget populated

---

## Relation to TMS Strategy

This completes **Phase 1** of the TMS roadmap (`tms-strategy-design.md`):

| Phase | Status |
|-------|--------|
| Phase 0: Manual Entry + Load Lifecycle | Built |
| **Phase 1: Money (Billing + Pay)** | **This design** |
| Phase 2: Full Feature Parity | Future |

With Phase 1 complete, SALLY has the 4 pillars of a TMS:
1. Load/order management (Phase 0)
2. Dispatch + route planning (existing core)
3. **Invoicing / billing (this design)**
4. **Driver settlements / pay (this design)**

Plus the moat: HOS-compliant route planning, continuous monitoring, and proactive alerts.

---

*Created: 2026-02-13*
*Approved by: Product Owner*
