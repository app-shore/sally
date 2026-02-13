-- CreateTable
CREATE TABLE "reference_data" (
  "id" SERIAL NOT NULL,
  "category" VARCHAR(50) NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "label" VARCHAR(100) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reference_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reference_data_category_code_key" ON "reference_data"("category", "code");

-- CreateIndex
CREATE INDEX "reference_data_category_is_active_idx" ON "reference_data"("category", "is_active");
