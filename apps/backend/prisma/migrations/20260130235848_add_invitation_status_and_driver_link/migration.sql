-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED');

-- AlterTable user_invitations
ALTER TABLE "user_invitations" ADD COLUMN "driver_id" INTEGER;
ALTER TABLE "user_invitations" ADD COLUMN "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "user_invitations" ADD COLUMN "cancellation_reason" TEXT;

-- CreateIndex
CREATE INDEX "user_invitations_status_idx" ON "user_invitations"("status");
CREATE INDEX "user_invitations_driver_id_idx" ON "user_invitations"("driver_id");

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
