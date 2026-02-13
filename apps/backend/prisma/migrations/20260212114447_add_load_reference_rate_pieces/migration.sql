-- AlterTable
ALTER TABLE "loads" ADD COLUMN     "pieces" INTEGER,
ADD COLUMN     "rate_cents" INTEGER,
ADD COLUMN     "reference_number" VARCHAR(100);
