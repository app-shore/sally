-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "current_hours_driven" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "current_hours_since_break" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "current_on_duty_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "cycle_days_data" JSONB,
ADD COLUMN     "cycle_hours_used" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "home_terminal_timezone" VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
ADD COLUMN     "last_restart_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "loads" ADD COLUMN     "tenant_id" INTEGER;

-- AlterTable
ALTER TABLE "route_plans" ADD COLUMN     "cancelled_at" TIMESTAMPTZ,
ADD COLUMN     "completed_at" TIMESTAMPTZ,
ADD COLUMN     "daily_breakdown" JSONB,
ADD COLUMN     "departure_time" TIMESTAMPTZ,
ADD COLUMN     "dispatcher_params" JSONB,
ADD COLUMN     "estimated_arrival" TIMESTAMPTZ,
ADD COLUMN     "total_driving_days" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "total_trip_time_hours" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "route_segments" ADD COLUMN     "action_type" VARCHAR(20),
ADD COLUMN     "actual_arrival" TIMESTAMPTZ,
ADD COLUMN     "actual_departure" TIMESTAMPTZ,
ADD COLUMN     "appointment_window" JSONB,
ADD COLUMN     "detour_miles" DOUBLE PRECISION,
ADD COLUMN     "from_lat" DOUBLE PRECISION,
ADD COLUMN     "from_lon" DOUBLE PRECISION,
ADD COLUMN     "fuel_price_per_gallon" DOUBLE PRECISION,
ADD COLUMN     "fuel_state_after" JSONB,
ADD COLUMN     "is_docktime_converted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "route_geometry" TEXT,
ADD COLUMN     "stop_id" INTEGER,
ADD COLUMN     "timezone" VARCHAR(50),
ADD COLUMN     "to_lat" DOUBLE PRECISION,
ADD COLUMN     "to_lon" DOUBLE PRECISION,
ADD COLUMN     "weather_alerts" JSONB;

-- AlterTable
ALTER TABLE "stops" ADD COLUMN     "amenities" JSONB,
ADD COLUMN     "fuel_brand" VARCHAR(50),
ADD COLUMN     "fuel_price_per_gallon" DOUBLE PRECISION,
ADD COLUMN     "fuel_price_updated_at" TIMESTAMPTZ,
ADD COLUMN     "parking_spaces" INTEGER,
ADD COLUMN     "tenant_id" INTEGER,
ADD COLUMN     "timezone" VARCHAR(50),
ADD COLUMN     "zip_code" VARCHAR(10);

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "gross_weight_lbs" DOUBLE PRECISION,
ADD COLUMN     "has_sleeper_berth" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "route_plan_loads" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "load_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_plan_loads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "route_plan_loads_plan_id_idx" ON "route_plan_loads"("plan_id");

-- CreateIndex
CREATE INDEX "route_plan_loads_load_id_idx" ON "route_plan_loads"("load_id");

-- CreateIndex
CREATE UNIQUE INDEX "route_plan_loads_plan_id_load_id_key" ON "route_plan_loads"("plan_id", "load_id");

-- AddForeignKey
ALTER TABLE "route_segments" ADD CONSTRAINT "route_segments_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_plan_loads" ADD CONSTRAINT "route_plan_loads_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "route_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_plan_loads" ADD CONSTRAINT "route_plan_loads_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "loads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
