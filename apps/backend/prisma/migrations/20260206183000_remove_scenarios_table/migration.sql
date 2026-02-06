-- DropForeignKey
ALTER TABLE "scenarios" DROP CONSTRAINT IF EXISTS "scenarios_driver_ref_id_fkey";
ALTER TABLE "scenarios" DROP CONSTRAINT IF EXISTS "scenarios_vehicle_ref_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "scenarios";
