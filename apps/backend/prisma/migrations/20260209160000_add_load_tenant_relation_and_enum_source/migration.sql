-- AlterTable: Change external_source from String to IntegrationVendor enum
ALTER TABLE "loads" DROP COLUMN "external_source",
ADD COLUMN     "external_source" "IntegrationVendor";
