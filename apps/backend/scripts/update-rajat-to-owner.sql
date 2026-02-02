-- Update Rajat's role from ADMIN to OWNER

-- First, let's see the current state
SELECT
    id,
    user_id,
    email,
    first_name,
    last_name,
    role,
    tenant_id
FROM users
WHERE email = 'rajat@sally.com';

-- Update to OWNER role
UPDATE users
SET role = 'OWNER'
WHERE email = 'rajat@sally.com'
  AND role = 'ADMIN';

-- Verify the update
SELECT
    id,
    user_id,
    email,
    first_name,
    last_name,
    role,
    tenant_id,
    updated_at
FROM users
WHERE email = 'rajat@sally.com';
