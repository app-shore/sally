-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DISPATCHER', 'DRIVER', 'ADMIN');

-- CreateTable
CREATE TABLE "tenants" (
    "id" SERIAL NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "subdomain" VARCHAR(100),
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "role" "UserRole" NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "password_changed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "driver_id" INTEGER,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "token_id" VARCHAR(50) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" SERIAL NOT NULL,
    "driver_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" SERIAL NOT NULL,
    "vehicle_id" VARCHAR(50) NOT NULL,
    "unit_number" VARCHAR(50) NOT NULL,
    "fuel_capacity_gallons" DOUBLE PRECISION,
    "current_fuel_gallons" DOUBLE PRECISION,
    "mpg" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_plans" (
    "id" SERIAL NOT NULL,
    "plan_id" VARCHAR(50) NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "plan_version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "optimization_priority" VARCHAR(50) NOT NULL DEFAULT 'minimize_time',
    "total_distance_miles" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "total_drive_time_hours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "total_on_duty_time_hours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "total_cost_estimate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "is_feasible" BOOLEAN NOT NULL DEFAULT true,
    "feasibility_issues" JSONB,
    "compliance_report" JSONB,
    "activated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "route_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_segments" (
    "id" SERIAL NOT NULL,
    "segment_id" VARCHAR(50) NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "sequence_order" INTEGER NOT NULL,
    "from_location" VARCHAR(200),
    "to_location" VARCHAR(200),
    "segment_type" VARCHAR(20) NOT NULL,
    "distance_miles" DOUBLE PRECISION,
    "drive_time_hours" DOUBLE PRECISION,
    "rest_type" VARCHAR(30),
    "rest_duration_hours" DOUBLE PRECISION,
    "rest_reason" TEXT,
    "fuel_gallons" DOUBLE PRECISION,
    "fuel_cost_estimate" DOUBLE PRECISION,
    "fuel_station_name" VARCHAR(200),
    "dock_duration_hours" DOUBLE PRECISION,
    "customer_name" VARCHAR(200),
    "hos_state_after" JSONB,
    "estimated_arrival" TIMESTAMPTZ,
    "estimated_departure" TIMESTAMPTZ,
    "status" VARCHAR(20) NOT NULL DEFAULT 'planned',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_plan_updates" (
    "id" SERIAL NOT NULL,
    "update_id" VARCHAR(50) NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "update_type" VARCHAR(50) NOT NULL,
    "triggered_at" TIMESTAMPTZ NOT NULL,
    "triggered_by" VARCHAR(50) NOT NULL,
    "trigger_data" JSONB,
    "replan_triggered" BOOLEAN NOT NULL DEFAULT false,
    "replan_reason" TEXT,
    "previous_plan_version" INTEGER,
    "new_plan_version" INTEGER,
    "impact_summary" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_plan_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stops" (
    "id" SERIAL NOT NULL,
    "stop_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(50),
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "location_type" VARCHAR(30) NOT NULL DEFAULT 'warehouse',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loads" (
    "id" SERIAL NOT NULL,
    "load_id" VARCHAR(50) NOT NULL,
    "load_number" VARCHAR(50) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "weight_lbs" DOUBLE PRECISION NOT NULL,
    "commodity_type" VARCHAR(100) NOT NULL,
    "special_requirements" TEXT,
    "customer_name" VARCHAR(200) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "loads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_stops" (
    "id" SERIAL NOT NULL,
    "load_id" INTEGER NOT NULL,
    "stop_id" INTEGER NOT NULL,
    "sequence_order" INTEGER NOT NULL,
    "action_type" VARCHAR(20) NOT NULL,
    "earliest_arrival" VARCHAR(10),
    "latest_arrival" VARCHAR(10),
    "estimated_dock_hours" DOUBLE PRECISION NOT NULL,
    "actual_dock_hours" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "load_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenarios" (
    "id" SERIAL NOT NULL,
    "scenario_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "driver_ref_id" INTEGER,
    "vehicle_ref_id" INTEGER,
    "driver_state_template" JSONB NOT NULL,
    "vehicle_state_template" JSONB NOT NULL,
    "stops_template" JSONB NOT NULL,
    "expected_rest_stops" INTEGER NOT NULL DEFAULT 0,
    "expected_fuel_stops" INTEGER NOT NULL DEFAULT 0,
    "expected_violations" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "event_id" VARCHAR(50) NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER,
    "event_data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" SERIAL NOT NULL,
    "recommendation_id" VARCHAR(50) NOT NULL,
    "driver_id" VARCHAR(50) NOT NULL,
    "recommendation" VARCHAR(30) NOT NULL,
    "duration" DOUBLE PRECISION,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "reasoning" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "alert_id" VARCHAR(50) NOT NULL,
    "driver_id" VARCHAR(50) NOT NULL,
    "route_plan_id" VARCHAR(50),
    "alert_type" VARCHAR(50) NOT NULL,
    "priority" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "recommended_action" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "acknowledged_at" TIMESTAMPTZ,
    "acknowledged_by" VARCHAR(50),
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_tenant_id_key" ON "tenants"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE INDEX "tenants_tenant_id_idx" ON "tenants"("tenant_id");

-- CreateIndex
CREATE INDEX "tenants_subdomain_idx" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "users_user_id_key" ON "users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_driver_id_key" ON "users"("driver_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_tenant_id_key" ON "users"("email", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_id_key" ON "refresh_tokens"("token_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "drivers_tenant_id_idx" ON "drivers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_driver_id_tenant_id_key" ON "drivers"("driver_id", "tenant_id");

-- CreateIndex
CREATE INDEX "vehicles_tenant_id_idx" ON "vehicles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vehicle_id_tenant_id_key" ON "vehicles"("vehicle_id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "route_plans_plan_id_key" ON "route_plans"("plan_id");

-- CreateIndex
CREATE INDEX "route_plans_driver_id_idx" ON "route_plans"("driver_id");

-- CreateIndex
CREATE INDEX "route_plans_is_active_idx" ON "route_plans"("is_active");

-- CreateIndex
CREATE INDEX "route_plans_tenant_id_idx" ON "route_plans"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "route_segments_segment_id_key" ON "route_segments"("segment_id");

-- CreateIndex
CREATE INDEX "route_segments_plan_id_sequence_order_idx" ON "route_segments"("plan_id", "sequence_order");

-- CreateIndex
CREATE UNIQUE INDEX "route_plan_updates_update_id_key" ON "route_plan_updates"("update_id");

-- CreateIndex
CREATE INDEX "route_plan_updates_plan_id_idx" ON "route_plan_updates"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "stops_stop_id_key" ON "stops"("stop_id");

-- CreateIndex
CREATE UNIQUE INDEX "loads_load_id_key" ON "loads"("load_id");

-- CreateIndex
CREATE INDEX "load_stops_load_id_idx" ON "load_stops"("load_id");

-- CreateIndex
CREATE UNIQUE INDEX "scenarios_scenario_id_key" ON "scenarios"("scenario_id");

-- CreateIndex
CREATE INDEX "scenarios_category_idx" ON "scenarios"("category");

-- CreateIndex
CREATE UNIQUE INDEX "events_event_id_key" ON "events"("event_id");

-- CreateIndex
CREATE INDEX "events_entity_type_entity_id_idx" ON "events"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "recommendations_recommendation_id_key" ON "recommendations"("recommendation_id");

-- CreateIndex
CREATE UNIQUE INDEX "alerts_alert_id_key" ON "alerts"("alert_id");

-- CreateIndex
CREATE INDEX "alerts_driver_id_idx" ON "alerts"("driver_id");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- CreateIndex
CREATE INDEX "alerts_priority_idx" ON "alerts"("priority");

-- CreateIndex
CREATE INDEX "alerts_created_at_idx" ON "alerts"("created_at");

-- CreateIndex
CREATE INDEX "alerts_tenant_id_idx" ON "alerts"("tenant_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_plans" ADD CONSTRAINT "route_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_plans" ADD CONSTRAINT "route_plans_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_plans" ADD CONSTRAINT "route_plans_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_segments" ADD CONSTRAINT "route_segments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "route_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_plan_updates" ADD CONSTRAINT "route_plan_updates_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "route_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_stops" ADD CONSTRAINT "load_stops_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "loads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_stops" ADD CONSTRAINT "load_stops_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_driver_ref_id_fkey" FOREIGN KEY ("driver_ref_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_vehicle_ref_id_fkey" FOREIGN KEY ("vehicle_ref_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
