-- AlterTable
ALTER TABLE "operations_settings" DROP COLUMN "drive_hours_warning_pct",
DROP COLUMN "drive_hours_critical_pct",
DROP COLUMN "on_duty_warning_pct",
DROP COLUMN "on_duty_critical_pct",
DROP COLUMN "since_break_warning_pct",
DROP COLUMN "since_break_critical_pct",
DROP COLUMN "delay_threshold_minutes",
DROP COLUMN "hos_approaching_pct",
DROP COLUMN "cost_overrun_pct";
