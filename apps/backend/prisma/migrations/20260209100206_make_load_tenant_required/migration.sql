-- Backfill: Set tenant_id for existing loads that have NULL tenant_id
-- Uses the first (and typically only) tenant for development/seed data
UPDATE "loads" SET "tenant_id" = (SELECT "id" FROM "tenants" LIMIT 1) WHERE "tenant_id" IS NULL;

-- AlterTable
ALTER TABLE "loads" ALTER COLUMN "tenant_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "loads_tenant_id_idx" ON "loads"("tenant_id");

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
