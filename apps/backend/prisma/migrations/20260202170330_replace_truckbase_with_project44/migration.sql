-- AlterEnum: Replace TRUCKBASE_TMS with PROJECT44_TMS in IntegrationVendor enum
-- This migration updates existing integrations and modifies the enum

-- Step 1: Update any existing TRUCKBASE_TMS integrations to PROJECT44_TMS
UPDATE "IntegrationConfig"
SET "vendor" = 'PROJECT44_TMS'
WHERE "vendor" = 'TRUCKBASE_TMS';

-- Step 2: Alter the enum to replace TRUCKBASE_TMS with PROJECT44_TMS
-- Note: In PostgreSQL, we need to:
-- 1. Add the new value if it doesn't exist
-- 2. Update existing data
-- 3. Remove the old value (requires recreating the enum)

-- Create a new enum type with the updated values
CREATE TYPE "IntegrationVendor_new" AS ENUM (
  'MCLEOD_TMS',
  'TMW_TMS',
  'PROJECT44_TMS',
  'SAMSARA_ELD',
  'KEEPTRUCKIN_ELD',
  'MOTIVE_ELD',
  'GASBUDDY_FUEL',
  'FUELFINDER_FUEL',
  'OPENWEATHER'
);

-- Update the table to use the new enum (already done in Step 1, but cast to new type)
ALTER TABLE "IntegrationConfig"
  ALTER COLUMN "vendor" TYPE "IntegrationVendor_new"
  USING ("vendor"::text::"IntegrationVendor_new");

-- Drop the old enum
DROP TYPE "IntegrationVendor";

-- Rename the new enum to the original name
ALTER TYPE "IntegrationVendor_new" RENAME TO "IntegrationVendor";
