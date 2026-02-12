-- AlterTable: Add customer_id to user_invitations
ALTER TABLE "user_invitations" ADD COLUMN "customer_id" INTEGER;

-- CreateIndex
CREATE INDEX "user_invitations_customer_id_idx" ON "user_invitations"("customer_id");

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
