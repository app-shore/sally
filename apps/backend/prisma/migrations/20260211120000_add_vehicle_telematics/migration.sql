-- CreateTable
CREATE TABLE "vehicle_telematics" (
    "id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "heading" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "odometer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuel_level" DOUBLE PRECISION,
    "engine_running" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vehicle_telematics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_telematics_vehicle_id_key" ON "vehicle_telematics"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_telematics_tenant_id_idx" ON "vehicle_telematics"("tenant_id");

-- CreateIndex
CREATE INDEX "vehicle_telematics_timestamp_idx" ON "vehicle_telematics"("timestamp");

-- AddForeignKey
ALTER TABLE "vehicle_telematics" ADD CONSTRAINT "vehicle_telematics_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_telematics" ADD CONSTRAINT "vehicle_telematics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
