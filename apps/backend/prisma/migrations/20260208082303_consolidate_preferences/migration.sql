/*
  Warnings:

  - You are about to drop the column `alert_methods` on the `user_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `desktop_notifications` on the `user_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `email_notifications` on the `user_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `sms_notifications` on the `user_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `sound_enabled` on the `user_preferences` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ROUTE_PLANNED';
ALTER TYPE "NotificationType" ADD VALUE 'ROUTE_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'ROUTE_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'INTEGRATION_SYNCED';
ALTER TYPE "NotificationType" ADD VALUE 'INTEGRATION_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'USER_JOINED';
ALTER TYPE "NotificationType" ADD VALUE 'ROLE_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'DRIVER_ACTIVATED';
ALTER TYPE "NotificationType" ADD VALUE 'SETTINGS_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'LOAD_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'LOAD_STATUS_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'SCHEDULE_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'DISPATCH_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE 'ACKNOWLEDGMENT_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'ACKNOWLEDGMENT_RECEIVED';

-- DropIndex
DROP INDEX "alerts_created_at_idx";

-- DropIndex
DROP INDEX "alerts_driver_id_idx";

-- DropIndex
DROP INDEX "alerts_priority_idx";

-- DropIndex
DROP INDEX "alerts_status_idx";

-- DropIndex
DROP INDEX "alerts_tenant_id_idx";

-- AlterTable
ALTER TABLE "alerts" ADD COLUMN     "auto_resolve_reason" TEXT,
ADD COLUMN     "auto_resolved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "category" VARCHAR(30) NOT NULL DEFAULT 'system',
ADD COLUMN     "dedup_key" VARCHAR(200),
ADD COLUMN     "escalated_at" TIMESTAMPTZ,
ADD COLUMN     "escalation_level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "group_key" VARCHAR(200),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "parent_alert_id" VARCHAR(50),
ADD COLUMN     "resolution_notes" TEXT,
ADD COLUMN     "resolved_by" VARCHAR(50),
ADD COLUMN     "snoozed_until" TIMESTAMPTZ,
ADD COLUMN     "vehicle_id" VARCHAR(50),
ALTER COLUMN "recommended_action" DROP NOT NULL;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "action_label" VARCHAR(100),
ADD COLUMN     "action_url" VARCHAR(500),
ADD COLUMN     "category" VARCHAR(30),
ADD COLUMN     "dismissed_at" TIMESTAMPTZ,
ADD COLUMN     "icon_type" VARCHAR(30),
ADD COLUMN     "message" TEXT,
ADD COLUMN     "read_at" TIMESTAMPTZ,
ADD COLUMN     "title" VARCHAR(255);

-- AlterTable
ALTER TABLE "user_preferences" DROP COLUMN "alert_methods",
DROP COLUMN "desktop_notifications",
DROP COLUMN "email_notifications",
DROP COLUMN "sms_notifications",
DROP COLUMN "sound_enabled",
ADD COLUMN     "alert_channels" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "browser_notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "default_snooze_duration" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "flash_tab_on_critical" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "quiet_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sound_settings" JSONB NOT NULL DEFAULT '{"critical":true,"high":true,"medium":false,"low":false}',
ALTER COLUMN "min_alert_priority" SET DEFAULT 'LOW',
ALTER COLUMN "alert_categories" SET DEFAULT '["hos","delay","route","driver","vehicle","external"]';

-- CreateTable
CREATE TABLE "alert_notes" (
    "id" SERIAL NOT NULL,
    "note_id" VARCHAR(50) NOT NULL,
    "alert_id" VARCHAR(50) NOT NULL,
    "author_id" VARCHAR(50) NOT NULL,
    "author_name" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_configurations" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "alert_types" JSONB NOT NULL,
    "escalation_policy" JSONB NOT NULL,
    "grouping_config" JSONB NOT NULL,
    "default_channels" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "alert_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" VARCHAR(200) NOT NULL,
    "auth" VARCHAR(100) NOT NULL,
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alert_notes_note_id_key" ON "alert_notes"("note_id");

-- CreateIndex
CREATE INDEX "alert_notes_alert_id_created_at_idx" ON "alert_notes"("alert_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "alert_configurations_tenant_id_key" ON "alert_configurations"("tenant_id");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_user_id_endpoint_key" ON "push_subscriptions"("user_id", "endpoint");

-- CreateIndex
CREATE INDEX "alerts_tenant_id_status_priority_created_at_idx" ON "alerts"("tenant_id", "status", "priority", "created_at");

-- CreateIndex
CREATE INDEX "alerts_tenant_id_created_at_idx" ON "alerts"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "alerts_dedup_key_status_idx" ON "alerts"("dedup_key", "status");

-- CreateIndex
CREATE INDEX "alerts_driver_id_status_idx" ON "alerts"("driver_id", "status");

-- CreateIndex
CREATE INDEX "alerts_route_plan_id_status_idx" ON "alerts"("route_plan_id", "status");

-- CreateIndex
CREATE INDEX "alerts_parent_alert_id_idx" ON "alerts"("parent_alert_id");

-- CreateIndex
CREATE INDEX "alerts_group_key_idx" ON "alerts"("group_key");

-- CreateIndex
CREATE INDEX "alerts_snoozed_until_idx" ON "alerts"("snoozed_until");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_status_idx" ON "notifications"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "notifications_type_status_idx" ON "notifications"("type", "status");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_dismissed_at_idx" ON "notifications"("user_id", "read_at", "dismissed_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_category_created_at_idx" ON "notifications"("user_id", "category", "created_at");

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_parent_alert_id_fkey" FOREIGN KEY ("parent_alert_id") REFERENCES "alerts"("alert_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_notes" ADD CONSTRAINT "alert_notes_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("alert_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_configurations" ADD CONSTRAINT "alert_configurations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
