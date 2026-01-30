-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FleetSize" AS ENUM ('1-10', '11-50', '51-100', '101-500', '500+');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'REMOVED_FROM_SOURCE');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SYNCED', 'REMOVED', 'SYNC_ERROR', 'MANUAL_ENTRY');

-- AlterTable tenants
ALTER TABLE "tenants" ADD COLUMN "status" "TenantStatus" NOT NULL DEFAULT 'PENDING_APPROVAL';
ALTER TABLE "tenants" ADD COLUMN "dot_number" VARCHAR(8);
ALTER TABLE "tenants" ADD COLUMN "fleet_size" "FleetSize";
ALTER TABLE "tenants" ADD COLUMN "approved_at" TIMESTAMPTZ;
ALTER TABLE "tenants" ADD COLUMN "approved_by" VARCHAR(100);
ALTER TABLE "tenants" ADD COLUMN "rejected_at" TIMESTAMPTZ;
ALTER TABLE "tenants" ADD COLUMN "rejection_reason" TEXT;
ALTER TABLE "tenants" ADD COLUMN "onboarding_completed_at" TIMESTAMPTZ;
ALTER TABLE "tenants" ADD COLUMN "onboarding_progress" JSONB;
ALTER TABLE "tenants" ALTER COLUMN "is_active" SET DEFAULT false;

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");
CREATE INDEX "tenants_dot_number_idx" ON "tenants"("dot_number");

-- AlterTable users
ALTER TABLE "users" ALTER COLUMN "tenant_id" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "firebase_uid" VARCHAR(128);
ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN "deleted_by" INTEGER;
ALTER TABLE "users" ADD COLUMN "deletion_reason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");
CREATE INDEX "users_firebase_uid_idx" ON "users"("firebase_uid");
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateTable user_invitations
CREATE TABLE "user_invitations" (
    "id" SERIAL NOT NULL,
    "invitation_id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" INTEGER NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" "UserRole" NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "invited_by" INTEGER NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "accepted_by_user_id" INTEGER,
    "cancelled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_invitation_id_key" ON "user_invitations"("invitation_id");
CREATE UNIQUE INDEX "user_invitations_token_key" ON "user_invitations"("token");
CREATE INDEX "user_invitations_tenant_id_idx" ON "user_invitations"("tenant_id");
CREATE INDEX "user_invitations_token_idx" ON "user_invitations"("token");
CREATE INDEX "user_invitations_email_idx" ON "user_invitations"("email");
CREATE INDEX "user_invitations_expires_at_idx" ON "user_invitations"("expires_at");

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for user soft delete
ALTER TABLE "users" ADD CONSTRAINT "users_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable drivers - drop unique constraint first
ALTER TABLE "drivers" DROP CONSTRAINT IF EXISTS "drivers_driver_id_tenant_id_key";
ALTER TABLE "drivers" DROP CONSTRAINT IF EXISTS "drivers_driver_id_key";

-- AlterTable drivers - add unique constraint back and new fields
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_driver_id_key" UNIQUE ("driver_id");
ALTER TABLE "drivers" ALTER COLUMN "name" TYPE VARCHAR(255);
ALTER TABLE "drivers" ALTER COLUMN "phone" TYPE VARCHAR(20);
ALTER TABLE "drivers" ADD COLUMN "status" "DriverStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION';
ALTER TABLE "drivers" ADD COLUMN "activated_at" TIMESTAMPTZ;
ALTER TABLE "drivers" ADD COLUMN "activated_by" INTEGER;
ALTER TABLE "drivers" ADD COLUMN "deactivated_at" TIMESTAMPTZ;
ALTER TABLE "drivers" ADD COLUMN "deactivated_by" INTEGER;
ALTER TABLE "drivers" ADD COLUMN "deactivation_reason" TEXT;
ALTER TABLE "drivers" ADD COLUMN "reactivated_at" TIMESTAMPTZ;
ALTER TABLE "drivers" ADD COLUMN "reactivated_by" INTEGER;
ALTER TABLE "drivers" ADD COLUMN "sync_status" "SyncStatus";
ALTER TABLE "drivers" ALTER COLUMN "hos_manual_override" TYPE JSONB USING (CASE WHEN "hos_manual_override" = true THEN '{"enabled": true}'::jsonb ELSE NULL END);
ALTER TABLE "drivers" ALTER COLUMN "hos_override_by" TYPE INTEGER USING ("hos_override_by"::INTEGER);

-- CreateIndex for drivers
CREATE INDEX "drivers_external_driver_id_idx" ON "drivers"("external_driver_id");
CREATE INDEX "drivers_status_idx" ON "drivers"("status");
CREATE INDEX "drivers_sync_status_idx" ON "drivers"("sync_status");

-- AddForeignKey for driver activation tracking
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_activated_by_fkey" FOREIGN KEY ("activated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_deactivated_by_fkey" FOREIGN KEY ("deactivated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_reactivated_by_fkey" FOREIGN KEY ("reactivated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
