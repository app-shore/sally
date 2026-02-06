/*
  Warnings:

  - Made the column `notify_new_tenants` on table `super_admin_preferences` required. This step will fail if there are existing NULL values in that column.
  - Made the column `notify_status_changes` on table `super_admin_preferences` required. This step will fail if there are existing NULL values in that column.
  - Made the column `notification_frequency` on table `super_admin_preferences` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `super_admin_preferences` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `super_admin_preferences` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "super_admin_preferences" DROP CONSTRAINT "fk_super_admin_preferences_user";

-- AlterTable
ALTER TABLE "super_admin_preferences" ALTER COLUMN "notify_new_tenants" SET NOT NULL,
ALTER COLUMN "notify_status_changes" SET NOT NULL,
ALTER COLUMN "notification_frequency" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "super_admin_preferences" ADD CONSTRAINT "super_admin_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_super_admin_preferences_user_id" RENAME TO "super_admin_preferences_user_id_idx";
