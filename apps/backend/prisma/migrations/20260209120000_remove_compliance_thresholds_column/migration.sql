-- Remove compliance_thresholds column from alert_configurations
-- These thresholds have been merged into the alert_types JSON column
-- as individual alert type entries (HOS_DRIVE_WARNING, HOS_DRIVE_CRITICAL, etc.)

ALTER TABLE "alert_configurations" DROP COLUMN IF EXISTS "compliance_thresholds";
