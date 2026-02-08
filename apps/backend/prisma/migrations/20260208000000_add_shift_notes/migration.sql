-- CreateTable
CREATE TABLE "shift_notes" (
    "id" SERIAL NOT NULL,
    "note_id" VARCHAR(50) NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "shift_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shift_notes_note_id_key" ON "shift_notes"("note_id");

-- CreateIndex
CREATE INDEX "shift_notes_tenant_id_deleted_at_expires_at_idx" ON "shift_notes"("tenant_id", "deleted_at", "expires_at");

-- AddForeignKey
ALTER TABLE "shift_notes" ADD CONSTRAINT "shift_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_notes" ADD CONSTRAINT "shift_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
