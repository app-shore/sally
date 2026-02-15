-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'VOID', 'FACTORED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PayStructureType" AS ENUM ('PER_MILE', 'PERCENTAGE', 'FLAT_RATE', 'HYBRID');

-- CreateEnum
CREATE TYPE "DeductionType" AS ENUM ('FUEL_ADVANCE', 'CASH_ADVANCE', 'INSURANCE', 'EQUIPMENT_LEASE', 'ESCROW', 'OTHER');

-- CreateEnum
CREATE TYPE "LineItemType" AS ENUM ('LINEHAUL', 'FUEL_SURCHARGE', 'DETENTION_PICKUP', 'DETENTION_DELIVERY', 'LAYOVER', 'LUMPER', 'TONU', 'ACCESSORIAL', 'ADJUSTMENT');

-- AlterEnum
ALTER TYPE "IntegrationType" ADD VALUE 'ACCOUNTING';

-- AlterEnum
ALTER TYPE "IntegrationVendor" ADD VALUE 'QUICKBOOKS';

-- AlterTable
ALTER TABLE "loads" ADD COLUMN     "delivered_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "invoice_id" VARCHAR(50) NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "customer_id" INTEGER NOT NULL,
    "load_id" INTEGER NOT NULL,
    "subtotal_cents" INTEGER NOT NULL,
    "adjustment_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cents" INTEGER NOT NULL,
    "paid_cents" INTEGER NOT NULL DEFAULT 0,
    "balance_cents" INTEGER NOT NULL,
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "paid_date" DATE,
    "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
    "factoring_company" VARCHAR(200),
    "factored_at" TIMESTAMPTZ,
    "qb_invoice_id" VARCHAR(100),
    "qb_synced_at" TIMESTAMPTZ,
    "qb_sync_error" TEXT,
    "notes" TEXT,
    "internal_notes" TEXT,
    "tenant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" INTEGER,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "type" "LineItemType" NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit_price_cents" INTEGER NOT NULL,
    "total_cents" INTEGER NOT NULL,
    "sequence_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "payment_id" VARCHAR(50) NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "payment_method" VARCHAR(50),
    "reference_number" VARCHAR(100),
    "payment_date" DATE NOT NULL,
    "notes" TEXT,
    "tenant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_pay_structures" (
    "id" SERIAL NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "type" "PayStructureType" NOT NULL,
    "rate_per_mile_cents" INTEGER,
    "percentage" DOUBLE PRECISION,
    "flat_rate_cents" INTEGER,
    "hybrid_base_cents" INTEGER,
    "hybrid_percent" DOUBLE PRECISION,
    "effective_date" DATE NOT NULL,
    "notes" TEXT,
    "tenant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "driver_pay_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" SERIAL NOT NULL,
    "settlement_id" VARCHAR(50) NOT NULL,
    "settlement_number" VARCHAR(50) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "driver_id" INTEGER NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "gross_pay_cents" INTEGER NOT NULL,
    "deductions_cents" INTEGER NOT NULL DEFAULT 0,
    "net_pay_cents" INTEGER NOT NULL,
    "qb_bill_id" VARCHAR(100),
    "qb_synced_at" TIMESTAMPTZ,
    "qb_sync_error" TEXT,
    "notes" TEXT,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMPTZ,
    "paid_at" TIMESTAMPTZ,
    "tenant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" INTEGER,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_line_items" (
    "id" SERIAL NOT NULL,
    "settlement_id" INTEGER NOT NULL,
    "load_id" INTEGER NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "miles" DOUBLE PRECISION,
    "load_revenue_cents" INTEGER,
    "pay_amount_cents" INTEGER NOT NULL,
    "pay_structure_type" "PayStructureType" NOT NULL,

    CONSTRAINT "settlement_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_deductions" (
    "id" SERIAL NOT NULL,
    "settlement_id" INTEGER NOT NULL,
    "type" "DeductionType" NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "amount_cents" INTEGER NOT NULL,

    CONSTRAINT "settlement_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_id_key" ON "invoices"("invoice_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_idx" ON "invoices"("tenant_id");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- CreateIndex
CREATE INDEX "invoices_load_id_idx" ON "invoices"("load_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenant_id_invoice_number_key" ON "invoices"("tenant_id", "invoice_number");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_id_key" ON "payments"("payment_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_pay_structures_driver_id_key" ON "driver_pay_structures"("driver_id");

-- CreateIndex
CREATE INDEX "driver_pay_structures_tenant_id_idx" ON "driver_pay_structures"("tenant_id");

-- CreateIndex
CREATE INDEX "driver_pay_structures_driver_id_idx" ON "driver_pay_structures"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_settlement_id_key" ON "settlements"("settlement_id");

-- CreateIndex
CREATE INDEX "settlements_tenant_id_idx" ON "settlements"("tenant_id");

-- CreateIndex
CREATE INDEX "settlements_driver_id_idx" ON "settlements"("driver_id");

-- CreateIndex
CREATE INDEX "settlements_status_idx" ON "settlements"("status");

-- CreateIndex
CREATE INDEX "settlements_period_start_period_end_idx" ON "settlements"("period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_tenant_id_settlement_number_key" ON "settlements"("tenant_id", "settlement_number");

-- CreateIndex
CREATE INDEX "settlement_line_items_settlement_id_idx" ON "settlement_line_items"("settlement_id");

-- CreateIndex
CREATE INDEX "settlement_line_items_load_id_idx" ON "settlement_line_items"("load_id");

-- CreateIndex
CREATE INDEX "settlement_deductions_settlement_id_idx" ON "settlement_deductions"("settlement_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "loads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_pay_structures" ADD CONSTRAINT "driver_pay_structures_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_pay_structures" ADD CONSTRAINT "driver_pay_structures_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_line_items" ADD CONSTRAINT "settlement_line_items_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_line_items" ADD CONSTRAINT "settlement_line_items_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "loads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_deductions" ADD CONSTRAINT "settlement_deductions_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
