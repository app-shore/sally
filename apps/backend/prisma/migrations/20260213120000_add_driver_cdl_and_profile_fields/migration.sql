-- CreateEnum
CREATE TYPE "CdlClass" AS ENUM ('A', 'B', 'C');

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN "cdl_class" "CdlClass",
ADD COLUMN "endorsements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "home_terminal_city" VARCHAR(100),
ADD COLUMN "home_terminal_state" VARCHAR(2),
ADD COLUMN "hire_date" DATE,
ADD COLUMN "medical_card_expiry" DATE,
ADD COLUMN "emergency_contact_name" VARCHAR(255),
ADD COLUMN "emergency_contact_phone" VARCHAR(20),
ADD COLUMN "notes" TEXT;
