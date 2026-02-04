-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DISPATCHER', 'DRIVER', 'ADMIN', 'OWNER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FleetSize" AS ENUM ('1-10', '11-50', '51-100', '101-500', '500+');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'REMOVED_FROM_SOURCE');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SYNCED', 'REMOVED', 'SYNC_ERROR', 'MANUAL_ENTRY');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('TMS', 'HOS_ELD', 'FUEL_PRICE', 'WEATHER', 'TELEMATICS');

-- CreateEnum
CREATE TYPE "IntegrationVendor" AS ENUM ('MCLEOD_TMS', 'TMW_TMS', 'PROJECT44_TMS', 'SAMSARA_ELD', 'KEEPTRUCKIN_ELD', 'MOTIVE_ELD', 'GASBUDDY_FUEL', 'FUELFINDER_FUEL', 'OPENWEATHER');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('NOT_CONFIGURED', 'CONFIGURED', 'ACTIVE', 'ERROR', 'DISABLED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" SERIAL NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "subdomain" VARCHAR(100),
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(50),
    "status" "TenantStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "dot_number" VARCHAR(8),
    "fleet_size" "FleetSize",
    "approved_at" TIMESTAMPTZ,
    "approved_by" VARCHAR(100),
    "rejected_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "onboarding_completed_at" TIMESTAMPTZ,
    "onboarding_progress" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(50) NOT NULL,
    "tenant_id" INTEGER,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" "UserRole" NOT NULL,
    "firebase_uid" VARCHAR(128),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "driver_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "password_changed_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" INTEGER,
    "deletion_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

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
CREATE TABLE "user_invitations" (
    "id" SERIAL NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" "UserRole" NOT NULL,
    "driver_id" INTEGER,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "invited_by" INTEGER NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "accepted_at" TIMESTAMPTZ,
    "accepted_by_user_id" INTEGER,
    "cancelled_at" TIMESTAMPTZ,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" SERIAL NOT NULL,
    "driver_id" VARCHAR(50) NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "license_number" VARCHAR(50),
    "license_state" VARCHAR(2),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "status" "DriverStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "activated_at" TIMESTAMPTZ,
    "activated_by" INTEGER,
    "deactivated_at" TIMESTAMPTZ,
    "deactivated_by" INTEGER,
    "deactivation_reason" TEXT,
    "reactivated_at" TIMESTAMPTZ,
    "reactivated_by" INTEGER,
    "external_driver_id" VARCHAR(100),
    "external_source" VARCHAR(50),
    "last_synced_at" TIMESTAMPTZ,
    "sync_status" "SyncStatus",
    "hos_data" JSONB,
    "hos_data_synced_at" TIMESTAMPTZ,
    "hos_data_source" VARCHAR(50),
    "hos_manual_override" JSONB,
    "hos_override_by" INTEGER,
    "hos_override_at" TIMESTAMPTZ,
    "hos_override_reason" TEXT,
    "eld_metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

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
    "external_vehicle_id" VARCHAR(100),
    "external_source" VARCHAR(50),
    "last_synced_at" TIMESTAMPTZ,
    "make" VARCHAR(50),
    "model" VARCHAR(50),
    "year" INTEGER,
    "vin" VARCHAR(50),
    "license_plate" VARCHAR(20),
    "eld_telematics_metadata" JSONB,
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
    "external_load_id" VARCHAR(100),
    "external_source" VARCHAR(50),
    "last_synced_at" TIMESTAMPTZ,

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

-- CreateTable
CREATE TABLE "integration_configs" (
    "id" SERIAL NOT NULL,
    "integration_id" VARCHAR(50) NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "integration_type" "IntegrationType" NOT NULL,
    "vendor" "IntegrationVendor" NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "credentials" JSONB,
    "sync_interval_seconds" INTEGER,
    "last_sync_at" TIMESTAMPTZ,
    "last_success_at" TIMESTAMPTZ,
    "last_error_at" TIMESTAMPTZ,
    "last_error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sync_logs" (
    "id" SERIAL NOT NULL,
    "log_id" VARCHAR(50) NOT NULL,
    "integration_id" INTEGER NOT NULL,
    "sync_type" VARCHAR(20) NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ,
    "status" VARCHAR(20) NOT NULL,
    "records_processed" INTEGER NOT NULL DEFAULT 0,
    "records_created" INTEGER NOT NULL DEFAULT 0,
    "records_updated" INTEGER NOT NULL DEFAULT 0,
    "error_details" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "distance_unit" VARCHAR(20) NOT NULL DEFAULT 'MILES',
    "time_format" VARCHAR(10) NOT NULL DEFAULT '12H',
    "temperature_unit" VARCHAR(5) NOT NULL DEFAULT 'F',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'America/New_York',
    "date_format" VARCHAR(20) NOT NULL DEFAULT 'MM/DD/YYYY',
    "auto_refresh_interval" INTEGER NOT NULL DEFAULT 30,
    "default_view" VARCHAR(30) NOT NULL DEFAULT 'OVERVIEW',
    "compact_mode" BOOLEAN NOT NULL DEFAULT false,
    "high_contrast_mode" BOOLEAN NOT NULL DEFAULT false,
    "alert_methods" JSONB NOT NULL DEFAULT '[]',
    "min_alert_priority" VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    "alert_categories" JSONB NOT NULL DEFAULT '["hos","delay","route","vehicle","weather"]',
    "quiet_hours_start" VARCHAR(10),
    "quiet_hours_end" VARCHAR(10),
    "email_digest_frequency" VARCHAR(20) NOT NULL DEFAULT 'NEVER',
    "desktop_notifications" BOOLEAN NOT NULL DEFAULT true,
    "sound_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_notifications" BOOLEAN NOT NULL DEFAULT false,
    "sms_notifications" BOOLEAN NOT NULL DEFAULT false,
    "font_size" VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    "reduce_motion" BOOLEAN NOT NULL DEFAULT false,
    "screen_reader_optimized" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatcher_preferences" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "default_drive_hours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "default_on_duty_hours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "default_since_break_hours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "drive_hours_warning_pct" INTEGER NOT NULL DEFAULT 75,
    "drive_hours_critical_pct" INTEGER NOT NULL DEFAULT 90,
    "on_duty_warning_pct" INTEGER NOT NULL DEFAULT 75,
    "on_duty_critical_pct" INTEGER NOT NULL DEFAULT 90,
    "since_break_warning_pct" INTEGER NOT NULL DEFAULT 75,
    "since_break_critical_pct" INTEGER NOT NULL DEFAULT 90,
    "default_optimization_mode" VARCHAR(30) NOT NULL DEFAULT 'BALANCE',
    "cost_per_mile" DOUBLE PRECISION NOT NULL DEFAULT 1.85,
    "labor_cost_per_hour" DOUBLE PRECISION NOT NULL DEFAULT 25.0,
    "prefer_full_rest" BOOLEAN NOT NULL DEFAULT true,
    "rest_stop_buffer" INTEGER NOT NULL DEFAULT 30,
    "allow_dock_rest" BOOLEAN NOT NULL DEFAULT true,
    "min_rest_duration" INTEGER NOT NULL DEFAULT 7,
    "fuel_price_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "max_fuel_detour" INTEGER NOT NULL DEFAULT 10,
    "min_fuel_savings" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "default_load_assignment" VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    "default_driver_selection" VARCHAR(30) NOT NULL DEFAULT 'AUTO_SUGGEST',
    "default_vehicle_selection" VARCHAR(30) NOT NULL DEFAULT 'AUTO_ASSIGN',
    "delay_threshold_minutes" INTEGER NOT NULL DEFAULT 30,
    "hos_approaching_pct" INTEGER NOT NULL DEFAULT 85,
    "cost_overrun_pct" INTEGER NOT NULL DEFAULT 10,
    "report_timezone" VARCHAR(100) NOT NULL DEFAULT 'America/New_York',
    "include_map_in_reports" BOOLEAN NOT NULL DEFAULT true,
    "report_email_recipients" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "dispatcher_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_preferences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "driver_id" INTEGER,
    "preferred_rest_stops" JSONB NOT NULL DEFAULT '[]',
    "preferred_fuel_stops" JSONB NOT NULL DEFAULT '[]',
    "preferred_break_duration" INTEGER NOT NULL DEFAULT 30,
    "break_reminder_advance" INTEGER NOT NULL DEFAULT 30,
    "timeline_view" VARCHAR(20) NOT NULL DEFAULT 'VERTICAL',
    "show_rest_reasoning" BOOLEAN NOT NULL DEFAULT true,
    "show_cost_details" BOOLEAN NOT NULL DEFAULT false,
    "large_text_mode" BOOLEAN NOT NULL DEFAULT false,
    "offline_mode" BOOLEAN NOT NULL DEFAULT false,
    "data_usage_mode" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "emergency_contact" VARCHAR(50),
    "preferred_contact_method" VARCHAR(20) NOT NULL DEFAULT 'IN_APP',
    "language_preference" VARCHAR(10) NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "driver_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "category" VARCHAR(50) NOT NULL DEFAULT 'general',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "tenants_dot_number_idx" ON "tenants"("dot_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_user_id_key" ON "users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_driver_id_key" ON "users"("driver_id");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_firebase_uid_idx" ON "users"("firebase_uid");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_id_key" ON "refresh_tokens"("token_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_invitation_id_key" ON "user_invitations"("invitation_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_token_key" ON "user_invitations"("token");

-- CreateIndex
CREATE INDEX "user_invitations_tenant_id_idx" ON "user_invitations"("tenant_id");

-- CreateIndex
CREATE INDEX "user_invitations_token_idx" ON "user_invitations"("token");

-- CreateIndex
CREATE INDEX "user_invitations_email_idx" ON "user_invitations"("email");

-- CreateIndex
CREATE INDEX "user_invitations_expires_at_idx" ON "user_invitations"("expires_at");

-- CreateIndex
CREATE INDEX "user_invitations_status_idx" ON "user_invitations"("status");

-- CreateIndex
CREATE INDEX "user_invitations_driver_id_idx" ON "user_invitations"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_driver_id_key" ON "drivers"("driver_id");

-- CreateIndex
CREATE INDEX "drivers_tenant_id_idx" ON "drivers"("tenant_id");

-- CreateIndex
CREATE INDEX "drivers_external_driver_id_idx" ON "drivers"("external_driver_id");

-- CreateIndex
CREATE INDEX "drivers_status_idx" ON "drivers"("status");

-- CreateIndex
CREATE INDEX "drivers_sync_status_idx" ON "drivers"("sync_status");

-- CreateIndex
CREATE INDEX "drivers_is_active_idx" ON "drivers"("is_active");

-- CreateIndex
CREATE INDEX "drivers_phone_idx" ON "drivers"("phone");

-- CreateIndex
CREATE INDEX "drivers_license_number_license_state_idx" ON "drivers"("license_number", "license_state");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_driver_id_tenant_id_key" ON "drivers"("driver_id", "tenant_id");

-- CreateIndex
CREATE INDEX "vehicles_tenant_id_idx" ON "vehicles"("tenant_id");

-- CreateIndex
CREATE INDEX "vehicles_vin_idx" ON "vehicles"("vin");

-- CreateIndex
CREATE INDEX "vehicles_license_plate_idx" ON "vehicles"("license_plate");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vehicle_id_tenant_id_key" ON "vehicles"("vehicle_id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_external_vehicle_id_tenant_id_key" ON "vehicles"("external_vehicle_id", "tenant_id");

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
CREATE UNIQUE INDEX "loads_external_load_id_key" ON "loads"("external_load_id");

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

-- CreateIndex
CREATE UNIQUE INDEX "integration_configs_integration_id_key" ON "integration_configs"("integration_id");

-- CreateIndex
CREATE INDEX "integration_configs_tenant_id_idx" ON "integration_configs"("tenant_id");

-- CreateIndex
CREATE INDEX "integration_configs_status_idx" ON "integration_configs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "integration_configs_tenant_id_integration_type_vendor_key" ON "integration_configs"("tenant_id", "integration_type", "vendor");

-- CreateIndex
CREATE UNIQUE INDEX "integration_sync_logs_log_id_key" ON "integration_sync_logs"("log_id");

-- CreateIndex
CREATE INDEX "integration_sync_logs_integration_id_started_at_idx" ON "integration_sync_logs"("integration_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "user_preferences_user_id_idx" ON "user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "dispatcher_preferences_tenant_id_key" ON "dispatcher_preferences"("tenant_id");

-- CreateIndex
CREATE INDEX "dispatcher_preferences_tenant_id_idx" ON "dispatcher_preferences"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_preferences_user_id_key" ON "driver_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_preferences_driver_id_key" ON "driver_preferences"("driver_id");

-- CreateIndex
CREATE INDEX "driver_preferences_user_id_idx" ON "driver_preferences"("user_id");

-- CreateIndex
CREATE INDEX "driver_preferences_driver_id_idx" ON "driver_preferences"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flags_key_idx" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flags_category_idx" ON "feature_flags"("category");

-- CreateIndex
CREATE INDEX "feature_flags_enabled_idx" ON "feature_flags"("enabled");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_activated_by_fkey" FOREIGN KEY ("activated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_deactivated_by_fkey" FOREIGN KEY ("deactivated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_reactivated_by_fkey" FOREIGN KEY ("reactivated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sync_logs" ADD CONSTRAINT "integration_sync_logs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integration_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatcher_preferences" ADD CONSTRAINT "dispatcher_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_preferences" ADD CONSTRAINT "driver_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_preferences" ADD CONSTRAINT "driver_preferences_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
