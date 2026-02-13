-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'IN_SHOP', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('DRY_VAN', 'FLATBED', 'REEFER', 'STEP_DECK', 'POWER_ONLY', 'OTHER');

-- Backfill nulls before making columns required
UPDATE "vehicles" SET "vin" = 'UNKNOWN-' || "id" WHERE "vin" IS NULL;
UPDATE "vehicles" SET "fuel_capacity_gallons" = 150 WHERE "fuel_capacity_gallons" IS NULL;

-- AlterTable: make vin required and restrict to 17 chars
ALTER TABLE "vehicles" ALTER COLUMN "vin" SET NOT NULL;
ALTER TABLE "vehicles" ALTER COLUMN "vin" SET DATA TYPE VARCHAR(17);

-- AlterTable: make fuel_capacity_gallons required
ALTER TABLE "vehicles" ALTER COLUMN "fuel_capacity_gallons" SET NOT NULL;

-- AlterTable: add new columns
ALTER TABLE "vehicles" ADD COLUMN "license_plate_state" VARCHAR(2);
ALTER TABLE "vehicles" ADD COLUMN "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE';
ALTER TABLE "vehicles" ADD COLUMN "equipment_type" "EquipmentType" NOT NULL DEFAULT 'DRY_VAN';

-- Remove the default on equipment_type (required field, no default in schema)
ALTER TABLE "vehicles" ALTER COLUMN "equipment_type" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_tenant_id_key" ON "vehicles"("vin", "tenant_id");
