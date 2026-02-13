# Money Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Money module (Billing + Pay) that transforms SALLY from dispatch software into a full minimum viable TMS.

**Architecture:** Unified `financials` domain in the backend (NestJS) with sub-modules for invoicing, settlements, payments, and QuickBooks. Frontend (Next.js) features matching the same structure under `features/financials/`. All data tenant-isolated, all UI dark-theme + responsive, all components Shadcn.

**Tech Stack:** NestJS 11, Prisma 7.3, PostgreSQL 16, Next.js 15, React Query, Zustand, Tailwind CSS, Shadcn/ui, QuickBooks Online API (OAuth 2.0)

**Design Doc:** `.docs/plans/financials/2026-02-13-money-module-design.md`

---

## Task Overview

| # | Task | Type | Depends On |
|---|------|------|------------|
| 1 | Database Schema & Migration | Backend | — |
| 2 | Feature Flags Update | Backend + Frontend | 1 |
| 3 | Navigation Rename | Frontend | — |
| 4 | Invoicing Backend (CRUD + Generation) | Backend | 1 |
| 5 | Invoicing Frontend (Types, API, Hooks) | Frontend | 4 |
| 6 | Billing Page UI | Frontend | 5 |
| 7 | Invoice Detail Dialog | Frontend | 6 |
| 8 | Driver Pay Structure Backend | Backend | 1 |
| 9 | Settlement Backend (CRUD + Calculation) | Backend | 1, 8 |
| 10 | Pay Frontend (Types, API, Hooks) | Frontend | 8, 9 |
| 11 | Pay Page UI | Frontend | 10 |
| 12 | Settlement Detail Dialog | Frontend | 11 |
| 13 | Driver Pay Structure UI | Frontend | 10 |
| 14 | QuickBooks Integration Backend | Backend | 4, 9 |
| 15 | QuickBooks Settings UI | Frontend | 14 |
| 16 | Load Profitability | Backend + Frontend | 4, 9 |

---

## Task 1: Database Schema & Migration

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

**Step 1: Add enums to schema.prisma**

Add after the existing `EquipmentType` enum (around line 421):

```prisma
// === Money Module Enums ===

enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PARTIAL
  PAID
  OVERDUE
  VOID
  FACTORED
}

enum SettlementStatus {
  DRAFT
  APPROVED
  PAID
  VOID
}

enum PayStructureType {
  PER_MILE
  PERCENTAGE
  FLAT_RATE
  HYBRID
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
  LINEHAUL
  FUEL_SURCHARGE
  DETENTION_PICKUP
  DETENTION_DELIVERY
  LAYOVER
  LUMPER
  TONU
  ACCESSORIAL
  ADJUSTMENT
}
```

**Step 2: Add Invoice, InvoiceLineItem, Payment models**

Add after the `RoutePlanLoad` model (around line 778):

```prisma
// === Money Module: Invoicing ===

model Invoice {
  id              Int             @id @default(autoincrement())
  invoiceId       String          @unique @map("invoice_id") @db.VarChar(50)
  invoiceNumber   String          @map("invoice_number") @db.VarChar(50)
  status          InvoiceStatus   @default(DRAFT)

  customerId      Int             @map("customer_id")
  customer        Customer        @relation(fields: [customerId], references: [id])

  loadId          Int             @map("load_id")
  load            Load            @relation(fields: [loadId], references: [id])

  subtotalCents   Int             @map("subtotal_cents")
  adjustmentCents Int             @default(0) @map("adjustment_cents")
  totalCents      Int             @map("total_cents")
  paidCents       Int             @default(0) @map("paid_cents")
  balanceCents    Int             @map("balance_cents")

  issueDate       DateTime        @map("issue_date") @db.Date
  dueDate         DateTime        @map("due_date") @db.Date
  paidDate        DateTime?       @map("paid_date") @db.Date

  paymentTermsDays Int            @default(30) @map("payment_terms_days")

  factoringCompany String?        @map("factoring_company") @db.VarChar(200)
  factoredAt       DateTime?      @map("factored_at") @db.Timestamptz

  qbInvoiceId     String?         @map("qb_invoice_id") @db.VarChar(100)
  qbSyncedAt      DateTime?       @map("qb_synced_at") @db.Timestamptz
  qbSyncError     String?         @map("qb_sync_error") @db.Text

  notes           String?         @db.Text
  internalNotes   String?         @map("internal_notes") @db.Text

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

**Step 3: Add DriverPayStructure, Settlement, SettlementLineItem, SettlementDeduction models**

Add immediately after the Payment model:

```prisma
// === Money Module: Settlements ===

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

  driverId        Int                @map("driver_id")
  driver          Driver             @relation(fields: [driverId], references: [id])

  periodStart     DateTime           @map("period_start") @db.Date
  periodEnd       DateTime           @map("period_end") @db.Date

  grossPayCents   Int                @map("gross_pay_cents")
  deductionsCents Int                @default(0) @map("deductions_cents")
  netPayCents     Int                @map("net_pay_cents")

  qbBillId        String?            @map("qb_bill_id") @db.VarChar(100)
  qbSyncedAt      DateTime?          @map("qb_synced_at") @db.Timestamptz
  qbSyncError     String?            @map("qb_sync_error") @db.Text

  notes           String?            @db.Text

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

**Step 4: Add relations to existing models**

Add to the `Load` model (after `routePlanLoads` relation):
```prisma
  invoices          Invoice[]
  settlementLineItems SettlementLineItem[]
```

Add to the `Customer` model (after `invitations` relation):
```prisma
  invoices          Invoice[]
```

Add to the `Driver` model (after `invitations` relation):
```prisma
  payStructure      DriverPayStructure?
  settlements       Settlement[]
```

Add to the `Tenant` model (after `vehicleTelematics` relation):
```prisma
  invoices            Invoice[]
  settlements         Settlement[]
  payments            Payment[]
  driverPayStructures DriverPayStructure[]
```

**Step 5: Generate and run migration**

Run: `cd apps/backend && npx prisma migrate dev --name add_money_module`
Expected: Migration created successfully, database updated.

**Step 6: Verify Prisma client generation**

Run: `cd apps/backend && npx prisma generate`
Expected: Prisma Client generated successfully.

**Step 7: Commit**

```bash
git add -f apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat(money): add database schema for invoices, settlements, payments, and pay structures"
```

---

## Task 2: Feature Flags Update

**Files:**
- Modify: `apps/backend/prisma/seeds/02-feature-flags.seed.ts`
- Modify: `apps/web/src/shared/config/comingSoonContent.ts`

**Step 1: Update feature flag seeds**

In `apps/backend/prisma/seeds/02-feature-flags.seed.ts`, replace the Financials section:

```typescript
  // Money
  { key: 'billing_enabled', name: 'Billing', description: 'Create, send, and track invoices for completed loads with automatic rate calculation', enabled: false, category: 'dispatcher' },
  { key: 'driver_pay_enabled', name: 'Driver Pay', description: 'Calculate and manage driver pay with per-mile, percentage, flat rate, and hybrid support', enabled: false, category: 'dispatcher' },
  { key: 'quickbooks_integration_enabled', name: 'QuickBooks Integration', description: 'Sync invoices and settlements to QuickBooks for seamless accounting', enabled: false, category: 'admin' },
```

Remove the old `invoicing_enabled` and `driver_settlements_enabled` entries.

**Step 2: Update comingSoonContent.ts**

In `apps/web/src/shared/config/comingSoonContent.ts`, replace the `invoicing_enabled` and `driver_settlements_enabled` entries:

```typescript
  billing_enabled: {
    title: 'Billing',
    description: 'Create, send, and track invoices for completed loads. Automatically calculate rates from load data and get paid faster with professional invoices.',
    features: [
      'One-click invoice generation from completed loads with automatic rate calculation',
      'Line item management with accessorials, detention, and lumper charges',
      'Invoice status tracking: draft, sent, paid, overdue with aging reports',
      'Bulk invoicing for multiple loads to the same customer',
      'QuickBooks sync to eliminate double-entry and keep your books current',
    ],
  },

  driver_pay_enabled: {
    title: 'Driver Pay',
    description: 'Calculate and manage driver pay with support for per-mile, percentage, flat rate, and hybrid structures. Generate settlement statements and sync to accounting.',
    features: [
      'Flexible pay structures: per-mile, percentage of load, flat rate, or hybrid',
      'Automatic settlement calculation from completed routes and loads',
      'Deduction management: advances, fuel cards, insurance, equipment leases',
      'Settlement statement generation with detailed pay breakdown',
      'QuickBooks sync for seamless payroll and expense tracking',
    ],
  },
```

Remove the old `invoicing_enabled` and `driver_settlements_enabled` entries.

**Step 3: Commit**

```bash
git add apps/backend/prisma/seeds/02-feature-flags.seed.ts apps/web/src/shared/config/comingSoonContent.ts
git commit -m "feat(money): rename feature flags from invoicing/settlements to billing/pay"
```

---

## Task 3: Navigation Rename

**Files:**
- Modify: `apps/web/src/shared/lib/navigation.ts`
- Modify: `apps/web/src/app/dispatcher/invoicing/page.tsx` → move to `apps/web/src/app/dispatcher/billing/page.tsx`
- Modify: `apps/web/src/app/dispatcher/settlements/page.tsx` → move to `apps/web/src/app/dispatcher/pay/page.tsx`

**Step 1: Update navigation.ts**

Change all occurrences in `apps/web/src/shared/lib/navigation.ts`:

- Separator label: `'Financials'` → `'Money'`
- Invoicing item: `label: 'Invoicing'` → `label: 'Billing'`, `href: '/dispatcher/invoicing'` → `href: '/dispatcher/billing'`
- Settlements item: `label: 'Settlements'` → `label: 'Pay'`, `href: '/dispatcher/settlements'` → `href: '/dispatcher/pay'`
- Import `Receipt` icon (for Billing) instead of `FileText` if desired. Keep `Wallet` for Pay.

Apply these changes in all three role sections: `dispatcher`, `admin`, `owner`.

**Step 2: Create new billing page**

Create `apps/web/src/app/dispatcher/billing/page.tsx`:

```tsx
"use client";

import { FeatureGuard } from "@/features/platform/feature-flags";

export default function BillingPage() {
  return (
    <FeatureGuard featureKey="billing_enabled">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Billing
        </h1>
        <p className="text-muted-foreground mt-1">
          Create, send, and track invoices for completed loads
        </p>
      </div>
    </FeatureGuard>
  );
}
```

**Step 3: Create new pay page**

Create `apps/web/src/app/dispatcher/pay/page.tsx`:

```tsx
"use client";

import { FeatureGuard } from "@/features/platform/feature-flags";

export default function PayPage() {
  return (
    <FeatureGuard featureKey="driver_pay_enabled">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Pay
        </h1>
        <p className="text-muted-foreground mt-1">
          Calculate and manage driver pay with flexible rate structures
        </p>
      </div>
    </FeatureGuard>
  );
}
```

**Step 4: Delete old pages**

Delete `apps/web/src/app/dispatcher/invoicing/page.tsx` and `apps/web/src/app/dispatcher/settlements/page.tsx`.

**Step 5: Commit**

```bash
git add apps/web/src/shared/lib/navigation.ts apps/web/src/app/dispatcher/billing/ apps/web/src/app/dispatcher/pay/
git rm apps/web/src/app/dispatcher/invoicing/page.tsx apps/web/src/app/dispatcher/settlements/page.tsx
git commit -m "feat(money): rename nav from Financials to Money, routes from invoicing/settlements to billing/pay"
```

---

## Task 4: Invoicing Backend (CRUD + Generation)

**Files:**
- Create: `apps/backend/src/domains/financials/financials.module.ts`
- Create: `apps/backend/src/domains/financials/invoicing/invoicing.module.ts`
- Create: `apps/backend/src/domains/financials/invoicing/services/invoicing.service.ts`
- Create: `apps/backend/src/domains/financials/invoicing/controllers/invoicing.controller.ts`
- Create: `apps/backend/src/domains/financials/invoicing/dto/create-invoice.dto.ts`
- Create: `apps/backend/src/domains/financials/invoicing/dto/index.ts`
- Create: `apps/backend/src/domains/financials/payments/payments.module.ts`
- Create: `apps/backend/src/domains/financials/payments/services/payments.service.ts`
- Modify: `apps/backend/src/app.module.ts` — add FinancialsModule import

**Step 1: Create the aggregate financials module**

`apps/backend/src/domains/financials/financials.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { InvoicingModule } from './invoicing/invoicing.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [InvoicingModule, PaymentsModule],
  exports: [InvoicingModule, PaymentsModule],
})
export class FinancialsModule {}
```

**Step 2: Create invoicing DTOs**

`apps/backend/src/domains/financials/invoicing/dto/create-invoice.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsArray, ValidateNested, IsEnum, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceLineItemDto {
  @ApiProperty({ example: 'LINEHAUL', enum: ['LINEHAUL', 'FUEL_SURCHARGE', 'DETENTION_PICKUP', 'DETENTION_DELIVERY', 'LAYOVER', 'LUMPER', 'TONU', 'ACCESSORIAL', 'ADJUSTMENT'] })
  @IsEnum(['LINEHAUL', 'FUEL_SURCHARGE', 'DETENTION_PICKUP', 'DETENTION_DELIVERY', 'LAYOVER', 'LUMPER', 'TONU', 'ACCESSORIAL', 'ADJUSTMENT'])
  type: string;

  @ApiProperty({ example: 'Line haul - Chicago to Dallas' })
  @IsString()
  description: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 250000, description: 'Unit price in cents' })
  @IsNumber()
  @Min(0)
  unit_price_cents: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'LD-20260213-001', description: 'Load ID to generate invoice for' })
  @IsString()
  load_id: string;

  @ApiProperty({ example: 30, description: 'Payment terms in days', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  payment_terms_days?: number;

  @ApiProperty({ example: 'Net 30', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: 'Internal reference', required: false })
  @IsOptional()
  @IsString()
  internal_notes?: string;

  @ApiProperty({ type: [CreateInvoiceLineItemDto], required: false, description: 'Manual line items (if not auto-generating)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineItemDto)
  line_items?: CreateInvoiceLineItemDto[];
}

export class RecordPaymentDto {
  @ApiProperty({ example: 250000, description: 'Payment amount in cents' })
  @IsNumber()
  @Min(1)
  amount_cents: number;

  @ApiProperty({ example: 'check', required: false })
  @IsOptional()
  @IsString()
  payment_method?: string;

  @ApiProperty({ example: 'CHK-12345', required: false })
  @IsOptional()
  @IsString()
  reference_number?: string;

  @ApiProperty({ example: '2026-02-13', description: 'Payment date' })
  @IsDateString()
  payment_date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInvoiceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  payment_terms_days?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  internal_notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  adjustment_cents?: number;

  @ApiProperty({ type: [CreateInvoiceLineItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineItemDto)
  line_items?: CreateInvoiceLineItemDto[];
}
```

`apps/backend/src/domains/financials/invoicing/dto/index.ts`:

```typescript
export * from './create-invoice.dto';
```

**Step 3: Create invoicing service**

`apps/backend/src/domains/financials/invoicing/services/invoicing.service.ts`:

```typescript
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class InvoicingService {
  private readonly logger = new Logger(InvoicingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate an invoice from a delivered load.
   * Auto-creates line items from load rate and stop data.
   */
  async generateFromLoad(tenantId: number, loadId: string, options?: { payment_terms_days?: number; notes?: string; internal_notes?: string }) {
    const load = await this.prisma.load.findFirst({
      where: { loadId: loadId, tenantId },
      include: { stops: { include: { stop: true } }, customer: true },
    });

    if (!load) throw new NotFoundException('Load not found');
    if (load.status !== 'delivered') throw new BadRequestException('Can only generate invoices for delivered loads');
    if (!load.customerId) throw new BadRequestException('Load must have a customer assigned');
    if (!load.rateCents) throw new BadRequestException('Load must have a rate set');

    // Check for existing invoice
    const existing = await this.prisma.invoice.findFirst({
      where: { loadId: load.id, tenantId, status: { not: 'VOID' } },
    });
    if (existing) throw new BadRequestException(`Invoice ${existing.invoiceNumber} already exists for this load`);

    // Generate invoice number: INV-YYYYMMDD-SEQ
    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    // Build line items
    const lineItems: Array<{ type: string; description: string; quantity: number; unitPriceCents: number; totalCents: number; sequenceOrder: number }> = [];

    // Linehaul
    lineItems.push({
      type: 'LINEHAUL',
      description: `Line haul - Load #${load.loadNumber}`,
      quantity: 1,
      unitPriceCents: load.rateCents,
      totalCents: load.rateCents,
      sequenceOrder: 0,
    });

    // Detention at stops (if actual > estimated by > 2 hours)
    let seq = 1;
    for (const ls of load.stops) {
      if (ls.actualDockHours && ls.estimatedDockHours) {
        const overageHours = ls.actualDockHours - ls.estimatedDockHours;
        const freeHours = 2; // industry standard
        if (overageHours > freeHours) {
          const billableHours = overageHours - freeHours;
          const detentionRateCents = 7500; // $75/hr default
          const detentionType = ls.actionType === 'pickup' ? 'DETENTION_PICKUP' : 'DETENTION_DELIVERY';
          lineItems.push({
            type: detentionType,
            description: `Detention at ${ls.actionType} (${billableHours.toFixed(1)} hrs @ $75/hr)`,
            quantity: billableHours,
            unitPriceCents: detentionRateCents,
            totalCents: Math.round(billableHours * detentionRateCents),
            sequenceOrder: seq++,
          });
        }
      }
    }

    const subtotalCents = lineItems.reduce((sum, li) => sum + li.totalCents, 0);
    const paymentTermsDays = options?.payment_terms_days ?? 30;
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + paymentTermsDays);

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceId: `inv_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
        invoiceNumber,
        status: 'DRAFT',
        customerId: load.customerId,
        loadId: load.id,
        subtotalCents,
        adjustmentCents: 0,
        totalCents: subtotalCents,
        paidCents: 0,
        balanceCents: subtotalCents,
        issueDate,
        dueDate,
        paymentTermsDays,
        notes: options?.notes || null,
        internalNotes: options?.internal_notes || null,
        tenantId,
        lineItems: {
          create: lineItems,
        },
      },
      include: { lineItems: true, customer: true, load: true },
    });

    this.logger.log(`Generated invoice ${invoiceNumber} for load ${load.loadNumber} (tenant ${tenantId})`);
    return invoice;
  }

  /** List invoices with filtering */
  async findAll(tenantId: number, filters?: { status?: string; customer_id?: number; overdue_only?: boolean }, pagination?: { limit?: number; offset?: number }) {
    const where: any = { tenantId };

    if (filters?.status) where.status = filters.status;
    if (filters?.customer_id) where.customerId = filters.customer_id;
    if (filters?.overdue_only) {
      where.status = { in: ['SENT', 'PARTIAL'] };
      where.dueDate = { lt: new Date() };
    }

    return this.prisma.invoice.findMany({
      where,
      include: { customer: true, load: { select: { loadNumber: true, loadId: true } }, lineItems: true },
      orderBy: { createdAt: 'desc' },
      take: pagination?.limit ?? 50,
      skip: pagination?.offset ?? 0,
    });
  }

  /** Get single invoice with all relations */
  async findOne(tenantId: number, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { invoiceId, tenantId },
      include: {
        customer: true,
        load: { include: { stops: { include: { stop: true } } } },
        lineItems: { orderBy: { sequenceOrder: 'asc' } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  /** Update a draft invoice */
  async update(tenantId: number, invoiceId: string, data: { payment_terms_days?: number; notes?: string; internal_notes?: string; adjustment_cents?: number; line_items?: any[] }) {
    const invoice = await this.findOne(tenantId, invoiceId);
    if (invoice.status !== 'DRAFT') throw new BadRequestException('Can only edit draft invoices');

    const updateData: any = {};
    if (data.payment_terms_days !== undefined) {
      updateData.paymentTermsDays = data.payment_terms_days;
      const newDue = new Date(invoice.issueDate);
      newDue.setDate(newDue.getDate() + data.payment_terms_days);
      updateData.dueDate = newDue;
    }
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.internal_notes !== undefined) updateData.internalNotes = data.internal_notes;

    // Replace line items if provided
    if (data.line_items) {
      await this.prisma.invoiceLineItem.deleteMany({ where: { invoiceId: invoice.id } });
      const lineItems = data.line_items.map((li, idx) => ({
        invoiceId: invoice.id,
        type: li.type,
        description: li.description,
        quantity: li.quantity,
        unitPriceCents: li.unit_price_cents,
        totalCents: Math.round(li.quantity * li.unit_price_cents),
        sequenceOrder: idx,
      }));
      await this.prisma.invoiceLineItem.createMany({ data: lineItems });

      const subtotalCents = lineItems.reduce((sum, li) => sum + li.totalCents, 0);
      const adjustmentCents = data.adjustment_cents ?? invoice.adjustmentCents;
      updateData.subtotalCents = subtotalCents;
      updateData.adjustmentCents = adjustmentCents;
      updateData.totalCents = subtotalCents + adjustmentCents;
      updateData.balanceCents = subtotalCents + adjustmentCents - invoice.paidCents;
    } else if (data.adjustment_cents !== undefined) {
      updateData.adjustmentCents = data.adjustment_cents;
      updateData.totalCents = invoice.subtotalCents + data.adjustment_cents;
      updateData.balanceCents = invoice.subtotalCents + data.adjustment_cents - invoice.paidCents;
    }

    return this.prisma.invoice.update({
      where: { id: invoice.id },
      data: updateData,
      include: { lineItems: { orderBy: { sequenceOrder: 'asc' } }, customer: true, load: true },
    });
  }

  /** Mark invoice as sent */
  async markSent(tenantId: number, invoiceId: string) {
    const invoice = await this.findOne(tenantId, invoiceId);
    if (invoice.status !== 'DRAFT') throw new BadRequestException('Can only send draft invoices');

    return this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'SENT' },
      include: { lineItems: true, customer: true, load: true },
    });
  }

  /** Void an invoice */
  async void(tenantId: number, invoiceId: string) {
    const invoice = await this.findOne(tenantId, invoiceId);
    if (invoice.status === 'VOID') throw new BadRequestException('Invoice is already voided');
    if (invoice.status === 'PAID') throw new BadRequestException('Cannot void a fully paid invoice');

    return this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'VOID' },
      include: { lineItems: true, customer: true, load: true },
    });
  }

  /** AR summary: outstanding, overdue, aging buckets */
  async getSummary(tenantId: number) {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } },
      select: { balanceCents: true, dueDate: true, status: true },
    });

    const now = new Date();
    let outstanding = 0;
    let overdue = 0;
    const aging = { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 0 };

    for (const inv of invoices) {
      outstanding += inv.balanceCents;
      const daysPast = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));

      if (daysPast > 0) {
        overdue += inv.balanceCents;
        if (daysPast <= 30) aging.days_1_30 += inv.balanceCents;
        else if (daysPast <= 60) aging.days_31_60 += inv.balanceCents;
        else if (daysPast <= 90) aging.days_61_90 += inv.balanceCents;
        else aging.days_over_90 += inv.balanceCents;
      } else {
        aging.current += inv.balanceCents;
      }
    }

    // Paid this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidThisMonth = await this.prisma.payment.aggregate({
      where: { tenantId, paymentDate: { gte: startOfMonth } },
      _sum: { amountCents: true },
    });

    // Draft count
    const draftCount = await this.prisma.invoice.count({
      where: { tenantId, status: 'DRAFT' },
    });

    return {
      outstanding_cents: outstanding,
      overdue_cents: overdue,
      paid_this_month_cents: paidThisMonth._sum.amountCents ?? 0,
      draft_count: draftCount,
      aging,
    };
  }

  /** Generate sequential invoice number */
  private async generateInvoiceNumber(tenantId: number): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({
      where: {
        tenantId,
        invoiceNumber: { startsWith: `INV-${year}` },
      },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `INV-${year}-${seq}`;
  }
}
```

**Step 4: Create payments service**

`apps/backend/src/domains/financials/payments/services/payments.service.ts`:

```typescript
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordPayment(tenantId: number, invoiceId: string, data: {
    amount_cents: number;
    payment_method?: string;
    reference_number?: string;
    payment_date: string;
    notes?: string;
  }, userId?: number) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { invoiceId, tenantId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'VOID') throw new BadRequestException('Cannot record payment on voided invoice');
    if (invoice.status === 'PAID') throw new BadRequestException('Invoice is already fully paid');

    if (data.amount_cents > invoice.balanceCents) {
      throw new BadRequestException(`Payment amount ($${(data.amount_cents / 100).toFixed(2)}) exceeds balance ($${(invoice.balanceCents / 100).toFixed(2)})`);
    }

    const payment = await this.prisma.payment.create({
      data: {
        paymentId: `pay_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
        invoiceId: invoice.id,
        amountCents: data.amount_cents,
        paymentMethod: data.payment_method || null,
        referenceNumber: data.reference_number || null,
        paymentDate: new Date(data.payment_date),
        notes: data.notes || null,
        tenantId,
        createdBy: userId || null,
      },
    });

    // Update invoice
    const newPaidCents = invoice.paidCents + data.amount_cents;
    const newBalanceCents = invoice.totalCents - newPaidCents;
    const newStatus = newBalanceCents <= 0 ? 'PAID' : 'PARTIAL';

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidCents: newPaidCents,
        balanceCents: newBalanceCents,
        status: newStatus,
        paidDate: newStatus === 'PAID' ? new Date() : null,
      },
    });

    this.logger.log(`Recorded payment of $${(data.amount_cents / 100).toFixed(2)} on invoice ${invoice.invoiceNumber}`);
    return payment;
  }
}
```

**Step 5: Create payments module**

`apps/backend/src/domains/financials/payments/payments.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { PaymentsService } from './services/payments.service';

@Module({
  imports: [PrismaModule],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
```

**Step 6: Create invoicing controller**

`apps/backend/src/domains/financials/invoicing/controllers/invoicing.controller.ts`:

```typescript
import { Controller, Post, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Roles } from '@/shared/decorators/roles.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { BaseTenantController } from '@/shared/base/base-tenant.controller';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { InvoicingService } from '../services/invoicing.service';
import { PaymentsService } from '../../payments/services/payments.service';
import { CreateInvoiceDto, RecordPaymentDto, UpdateInvoiceDto } from '../dto';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicingController extends BaseTenantController {
  constructor(
    prisma: PrismaService,
    private readonly invoicingService: InvoicingService,
    private readonly paymentsService: PaymentsService,
  ) {
    super(prisma);
  }

  @Post('generate/:load_id')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Auto-generate invoice from delivered load' })
  async generateFromLoad(
    @CurrentUser() user: any,
    @Param('load_id') loadId: string,
    @Body() body: { payment_terms_days?: number; notes?: string; internal_notes?: string },
  ) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.invoicingService.generateFromLoad(tenantDbId, loadId, body);
  }

  @Post()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create invoice with manual line items' })
  async create(@CurrentUser() user: any, @Body() dto: CreateInvoiceDto) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.invoicingService.generateFromLoad(tenantDbId, dto.load_id, {
      payment_terms_days: dto.payment_terms_days,
      notes: dto.notes,
      internal_notes: dto.internal_notes,
    });
  }

  @Get()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'List invoices with filtering' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customer_id', required: false })
  @ApiQuery({ name: 'overdue_only', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('customer_id') customerId?: string,
    @Query('overdue_only') overdueOnly?: string,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.invoicingService.findAll(
      tenantDbId,
      { status, customer_id: customerId ? Number(customerId) : undefined, overdue_only: overdueOnly === 'true' },
      { limit: Number(limit), offset: Number(offset) },
    );
  }

  @Get('summary')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'AR summary with aging buckets' })
  async getSummary(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.invoicingService.getSummary(tenantDbId);
  }

  @Get(':invoice_id')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get invoice detail with line items and payments' })
  async findOne(@CurrentUser() user: any, @Param('invoice_id') invoiceId: string) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.invoicingService.findOne(tenantDbId, invoiceId);
  }

  @Patch(':invoice_id')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update draft invoice' })
  async update(@CurrentUser() user: any, @Param('invoice_id') invoiceId: string, @Body() dto: UpdateInvoiceDto) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.invoicingService.update(tenantDbId, invoiceId, dto);
  }

  @Post(':invoice_id/send')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Mark invoice as sent' })
  async markSent(@CurrentUser() user: any, @Param('invoice_id') invoiceId: string) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.invoicingService.markSent(tenantDbId, invoiceId);
  }

  @Post(':invoice_id/void')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Void an invoice' })
  async voidInvoice(@CurrentUser() user: any, @Param('invoice_id') invoiceId: string) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.invoicingService.void(tenantDbId, invoiceId);
  }

  @Post(':invoice_id/payments')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Record payment against invoice' })
  async recordPayment(@CurrentUser() user: any, @Param('invoice_id') invoiceId: string, @Body() dto: RecordPaymentDto) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.paymentsService.recordPayment(tenantDbId, invoiceId, dto, user.userId);
  }
}
```

**Step 7: Create invoicing module**

`apps/backend/src/domains/financials/invoicing/invoicing.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { InvoicingController } from './controllers/invoicing.controller';
import { InvoicingService } from './services/invoicing.service';

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [InvoicingController],
  providers: [InvoicingService],
  exports: [InvoicingService],
})
export class InvoicingModule {}
```

**Step 8: Register FinancialsModule in app.module.ts**

In `apps/backend/src/app.module.ts`, add import:

```typescript
import { FinancialsModule } from './domains/financials/financials.module';
```

Add `FinancialsModule` to the imports array after `RoutingModule`.

**Step 9: Commit**

```bash
git add apps/backend/src/domains/financials/ apps/backend/src/app.module.ts
git commit -m "feat(money): add invoicing backend with CRUD, auto-generation, and payment recording"
```

---

## Task 5: Invoicing Frontend (Types, API, Hooks)

**Files:**
- Create: `apps/web/src/features/financials/billing/types.ts`
- Create: `apps/web/src/features/financials/billing/api.ts`
- Create: `apps/web/src/features/financials/billing/hooks/use-invoices.ts`
- Create: `apps/web/src/features/financials/billing/index.ts`

**Step 1: Create types**

`apps/web/src/features/financials/billing/types.ts`:

```typescript
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'VOID' | 'FACTORED';
export type LineItemType = 'LINEHAUL' | 'FUEL_SURCHARGE' | 'DETENTION_PICKUP' | 'DETENTION_DELIVERY' | 'LAYOVER' | 'LUMPER' | 'TONU' | 'ACCESSORIAL' | 'ADJUSTMENT';

export interface InvoiceLineItem {
  id: number;
  type: LineItemType;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  sequence_order: number;
}

export interface InvoicePayment {
  id: number;
  payment_id: string;
  amount_cents: number;
  payment_method: string | null;
  reference_number: string | null;
  payment_date: string;
  notes: string | null;
}

export interface Invoice {
  id: number;
  invoice_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  customer_id: number;
  customer: { company_name: string; billing_email?: string };
  load_id: number;
  load: { load_number: string; load_id: string };
  subtotal_cents: number;
  adjustment_cents: number;
  total_cents: number;
  paid_cents: number;
  balance_cents: number;
  issue_date: string;
  due_date: string;
  paid_date: string | null;
  payment_terms_days: number;
  notes: string | null;
  internal_notes: string | null;
  qb_invoice_id: string | null;
  qb_synced_at: string | null;
  created_at: string;
  line_items: InvoiceLineItem[];
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

**Step 2: Create API client**

`apps/web/src/features/financials/billing/api.ts`:

```typescript
import { apiClient } from '@/shared/lib/api';
import type { Invoice, InvoiceSummary } from './types';

export const invoicesApi = {
  list: async (params?: { status?: string; customer_id?: number; overdue_only?: boolean; limit?: number; offset?: number }): Promise<Invoice[]> => {
    const qp = new URLSearchParams();
    if (params?.status) qp.set('status', params.status);
    if (params?.customer_id) qp.set('customer_id', String(params.customer_id));
    if (params?.overdue_only) qp.set('overdue_only', 'true');
    if (params?.limit) qp.set('limit', String(params.limit));
    if (params?.offset) qp.set('offset', String(params.offset));
    const qs = qp.toString();
    return apiClient<Invoice[]>(qs ? `/invoices/?${qs}` : '/invoices/');
  },

  getById: async (invoiceId: string): Promise<Invoice> => {
    return apiClient<Invoice>(`/invoices/${invoiceId}`);
  },

  generateFromLoad: async (loadId: string, options?: { payment_terms_days?: number; notes?: string }): Promise<Invoice> => {
    return apiClient<Invoice>(`/invoices/generate/${loadId}`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  },

  update: async (invoiceId: string, data: any): Promise<Invoice> => {
    return apiClient<Invoice>(`/invoices/${invoiceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  send: async (invoiceId: string): Promise<Invoice> => {
    return apiClient<Invoice>(`/invoices/${invoiceId}/send`, { method: 'POST' });
  },

  void: async (invoiceId: string): Promise<Invoice> => {
    return apiClient<Invoice>(`/invoices/${invoiceId}/void`, { method: 'POST' });
  },

  recordPayment: async (invoiceId: string, data: { amount_cents: number; payment_method?: string; reference_number?: string; payment_date: string; notes?: string }): Promise<any> => {
    return apiClient(`/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getSummary: async (): Promise<InvoiceSummary> => {
    return apiClient<InvoiceSummary>('/invoices/summary');
  },
};
```

**Step 3: Create hooks**

`apps/web/src/features/financials/billing/hooks/use-invoices.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '../api';
import type { Invoice } from '../types';

const INVOICES_KEY = ['invoices'] as const;

export function useInvoices(params?: { status?: string; customer_id?: number; overdue_only?: boolean }) {
  return useQuery({
    queryKey: [...INVOICES_KEY, params],
    queryFn: () => invoicesApi.list(params),
  });
}

export function useInvoiceById(invoiceId: string) {
  return useQuery({
    queryKey: [...INVOICES_KEY, invoiceId],
    queryFn: () => invoicesApi.getById(invoiceId),
    enabled: !!invoiceId,
  });
}

export function useInvoiceSummary() {
  return useQuery({
    queryKey: [...INVOICES_KEY, 'summary'],
    queryFn: () => invoicesApi.getSummary(),
  });
}

export function useGenerateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ loadId, options }: { loadId: string; options?: { payment_terms_days?: number; notes?: string } }) =>
      invoicesApi.generateFromLoad(loadId, options),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
  });
}

export function useSendInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.send(invoiceId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
  });
}

export function useVoidInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.void(invoiceId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: { amount_cents: number; payment_method?: string; reference_number?: string; payment_date: string; notes?: string } }) =>
      invoicesApi.recordPayment(invoiceId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
  });
}
```

**Step 4: Create index**

`apps/web/src/features/financials/billing/index.ts`:

```typescript
export * from './types';
export * from './api';
export * from './hooks/use-invoices';
```

**Step 5: Commit**

```bash
git add apps/web/src/features/financials/billing/
git commit -m "feat(money): add billing frontend types, API client, and React Query hooks"
```

---

## Task 6: Billing Page UI

**Files:**
- Modify: `apps/web/src/app/dispatcher/billing/page.tsx`

Build the full Billing page with summary cards and invoice table. This is a larger task — see the design doc for the exact layout. Key elements:

- 4 summary cards at top using `useInvoiceSummary()` hook
- Invoice table using `useInvoices()` hook with Shadcn `Table` component
- Status filter using Shadcn `Select`
- "Generate Invoice" button that opens a load selector dialog
- Status badges with appropriate colors (gray=Draft, blue=Sent, green=Paid, red=Overdue)
- Currency formatting helper: `(cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })`
- Row click opens invoice detail (Task 7)
- Wrap in `<FeatureGuard featureKey="billing_enabled">`
- Dark theme support, responsive layout

**Commit after building:**

```bash
git add apps/web/src/app/dispatcher/billing/
git commit -m "feat(money): build Billing page with summary cards and invoice table"
```

---

## Task 7: Invoice Detail Dialog

**Files:**
- Create: `apps/web/src/features/financials/billing/components/invoice-detail-dialog.tsx`
- Create: `apps/web/src/features/financials/billing/components/record-payment-dialog.tsx`

Build Tier 2 dialog (`max-w-2xl`) showing:
- Header: Invoice #, status badge, customer name
- Line items table with type, description, qty, unit price, total
- Summary section: subtotal, adjustments, total, paid, balance
- Payment history table
- Actions: Send (if draft), Record Payment, Void, Edit (if draft)
- Record Payment opens a nested Tier 1 dialog

**Commit after building:**

```bash
git add apps/web/src/features/financials/billing/components/
git commit -m "feat(money): add invoice detail and record payment dialogs"
```

---

## Task 8: Driver Pay Structure Backend

**Files:**
- Create: `apps/backend/src/domains/financials/settlements/settlements.module.ts`
- Create: `apps/backend/src/domains/financials/settlements/services/pay-structure.service.ts`
- Create: `apps/backend/src/domains/financials/settlements/controllers/pay-structure.controller.ts`
- Create: `apps/backend/src/domains/financials/settlements/dto/pay-structure.dto.ts`
- Create: `apps/backend/src/domains/financials/settlements/dto/index.ts`
- Modify: `apps/backend/src/domains/financials/financials.module.ts`

**Step 1: Create pay structure DTO**

`apps/backend/src/domains/financials/settlements/dto/pay-structure.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsDateString, Min, ValidateIf } from 'class-validator';

export class UpsertPayStructureDto {
  @ApiProperty({ example: 'PER_MILE', enum: ['PER_MILE', 'PERCENTAGE', 'FLAT_RATE', 'HYBRID'] })
  @IsEnum(['PER_MILE', 'PERCENTAGE', 'FLAT_RATE', 'HYBRID'])
  type: string;

  @ApiProperty({ example: 55, description: 'Rate per mile in cents (for PER_MILE)', required: false })
  @ValidateIf(o => o.type === 'PER_MILE')
  @IsNumber()
  @Min(1)
  rate_per_mile_cents?: number;

  @ApiProperty({ example: 27.0, description: 'Percentage of linehaul (for PERCENTAGE)', required: false })
  @ValidateIf(o => o.type === 'PERCENTAGE')
  @IsNumber()
  @Min(0.1)
  percentage?: number;

  @ApiProperty({ example: 80000, description: 'Flat rate in cents (for FLAT_RATE)', required: false })
  @ValidateIf(o => o.type === 'FLAT_RATE')
  @IsNumber()
  @Min(1)
  flat_rate_cents?: number;

  @ApiProperty({ example: 20000, description: 'Hybrid base in cents (for HYBRID)', required: false })
  @ValidateIf(o => o.type === 'HYBRID')
  @IsNumber()
  @Min(0)
  hybrid_base_cents?: number;

  @ApiProperty({ example: 20.0, description: 'Hybrid percentage (for HYBRID)', required: false })
  @ValidateIf(o => o.type === 'HYBRID')
  @IsNumber()
  @Min(0.1)
  hybrid_percent?: number;

  @ApiProperty({ example: '2026-02-13' })
  @IsDateString()
  effective_date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
```

**Step 2: Create pay structure service**

`apps/backend/src/domains/financials/settlements/services/pay-structure.service.ts`:

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class PayStructureService {
  private readonly logger = new Logger(PayStructureService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getByDriverId(tenantId: number, driverId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { driverId, tenantId },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    return this.prisma.driverPayStructure.findUnique({
      where: { driverId: driver.id },
    });
  }

  async upsert(tenantId: number, driverId: string, data: {
    type: string;
    rate_per_mile_cents?: number;
    percentage?: number;
    flat_rate_cents?: number;
    hybrid_base_cents?: number;
    hybrid_percent?: number;
    effective_date: string;
    notes?: string;
  }) {
    const driver = await this.prisma.driver.findFirst({
      where: { driverId, tenantId },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const result = await this.prisma.driverPayStructure.upsert({
      where: { driverId: driver.id },
      update: {
        type: data.type as any,
        ratePerMileCents: data.rate_per_mile_cents || null,
        percentage: data.percentage || null,
        flatRateCents: data.flat_rate_cents || null,
        hybridBaseCents: data.hybrid_base_cents || null,
        hybridPercent: data.hybrid_percent || null,
        effectiveDate: new Date(data.effective_date),
        notes: data.notes || null,
      },
      create: {
        driverId: driver.id,
        type: data.type as any,
        ratePerMileCents: data.rate_per_mile_cents || null,
        percentage: data.percentage || null,
        flatRateCents: data.flat_rate_cents || null,
        hybridBaseCents: data.hybrid_base_cents || null,
        hybridPercent: data.hybrid_percent || null,
        effectiveDate: new Date(data.effective_date),
        notes: data.notes || null,
        tenantId,
      },
    });

    this.logger.log(`Upserted pay structure for driver ${driverId}: ${data.type}`);
    return result;
  }
}
```

**Step 3: Create controller, module, and register in financials.module.ts**

Follow the same patterns as invoicing (controller extends BaseTenantController, module imports PrismaModule).

**Step 4: Commit**

```bash
git add apps/backend/src/domains/financials/settlements/
git commit -m "feat(money): add driver pay structure backend (CRUD)"
```

---

## Task 9: Settlement Backend (CRUD + Calculation)

**Files:**
- Create: `apps/backend/src/domains/financials/settlements/services/settlements.service.ts`
- Create: `apps/backend/src/domains/financials/settlements/controllers/settlements.controller.ts`
- Create: `apps/backend/src/domains/financials/settlements/dto/create-settlement.dto.ts`
- Modify: `apps/backend/src/domains/financials/settlements/dto/index.ts`
- Modify: `apps/backend/src/domains/financials/settlements/settlements.module.ts`

This is the core business logic task. The settlements service must:

1. **Calculate settlements** for a driver + period:
   - Query delivered loads for the driver in the date range
   - Look up driver's pay structure
   - For each load, compute pay based on structure type (see design doc calc logic)
   - Get route miles from RoutePlan
   - Return preview (dry run) or create settlement

2. **Settlement CRUD**: list, get detail, update draft, approve, mark paid, void

3. **Deductions**: add/remove deductions on draft settlements, recalculate net pay

4. **Settlement number generation**: `STL-YYYY-WNN-DRIVERNAME` format

Follow the invoicing service patterns. Key difference: settlement calculation logic as shown in the design doc.

**Commit after building:**

```bash
git add apps/backend/src/domains/financials/settlements/
git commit -m "feat(money): add settlement backend with calculation engine, CRUD, and deductions"
```

---

## Task 10: Pay Frontend (Types, API, Hooks)

**Files:**
- Create: `apps/web/src/features/financials/pay/types.ts`
- Create: `apps/web/src/features/financials/pay/api.ts`
- Create: `apps/web/src/features/financials/pay/hooks/use-settlements.ts`
- Create: `apps/web/src/features/financials/pay/hooks/use-pay-structure.ts`
- Create: `apps/web/src/features/financials/pay/index.ts`

Follow the exact same patterns as Task 5 (billing types/api/hooks) but for settlements and pay structures. Types should include: `Settlement`, `SettlementLineItem`, `SettlementDeduction`, `DriverPayStructure`, `PayStructureType`.

**Commit after building:**

```bash
git add apps/web/src/features/financials/pay/
git commit -m "feat(money): add pay frontend types, API client, and React Query hooks"
```

---

## Task 11: Pay Page UI

**Files:**
- Modify: `apps/web/src/app/dispatcher/pay/page.tsx`

Build the full Pay page following the same patterns as the Billing page (Task 6):

- 4 summary cards: Pending Approval, Ready to Pay, Paid (period), Active Drivers
- Settlement table with driver, period, loads, gross/deductions/net, status
- Status badges (gray=Draft, blue=Approved, green=Paid)
- "Calculate Settlements" button → opens period + driver selector dialog
- Bulk approve functionality
- Wrap in `<FeatureGuard featureKey="driver_pay_enabled">`

**Commit after building:**

```bash
git add apps/web/src/app/dispatcher/pay/
git commit -m "feat(money): build Pay page with summary cards and settlement table"
```

---

## Task 12: Settlement Detail Dialog

**Files:**
- Create: `apps/web/src/features/financials/pay/components/settlement-detail-dialog.tsx`
- Create: `apps/web/src/features/financials/pay/components/add-deduction-dialog.tsx`

Build Tier 2 dialog (`max-w-2xl`) showing:
- Header: Settlement #, driver name, period, status
- Earnings table: load-by-load breakdown with pay calculation
- Deductions table with add/remove
- Net pay summary (gross - deductions = net)
- Actions: Approve (if draft), Mark Paid (if approved), Void

**Commit after building:**

```bash
git add apps/web/src/features/financials/pay/components/
git commit -m "feat(money): add settlement detail and deduction dialogs"
```

---

## Task 13: Driver Pay Structure UI

**Files:**
- Create: `apps/web/src/features/financials/pay/components/pay-structure-dialog.tsx`
- Modify: driver detail page/component to add "Pay Structure" section

Build Tier 1 dialog (`max-w-lg`):
- Pay type selector (RadioGroup or Select): Per Mile | Percentage | Flat Rate | Hybrid
- Conditional fields appear/hide based on selection
- Effective date picker
- Save button using `useUpsertPayStructure()` mutation
- Show current pay structure on driver detail page

**Commit after building:**

```bash
git add apps/web/src/features/financials/pay/components/pay-structure-dialog.tsx
git commit -m "feat(money): add driver pay structure dialog"
```

---

## Task 14: QuickBooks Integration Backend

**Files:**
- Create: `apps/backend/src/domains/financials/quickbooks/quickbooks.module.ts`
- Create: `apps/backend/src/domains/financials/quickbooks/services/quickbooks.service.ts`
- Create: `apps/backend/src/domains/financials/quickbooks/controllers/quickbooks.controller.ts`
- Modify: `apps/backend/src/domains/financials/financials.module.ts`

This task implements:
1. OAuth 2.0 flow (connect/callback/disconnect) using QB's OAuth endpoints
2. Token storage in `IntegrationConfig` table (encrypted)
3. Invoice sync: when invoice sent, push to QB as Invoice
4. Settlement sync: when settlement approved, push to QB as Bill
5. Customer/driver mapping (SALLY entity ↔ QB entity)
6. Token refresh handling

**Dependencies:** QuickBooks Online API SDK (`node-quickbooks` or direct REST calls)

**Commit after building:**

```bash
git add apps/backend/src/domains/financials/quickbooks/
git commit -m "feat(money): add QuickBooks integration backend with OAuth and sync"
```

---

## Task 15: QuickBooks Settings UI

**Files:**
- Create: `apps/web/src/features/financials/quickbooks/components/quickbooks-settings.tsx`
- Modify: settings page to add QuickBooks section

Build the QB settings panel:
- Connection status card (connected/disconnected)
- Connect/Disconnect button
- Last sync timestamp
- Customer mapping table
- Driver/vendor mapping table
- Manual sync button
- Error log with retry

**Commit after building:**

```bash
git add apps/web/src/features/financials/quickbooks/
git commit -m "feat(money): add QuickBooks settings UI with connection and mapping"
```

---

## Task 16: Load Profitability

**Files:**
- Modify: invoicing service or create a profitability utility
- Modify: loads API response to include margin data
- Modify: loads page to show margin column
- Modify: command center to add profitability widget

Compute per-load margin:
- Revenue = invoice total (or load.rateCents if no invoice yet)
- Driver cost = settlement line item pay amount
- Fuel cost (estimated) = route miles / vehicle mpg * fuel price estimate
- Margin = revenue - driver cost - fuel cost
- Margin % = margin / revenue * 100

Add "Margin" column to loads table. Add profitability widget to command center.

**Commit after building:**

```bash
git add apps/backend/src/domains/financials/ apps/web/src/
git commit -m "feat(money): add load profitability calculation and UI widgets"
```

---

## Verification Checklist

Before marking complete, verify:

- [ ] All 7 new database models created and migrated
- [ ] All invoice CRUD endpoints working (generate, list, get, update, send, void, record payment)
- [ ] AR summary returns correct totals and aging
- [ ] Pay structure CRUD working for all 4 types
- [ ] Settlement calculation correct for each pay structure type
- [ ] Deductions add/remove and net pay recalculation
- [ ] Settlement approval workflow (draft → approved → paid)
- [ ] QuickBooks OAuth flow connects and stores tokens
- [ ] QB sync pushes invoices on send and settlements on approve
- [ ] Billing page shows summary cards and table
- [ ] Pay page shows summary cards and table
- [ ] Invoice detail dialog shows line items and payments
- [ ] Settlement detail dialog shows earnings and deductions
- [ ] Navigation shows "Money > Billing | Pay"
- [ ] Feature flags gate both pages correctly
- [ ] All UI components use Shadcn (no plain HTML)
- [ ] Dark theme works on all new pages
- [ ] Responsive at 375px, 768px, 1440px
- [ ] Load profitability visible on loads table
