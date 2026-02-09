-- AlterTable
ALTER TABLE "alert_configurations" ADD COLUMN "compliance_thresholds" JSONB NOT NULL DEFAULT '{}';
