-- ============================================================================
-- SALLY Database Seed Script (Manual SQL)
-- Run this on your CapRover database to seed super admin and feature flags
-- ============================================================================
-- ============================================================================
-- 1. CREATE SUPER ADMIN USER
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE role = 'SUPER_ADMIN') THEN
        RAISE NOTICE '⏭️  Super admin already exists. Skipping.';
    ELSE
        -- Insert super admin user
        INSERT INTO users (
            user_id,
            email,
            first_name,
            last_name,
            role,
            tenant_id,
            firebase_uid,
            is_active,
            email_verified,
            created_at,
            updated_at
        ) VALUES (
            'user_sally_superadmin_001',
            'admin@sally.com',
            'SALLY',
            'Admin',
            'SUPER_ADMIN',
            NULL,  -- No tenant for super admin
            NULL,  -- Set Firebase UID manually after creating Firebase user
            true,
            true,
            NOW(),
            NOW()
        );

        -- Create user preferences
        INSERT INTO user_preferences (
            user_id,
            created_at,
            updated_at
        ) VALUES (
            (SELECT id FROM users WHERE email = 'admin@sally.com'),
            NOW(),
            NOW()
        );

        RAISE NOTICE '✅ Super admin created successfully!';
    END IF;
END $$;

-- ============================================================================
-- 2. SEED FEATURE FLAGS
-- ============================================================================
-- Dispatcher features
INSERT INTO
	feature_flags (id, key, name, description, enabled, category, created_at, updated_at)
VALUES
	('ff_route_planning', 'route_planning_enabled', 'Route Planning', 'Intelligent route planning with HOS compliance and automatic rest/fuel stop insertion', FALSE, 'dispatcher', NOW(), NOW()),
	('ff_live_tracking', 'live_tracking_enabled', 'Live Route Tracking', 'Real-time monitoring of active routes with progress tracking and status updates', FALSE, 'dispatcher', NOW(), NOW()),
	('ff_command_center', 'command_center_enabled', 'Dispatcher Command Center', 'Mission control dashboard with fleet overview, quick actions, and activity feed', FALSE, 'dispatcher', NOW(), NOW()),
	('ff_alerts_system', 'alerts_system_enabled', 'Automated Alert System', 'Proactive dispatcher notifications for HOS, delays, and critical events', FALSE, 'dispatcher', NOW(), NOW()),
	('ff_continuous_monitoring', 'continuous_monitoring_enabled', 'Continuous Monitoring', 'Background service monitoring 14 trigger types every 60 seconds', FALSE, 'dispatcher', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Driver features
INSERT INTO feature_flags (id, key, name, description, enabled, category, created_at, updated_at)
VALUES
    ('ff_driver_dashboard', 'driver_dashboard_enabled', 'Driver Dashboard', 'Driver portal with route overview and HOS compliance tracking', false, 'driver', NOW(), NOW()),
    ('ff_driver_current_route', 'driver_current_route_enabled', 'Driver Current Route View', 'Real-time route timeline with stop-by-stop guidance and HOS status', false, 'driver', NOW(), NOW()),
    ('ff_driver_messages', 'driver_messages_enabled', 'Driver Messages', 'Communication channel for dispatch messages and route updates', false, 'driver', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Admin features
INSERT INTO feature_flags (id, key, name, description, enabled, category, created_at, updated_at)
VALUES
    ('ff_external_integrations', 'external_integrations_enabled', 'External Integrations', 'Connect to Samsara ELD, TMS, fuel price APIs, and weather services', false, 'admin', NOW(), NOW()),
    ('ff_fleet_management', 'fleet_management_enabled', 'Fleet Management', 'CRUD interface for managing drivers, vehicles, and fleet settings', false, 'admin', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 3. VERIFY SEEDING
-- ============================================================================

-- Verify super admin
SELECT
    user_id,
    email,
    role,
    firebase_uid,
    is_active,
    created_at
FROM users
WHERE role = 'SUPER_ADMIN';

-- Count feature flags
SELECT COUNT(*) as feature_flag_count FROM feature_flags;

-- List all feature flags
SELECT
    key,
    name,
    enabled,
    category
FROM feature_flags
ORDER BY category, key;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

-- After running this script:
-- 1. Create Firebase user for admin@sally.com (via Firebase Console)
-- 2. Copy the Firebase UID
-- 3. Update the super admin record:
--    UPDATE users SET firebase_uid = 'your-firebase-uid-here' WHERE email = 'admin@sally.com';
-- 4. Login at https://sally.apps.appshore.in with admin@sally.com
-- ============================================================================
