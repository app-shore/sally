# SUPER_ADMIN Scope Cleanup

**Date:** February 2, 2026
**Purpose:** Simplify SUPER_ADMIN role to focus on tenant management only

---

## Overview

Removed user and driver management access from SUPER_ADMIN. These functions should be handled by tenant OWNER/ADMIN users within their own organizations.

---

## Changes Made

### 1. Navigation Cleanup

**Before:**
```typescript
super_admin: [
  { label: 'Tenant Management', href: '/admin/tenants', icon: Building2 },
  { label: 'User Management', href: '/users', icon: Users },        // ❌ Removed
  { label: 'Driver Management', href: '/drivers', icon: Truck },    // ❌ Removed
]
```

**After:**
```typescript
super_admin: [
  { label: 'Tenant Management', href: '/admin/tenants', icon: Building2 },
  // User and driver management is handled by tenant OWNER/ADMIN users
  // We can add more SUPER_ADMIN features later (analytics, billing, etc.)
]
```

### 2. Backend Permissions

**Removed SUPER_ADMIN from:**

**User Invitations Controller:**
- ❌ `GET /api/v1/invitations` - Now OWNER/ADMIN only
- ✅ SUPER_ADMIN doesn't need to see individual tenant invitations

**Users Controller:**
- ❌ All user management endpoints - Now OWNER/ADMIN only
- ✅ SUPER_ADMIN manages tenants, not individual users

### 3. Page Cleanup

**Deleted:**
- ❌ `/app/admin/users/page.tsx` - Old duplicate users page

**Kept:**
- ✅ `/app/(super-admin)/admin/tenants` - SUPER_ADMIN tenant management
- ✅ `/app/(dashboard)/users` - Tenant user management (OWNER/ADMIN)
- ✅ `/app/(dashboard)/drivers` - Tenant driver management (OWNER/ADMIN)
- ✅ `/app/admin/dashboard` - OWNER/ADMIN dashboard

### 4. Reorganized OWNER/ADMIN Navigation

**New Structure:**
```typescript
owner/admin: [
  // Management Section (Top priority - administrative functions)
  { label: 'Dashboard', href: '/admin/dashboard', icon: Home },
  { label: 'User Management', href: '/users', icon: Users },
  { label: 'Driver Management', href: '/drivers', icon: Truck },

  { type: 'separator', label: 'Operations' },
  // Operations Section (Dispatcher work)
  { label: 'Command Center', href: '/dispatcher/overview', icon: BarChart3 },
  { label: 'Plan Route', href: '/dispatcher/create-plan', icon: Plus },
  { label: 'Active Routes', href: '/dispatcher/active-routes', icon: Map },

  { type: 'separator', label: 'Configuration' },
  // Configuration Section (Settings)
  { label: 'Route Planning', href: '/settings/route-planning', icon: Route },
  { label: 'Fleet Settings', href: '/settings/fleet', icon: Package },
  { label: 'Integrations', href: '/settings/integrations', icon: Plug },
  { label: 'Preferences', href: '/settings/preferences', icon: Settings },
]
```

---

## Navigation Structure Rationale

### Why User/Driver Management at the Top?

**✅ Correct (Current):**
- **Dashboard** (Overview)
- **User Management** (Administrative function)
- **Driver Management** (Administrative function)
- --- Operations ---
- Command Center (Daily operations)
- --- Configuration ---
- Settings (System config)

**❌ Wrong Alternative:**
- Dashboard
- Command Center
- --- Configuration ---
- User Management (Buried with settings)
- Fleet Settings
- Preferences

**Reasons:**
1. **Administrative Priority** - Managing users/drivers is a primary admin responsibility, not a configuration setting
2. **Logical Grouping** - Management functions (users, drivers) separate from operations (routing) and config (settings)
3. **User Expectations** - Admins expect user management near the top
4. **Access Pattern** - User/driver management is accessed frequently by admins

---

## SUPER_ADMIN Scope

### Current Scope (POC)
- ✅ Approve/reject tenant registrations
- ✅ View all tenants
- ✅ Suspend/reactivate tenants (if needed)

### Future Enhancements (Post-POC)
- 📊 System-wide analytics
- 💰 Billing and subscriptions
- 📈 Usage monitoring
- 🔐 Audit logs
- ⚙️ Global system configuration
- 📧 Tenant communication tools

### Explicitly NOT in Scope
- ❌ Managing individual tenant users
- ❌ Managing individual drivers
- ❌ Day-to-day tenant operations
- ❌ Route planning for tenants

**Principle:** SUPER_ADMIN manages the **platform** (tenants), not the **operations** (users/drivers).

---

## Role Separation

| Function | SUPER_ADMIN | OWNER | ADMIN | DISPATCHER | DRIVER |
|----------|-------------|-------|-------|------------|--------|
| **Approve Tenants** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Tenant Users** | ❌ | ✅ | ✅* | ❌ | ❌ |
| **Manage Drivers** | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Invite ADMIN** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Route Planning** | ❌ | ✅ | ✅ | ✅ | ❌ |

*ADMIN can manage DISPATCHER/DRIVER but not other ADMINs

---

## Benefits of This Approach

1. **Clear Separation of Concerns**
   - SUPER_ADMIN = Platform management
   - OWNER/ADMIN = Tenant management
   - DISPATCHER = Operations
   - DRIVER = Execution

2. **Scalability**
   - SUPER_ADMIN doesn't need to know about every user/driver in every tenant
   - Each tenant manages its own team

3. **Security**
   - SUPER_ADMIN can't accidentally modify tenant users
   - Tenant data isolation is clearer

4. **Simplicity**
   - SUPER_ADMIN portal is focused and simple
   - Tenant admins have full control of their teams

---

## API Endpoints Updated

### User Invitations (`/api/v1/invitations`)
**Before:** OWNER, ADMIN, SUPER_ADMIN
**After:** OWNER, ADMIN only

### Users (`/api/v1/users`)
**Before:** OWNER, ADMIN, SUPER_ADMIN
**After:** OWNER, ADMIN only

### Tenants (`/api/v1/tenants`)
**Unchanged:** SUPER_ADMIN only ✅

---

## Testing Checklist

### SUPER_ADMIN Tests
- [ ] Can access `/admin/tenants`
- [ ] Cannot access `/users`
- [ ] Cannot access `/drivers`
- [ ] Gets 403 on user/driver endpoints
- [ ] Navigation only shows Tenant Management

### OWNER Tests
- [ ] Can access all admin functions
- [ ] Can manage users and drivers
- [ ] Navigation shows all sections
- [ ] Can invite ADMIN users

### ADMIN Tests
- [ ] Can access admin dashboard
- [ ] Can manage users (not other admins)
- [ ] Can manage drivers
- [ ] Cannot invite ADMIN users

---

## Related Files

### Frontend
- `src/lib/navigation.ts` - Navigation config
- `src/app/(super-admin)/admin/tenants/` - SUPER_ADMIN tenant portal
- `src/app/(dashboard)/users/` - Tenant user management
- `src/app/(dashboard)/drivers/` - Tenant driver management

### Backend
- `src/api/user-invitations/user-invitations.controller.ts` - Removed SUPER_ADMIN
- `src/api/users/users.controller.ts` - Removed SUPER_ADMIN
- `src/api/tenants/tenants.controller.ts` - SUPER_ADMIN only

---

## Summary

SUPER_ADMIN is now focused exclusively on tenant management. User and driver management remains with tenant OWNER/ADMIN users where it belongs. This creates clear separation of concerns and better scalability.

**Navigation Structure:**
- SUPER_ADMIN: Tenant Management only
- OWNER/ADMIN: Dashboard → User/Driver Management → Operations → Configuration

**Status:** ✅ Complete
