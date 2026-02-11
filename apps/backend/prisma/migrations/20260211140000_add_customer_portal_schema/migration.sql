-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CUSTOMER';

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "customer_id" VARCHAR(50) NOT NULL,
    "company_name" VARCHAR(200) NOT NULL,
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_id_key" ON "customers"("customer_id");

-- CreateIndex
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Add customer_id to users
ALTER TABLE "users" ADD COLUMN "customer_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "users_customer_id_key" ON "users"("customer_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Add customer_id, tracking_token, equipment_type, intake fields to loads
ALTER TABLE "loads" ADD COLUMN "customer_id" INTEGER;
ALTER TABLE "loads" ADD COLUMN "tracking_token" VARCHAR(100);
ALTER TABLE "loads" ADD COLUMN "equipment_type" VARCHAR(50);
ALTER TABLE "loads" ADD COLUMN "intake_source" VARCHAR(30);
ALTER TABLE "loads" ADD COLUMN "intake_metadata" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "loads_tracking_token_key" ON "loads"("tracking_token");

-- CreateIndex
CREATE INDEX "loads_customer_id_idx" ON "loads"("customer_id");

-- CreateIndex
CREATE INDEX "loads_tracking_token_idx" ON "loads"("tracking_token");

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
