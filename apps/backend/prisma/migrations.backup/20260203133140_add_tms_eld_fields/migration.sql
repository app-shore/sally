-- Add TMS/ELD fields to vehicles table
ALTER TABLE "vehicles" ADD COLUMN "make" VARCHAR(50);
ALTER TABLE "vehicles" ADD COLUMN "model" VARCHAR(50);
ALTER TABLE "vehicles" ADD COLUMN "year" INTEGER;
ALTER TABLE "vehicles" ADD COLUMN "vin" VARCHAR(50);
ALTER TABLE "vehicles" ADD COLUMN "license_plate" VARCHAR(20);
ALTER TABLE "vehicles" ADD COLUMN "eld_telematics_metadata" JSONB;

-- Add indexes for vehicle matching
CREATE INDEX "vehicles_vin_idx" ON "vehicles"("vin");
CREATE INDEX "vehicles_license_plate_idx" ON "vehicles"("license_plate");

-- Add TMS/ELD fields to drivers table
ALTER TABLE "drivers" ADD COLUMN "license_state" VARCHAR(2);
ALTER TABLE "drivers" ADD COLUMN "eld_metadata" JSONB;

-- Add indexes for driver matching
CREATE INDEX "drivers_phone_idx" ON "drivers"("phone");
CREATE INDEX "drivers_license_number_license_state_idx" ON "drivers"("license_number", "license_state");
