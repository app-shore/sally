-- Create missing integration tables

CREATE TYPE "IntegrationType" AS ENUM ('HOS', 'TMS', 'ELD', 'FUEL_CARD', 'TELEMATICS');
CREATE TYPE "IntegrationVendor" AS ENUM ('SAMSARA', 'PROJECT44', 'OMNITRACS', 'EFS', 'WEXFLEET', 'GEOTAB', 'MOTIVE');
CREATE TYPE "IntegrationStatus" AS ENUM ('NOT_CONFIGURED', 'ACTIVE', 'ERROR', 'DISABLED');
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE');

CREATE TABLE "integration_configs" (
    "id" SERIAL PRIMARY KEY,
    "integration_id" VARCHAR(50) UNIQUE NOT NULL,
    "tenant_id" INTEGER NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "integration_type" "IntegrationType" NOT NULL,
    "vendor" "IntegrationVendor" NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "is_enabled" BOOLEAN DEFAULT false NOT NULL,
    "status" "IntegrationStatus" DEFAULT 'NOT_CONFIGURED' NOT NULL,
    "credentials" JSONB,
    "sync_interval_seconds" INTEGER,
    "last_sync_at" TIMESTAMPTZ,
    "last_success_at" TIMESTAMPTZ,
    "last_error_at" TIMESTAMPTZ,
    "last_error_message" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE("tenant_id", "integration_type", "vendor")
);

CREATE TABLE "integration_sync_logs" (
    "id" SERIAL PRIMARY KEY,
    "integration_config_id" INTEGER NOT NULL REFERENCES "integration_configs"("id") ON DELETE CASCADE,
    "status" "SyncStatus" NOT NULL,
    "records_fetched" INTEGER DEFAULT 0 NOT NULL,
    "records_processed" INTEGER DEFAULT 0 NOT NULL,
    "records_failed" INTEGER DEFAULT 0 NOT NULL,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ,
    "metadata" JSONB
);

CREATE INDEX "integration_configs_tenant_id_idx" ON "integration_configs"("tenant_id");
CREATE INDEX "integration_configs_integration_type_idx" ON "integration_configs"("integration_type");
CREATE INDEX "integration_sync_logs_integration_config_id_idx" ON "integration_sync_logs"("integration_config_id");
CREATE INDEX "integration_sync_logs_started_at_idx" ON "integration_sync_logs"("started_at");
