-- Create Super Admin User (Manual SQL)
-- Run this on your CapRover database to create the super admin
-- Check if super admin already exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE role = 'SUPER_ADMIN') THEN
        RAISE NOTICE 'Super admin already exists. Skipping.';
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
            NULL,  -- Will set Firebase UID after creating Firebase user
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

        RAISE NOTICE 'Super admin created successfully!';
    END IF;
END $$;

-- Verify creation
SELECT
    user_id,
    email,
    role,
    firebase_uid,
    is_active,
    created_at
FROM users
WHERE role = 'SUPER_ADMIN';
