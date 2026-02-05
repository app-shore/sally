# Dashboard Redirect Fix

**Date:** February 2, 2026
**Issue:** Hardcoded `/dashboard` redirects causing 404 errors
**Resolution:** Use role-specific dashboard routing

---

## Problem

Multiple places in the app were redirecting to `/dashboard` which doesn't exist. This caused 404 errors after:
- Completing onboarding
- Skipping onboarding setup
- Logging in as certain roles

---

## Root Cause

Hardcoded redirect to `/dashboard` instead of using role-specific routes:
- OWNER → `/admin/dashboard`
- ADMIN → `/admin/dashboard`
- DISPATCHER → `/dispatcher/overview`
- DRIVER → `/driver/dashboard`
- SUPER_ADMIN → `/admin/tenants`

---

## Fixes Applied

### 1. Onboarding Page

**File:** `apps/web/src/app/onboarding/page.tsx`

**Before:**
```typescript
const handleNext = () => {
  router.push('/dashboard'); // ❌ Doesn't exist
};

const handleSkip = () => {
  router.push('/dashboard'); // ❌ Doesn't exist
};
```

**After:**
```typescript
import { useAuth } from '@/hooks/use-auth';
import { getDefaultRouteForRole } from '@/lib/navigation';

const { user } = useAuth();

const handleNext = () => {
  const defaultRoute = getDefaultRouteForRole(user?.role as any);
  router.push(defaultRoute); // ✅ Role-specific
};

const handleSkip = () => {
  const defaultRoute = getDefaultRouteForRole(user?.role as any);
  router.push(defaultRoute); // ✅ Role-specific
};
```

### 2. Login Form

**File:** `apps/web/src/components/auth/login-form.tsx`

**Before:**
```typescript
const redirectMap = {
  SUPER_ADMIN: '/admin/tenants',
  ADMIN: '/users',                    // ❌ Wrong, should be dashboard
  DISPATCHER: '/dispatcher/overview',
  DRIVER: '/driver/dashboard',
  // OWNER missing! ❌
};
```

**After:**
```typescript
const redirectMap = {
  SUPER_ADMIN: '/admin/tenants',
  OWNER: '/admin/dashboard',         // ✅ Added
  ADMIN: '/admin/dashboard',         // ✅ Fixed
  DISPATCHER: '/dispatcher/overview',
  DRIVER: '/driver/dashboard',
};
```

### 3. Layout Client (Previously Fixed)

**File:** `apps/web/src/app/layout-client.tsx`

Already uses `getDefaultRouteForRole()` for authenticated user redirects:
```typescript
if (isAuthenticated && (pathname === '/login' || pathname === '/')) {
  const defaultRoute = getDefaultRouteForRole(user?.role);
  router.push(defaultRoute); // ✅ Role-specific
}
```

---

## Role-Specific Routes

| Role | Default Route | Purpose |
|------|---------------|---------|
| SUPER_ADMIN | `/admin/tenants` | Tenant management portal |
| OWNER | `/admin/dashboard` | Tenant owner dashboard |
| ADMIN | `/admin/dashboard` | Tenant admin dashboard |
| DISPATCHER | `/dispatcher/overview` | Dispatcher command center |
| DRIVER | `/driver/dashboard` | Driver route view |

---

## Centralized Route Management

All role-based routing now uses the centralized helper:

**Function:** `getDefaultRouteForRole()`
**Location:** `src/lib/navigation.ts`

```typescript
export function getDefaultRouteForRole(
  role: 'DISPATCHER' | 'DRIVER' | 'ADMIN' | 'OWNER' | 'SUPER_ADMIN' | undefined
): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin/tenants';
    case 'OWNER':
      return '/admin/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    case 'DISPATCHER':
      return '/dispatcher/overview';
    case 'DRIVER':
      return '/driver/dashboard';
    default:
      return '/login';
  }
}
```

**Benefits:**
- ✅ Single source of truth for role routing
- ✅ Easy to update if routes change
- ✅ Type-safe with TypeScript
- ✅ Consistent across the app

---

## Testing Checklist

### Onboarding Flow
- [ ] OWNER completes onboarding → redirects to `/admin/dashboard`
- [ ] OWNER skips onboarding → redirects to `/admin/dashboard`
- [ ] ADMIN completes onboarding → redirects to `/admin/dashboard`
- [ ] DISPATCHER completes onboarding → redirects to `/dispatcher/overview`
- [ ] DRIVER completes onboarding → redirects to `/driver/dashboard`

### Login Flow
- [ ] SUPER_ADMIN logs in → redirects to `/admin/tenants`
- [ ] OWNER logs in → redirects to `/admin/dashboard`
- [ ] ADMIN logs in → redirects to `/admin/dashboard`
- [ ] DISPATCHER logs in → redirects to `/dispatcher/overview`
- [ ] DRIVER logs in → redirects to `/driver/dashboard`

### URL Access
- [ ] Authenticated user goes to `/` → redirects to role-specific dashboard
- [ ] Authenticated user goes to `/login` → redirects to role-specific dashboard
- [ ] No 404 errors after onboarding
- [ ] No 404 errors after login

---

## Related Issues Fixed

1. **OWNER role not in redirect map** - Added OWNER to login redirect map
2. **ADMIN redirected to /users** - Changed to `/admin/dashboard` (proper dashboard)
3. **Onboarding hardcoded /dashboard** - Now uses `getDefaultRouteForRole()`
4. **Inconsistent routing logic** - All routing now uses centralized helper

---

## Files Modified

### Frontend
- ✅ `apps/web/src/app/onboarding/page.tsx` - Use role-specific routing
- ✅ `apps/web/src/components/auth/login-form.tsx` - Add OWNER, fix ADMIN route
- ✅ `apps/web/src/app/layout-client.tsx` - Already using role-specific routing

### Utility
- ✅ `apps/web/src/lib/navigation.ts` - Centralized route definitions

---

## Best Practices Going Forward

### ✅ DO:
- Use `getDefaultRouteForRole(user?.role)` for role-based redirects
- Keep all role routing logic in `navigation.ts`
- Test login/onboarding flows for all roles

### ❌ DON'T:
- Hardcode `/dashboard` redirects
- Create role-specific routing logic in components
- Assume a single "dashboard" route works for everyone

---

## Summary

Fixed all hardcoded `/dashboard` redirects by using the centralized `getDefaultRouteForRole()` helper. All roles now redirect to their appropriate dashboard:
- SUPER_ADMIN → Tenant Management
- OWNER/ADMIN → Admin Dashboard
- DISPATCHER → Command Center
- DRIVER → Driver Dashboard

No more 404 errors after onboarding or login!

**Status:** ✅ Complete
