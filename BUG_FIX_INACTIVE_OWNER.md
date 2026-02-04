# Bug Fix: Owner Not Activated on Tenant Approval

## The Bug

When a super admin approves a tenant registration, the **OWNER user was not being activated**, causing login to fail with:

```json
{
  "message": "Account is deactivated. Please contact support.",
  "error": "Unauthorized",
  "statusCode": 401
}
```

## Root Cause

In `apps/backend/src/api/tenants/tenants.service.ts`, the `approveTenant()` function was only activating users with role `'ADMIN'`:

```typescript
// ❌ BEFORE (Bug)
await tx.user.updateMany({
  where: {
    tenantId: tenant.id,
    role: 'ADMIN',  // Only activates ADMIN, not OWNER!
  },
  data: {
    isActive: true,
  },
});
```

However, during tenant registration, the initial user is created with role `'OWNER'`, not `'ADMIN'`:

```typescript
// In registerTenant()
const ownerUser = await tx.user.create({
  data: {
    // ...
    role: 'OWNER', // Owner role - created during registration
    isActive: false, // Inactive until tenant approved
  },
});
```

## The Fix

Updated `approveTenant()` to activate both OWNER and ADMIN users:

```typescript
// ✅ AFTER (Fixed)
await tx.user.updateMany({
  where: {
    tenantId: tenant.id,
    role: { in: ['OWNER', 'ADMIN'] },  // Activates both OWNER and ADMIN
  },
  data: {
    isActive: true,
  },
});
```

## Impact

**Before Fix:**
1. Tenant registers (owner created with `isActive: false`)
2. Super admin approves tenant
3. Tenant activated, but owner user remains `isActive: false`
4. Owner tries to login → **401 Unauthorized** ❌

**After Fix:**
1. Tenant registers (owner created with `isActive: false`)
2. Super admin approves tenant
3. Tenant activated, **owner user activated** (`isActive: true`)
4. Owner can login successfully ✅

## Files Changed

- `apps/backend/src/api/tenants/tenants.service.ts` - Line 167

## Manual Fix for Existing Data

If you already have approved tenants with inactive owners, run this SQL script:

```bash
docker exec -i sally-postgres psql -U sally_user -d sally < scripts/fix-inactive-owners.sql
```

Or manually:

```sql
-- Activate all OWNER users for ACTIVE tenants
UPDATE users
SET is_active = true, updated_at = NOW()
WHERE tenant_id IN (
  SELECT id FROM tenants WHERE status = 'ACTIVE' AND is_active = true
)
AND role = 'OWNER'
AND is_active = false;
```

## Testing

### Test Case 1: New Tenant Registration & Approval

```bash
# 1. Register tenant via frontend
POST /api/v1/tenants/register
{
  "companyName": "Test Fleet",
  "email": "owner@testfleet.com",
  "firebaseUid": "...",
  ...
}

# 2. Check owner is inactive
SELECT email, role, is_active FROM users WHERE email = 'owner@testfleet.com';
# Expected: is_active = false

# 3. Approve tenant
POST /api/v1/tenants/{tenantId}/approve

# 4. Check owner is now active
SELECT email, role, is_active FROM users WHERE email = 'owner@testfleet.com';
# Expected: is_active = true ✅

# 5. Login should work
POST /api/v1/auth/firebase/exchange
# Expected: 200 OK with tokens ✅
```

### Test Case 2: Verify Admin Users Also Activated

If a tenant somehow has both OWNER and ADMIN users before approval:

```sql
-- Both should be activated after approval
SELECT email, role, is_active
FROM users
WHERE tenant_id = (SELECT id FROM tenants WHERE tenant_id = 'test_tenant')
AND role IN ('OWNER', 'ADMIN');

-- Expected: All is_active = true
```

## Deployment

### For CapRover

1. **Deploy the fix:**
```bash
git add apps/backend/src/api/tenants/tenants.service.ts
git commit -m "fix(tenants): activate OWNER users on tenant approval"
git push
```

2. **CapRover will auto-deploy**

3. **If you have existing affected tenants, run the fix script:**
```bash
docker exec -i sally-postgres psql -U sally_user -d sally < scripts/fix-inactive-owners.sql
```

## Summary

**Bug:** Owner not activated on tenant approval → Login fails with 401
**Fix:** Changed `role: 'ADMIN'` to `role: { in: ['OWNER', 'ADMIN'] }`
**Result:** Owners can now login after tenant approval ✅

---

**Status:** ✅ Fixed
**Files:**
- `apps/backend/src/api/tenants/tenants.service.ts` (bug fix)
- `scripts/fix-inactive-owners.sql` (data migration for existing cases)
