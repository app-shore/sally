-- Fix inactive owners for approved tenants
-- This script activates OWNER users for tenants that have been approved

-- Check current state
SELECT
  t.tenant_id,
  t.company_name,
  t.status,
  t.is_active as tenant_active,
  u.email,
  u.role,
  u.is_active as user_active
FROM tenants t
JOIN users u ON u.tenant_id = t.id
WHERE t.status = 'ACTIVE'
  AND u.role = 'OWNER'
  AND u.is_active = false;

-- Fix: Activate all OWNER users for ACTIVE tenants
UPDATE users
SET is_active = true, updated_at = NOW()
WHERE tenant_id IN (
  SELECT id FROM tenants WHERE status = 'ACTIVE' AND is_active = true
)
AND role = 'OWNER'
AND is_active = false;

-- Verify fix
SELECT
  t.tenant_id,
  t.company_name,
  t.status,
  u.email,
  u.role,
  u.is_active as user_active
FROM tenants t
JOIN users u ON u.tenant_id = t.id
WHERE t.status = 'ACTIVE' AND u.role = 'OWNER';
