# OWNER Role Implementation

**Date:** February 2, 2026
**Purpose:** Implement a protected OWNER role for tenant creators with elevated privileges

---

## Overview

The OWNER role is a special tenant-level role that:
- Is automatically assigned to the person who registers a tenant
- Cannot be deleted, deactivated, or modified
- Has full control over the tenant including managing admins
- Each tenant can only have ONE owner

---

## Role Hierarchy

```
SUPER_ADMIN          (SALLY team - manages all tenants)
    └── OWNER        (Tenant owner - created during registration, cannot be deleted)
        └── ADMIN    (Tenant administrators - can manage dispatchers/drivers)
            ├── DISPATCHER
            └── DRIVER
```

---

## Database Changes

### Schema Update
```prisma
enum UserRole {
  DISPATCHER
  DRIVER
  ADMIN
  OWNER           // Added - tenant owner role
  SUPER_ADMIN
}
```

### Migration
- **File:** `prisma/migrations/20260202141218_add_owner_role/migration.sql`
- **Change:** Added `OWNER` value to `UserRole` enum

---

## Backend Implementation

### 1. Tenant Registration (`tenants.service.ts`)

**Changed:** Owner user is created instead of admin user during tenant registration

```typescript
// Create owner user (cannot be deleted)
const ownerUser = await tx.user.create({
  data: {
    // ...
    role: 'OWNER', // Owner role - created during registration
    // ...
  },
});
```

### 2. User Invitations (`user-invitations.service.ts`)

**Role Restrictions:**
```typescript
// Cannot invite SUPER_ADMIN or OWNER
if (dto.role === 'SUPER_ADMIN' || dto.role === 'OWNER') {
  throw new ForbiddenException('Cannot invite users with this role');
}

// Only OWNER can invite ADMINs
if (currentUser.role === 'ADMIN' && dto.role === 'ADMIN') {
  throw new ForbiddenException('Only the tenant owner can invite additional admins');
}
```

**Permissions:**
- `@Roles(UserRole.OWNER, UserRole.ADMIN)` - Both can invite users
- OWNER can invite: ADMIN, DISPATCHER, DRIVER
- ADMIN can invite: DISPATCHER, DRIVER (NOT ADMIN)

### 3. User Management (`users.service.ts`)

**Protection Rules:**

**Update User:**
```typescript
// Cannot modify OWNER role
if (user.role === 'OWNER') {
  throw new ForbiddenException('Cannot modify the tenant owner account');
}

// Only OWNER can promote users to ADMIN
if (dto.role === 'ADMIN' && currentUser?.role !== 'OWNER') {
  throw new ForbiddenException('Only the tenant owner can promote users to ADMIN');
}
```

**Delete User:**
```typescript
// Cannot delete OWNER
if (user.role === 'OWNER') {
  throw new ForbiddenException('Cannot delete the tenant owner account');
}

// ADMIN cannot delete other ADMINs (only OWNER can)
if (user.role === 'ADMIN' && currentUser?.role !== 'OWNER') {
  throw new ForbiddenException('Only the tenant owner can delete admin users');
}
```

**Deactivate/Activate User:**
```typescript
// Cannot deactivate OWNER
if (user.role === 'OWNER') {
  throw new ForbiddenException('Cannot deactivate the tenant owner account');
}

// ADMIN cannot deactivate other ADMINs (only OWNER can)
if (user.role === 'ADMIN' && currentUser?.role !== 'OWNER') {
  throw new ForbiddenException('Only the tenant owner can deactivate admin users');
}
```

### 4. Controller Permissions

**All user management endpoints updated:**
```typescript
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
```

---

## Frontend Implementation

### 1. User List Component (`user-list.tsx`)

**Owner Badge Display:**
```tsx
{userName}
{isOwner && (
  <span className="ml-2 text-xs text-muted-foreground">(Owner)</span>
)}
```

**Protected Actions:**
```tsx
{isOwner ? (
  <span className="text-xs text-muted-foreground">Protected</span>
) : (
  // Show deactivate/delete buttons
)}
```

**Role Badge Variant:**
- OWNER: `default` (same as ADMIN)
- Badge displays the role as "OWNER"

### 2. Invite User Dialog (`invite-user-dialog.tsx`)

**Role Selection:**
```tsx
{isOwner && <SelectItem value="ADMIN">Admin</SelectItem>}
<SelectItem value="DISPATCHER">Dispatcher</SelectItem>
<SelectItem value="DRIVER">Driver</SelectItem>
```

**Helper Text:**
```tsx
{!isOwner && (
  <p className="text-sm text-muted-foreground mt-1">
    Only the tenant owner can invite admin users
  </p>
)}
```

### 3. Auth Hook (`use-auth.ts`)

**Added Convenience Check:**
```typescript
isOwner: user?.role === 'OWNER',
```

---

## Permission Matrix

| Action | SUPER_ADMIN | OWNER | ADMIN | DISPATCHER | DRIVER |
|--------|-------------|-------|-------|------------|--------|
| View all tenants | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve tenants | ✅ | ❌ | ❌ | ❌ | ❌ |
| View tenant users | ✅ | ✅ | ✅ | ❌ | ❌ |
| Invite ADMIN | ❌ | ✅ | ❌ | ❌ | ❌ |
| Invite DISPATCHER/DRIVER | ❌ | ✅ | ✅ | ❌ | ❌ |
| Delete/Deactivate ADMIN | ❌ | ✅ | ❌ | ❌ | ❌ |
| Delete/Deactivate DISPATCHER/DRIVER | ❌ | ✅ | ✅ | ❌ | ❌ |
| Modify OWNER | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete OWNER | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Testing Checklist

### Backend Tests
- [ ] OWNER role enum value exists
- [ ] Tenant registration creates OWNER user
- [ ] Cannot invite SUPER_ADMIN or OWNER role
- [ ] ADMIN cannot invite ADMIN role
- [ ] Cannot delete/modify OWNER user
- [ ] OWNER can delete/modify ADMIN users
- [ ] ADMIN cannot delete other ADMIN users

### Frontend Tests
- [ ] OWNER badge displays correctly
- [ ] OWNER user shows "Protected" instead of action buttons
- [ ] Invite dialog only shows ADMIN option for OWNER
- [ ] Helper text displays for non-OWNER users
- [ ] `isOwner` hook returns correct value

### E2E Tests
- [ ] Register new tenant → verify OWNER role assigned
- [ ] OWNER can invite ADMIN → verify success
- [ ] ADMIN tries to invite ADMIN → verify error
- [ ] ADMIN tries to delete OWNER → verify error
- [ ] OWNER can delete ADMIN → verify success

---

## Migration Path for Existing Data

If there are existing tenants with ADMIN users who should be OWNER:

```sql
-- Find the first admin user for each tenant and promote to OWNER
UPDATE users
SET role = 'OWNER'
WHERE id IN (
  SELECT DISTINCT ON (tenant_id) id
  FROM users
  WHERE role = 'ADMIN' AND tenant_id IS NOT NULL
  ORDER BY tenant_id, created_at ASC
);
```

**WARNING:** Run this migration carefully in production. Test on staging first!

---

## API Endpoints

All existing user management endpoints now support OWNER role:

- `POST /api/v1/invitations` - OWNER, ADMIN
- `GET /api/v1/invitations` - OWNER, ADMIN, SUPER_ADMIN
- `DELETE /api/v1/invitations/:id` - OWNER, ADMIN
- `GET /api/v1/users` - OWNER, ADMIN, SUPER_ADMIN
- `POST /api/v1/users/:id/deactivate` - OWNER, ADMIN, SUPER_ADMIN
- `POST /api/v1/users/:id/activate` - OWNER, ADMIN, SUPER_ADMIN
- `DELETE /api/v1/users/:id` - OWNER, ADMIN, SUPER_ADMIN

**Note:** While all roles have access, ADMIN users have restricted capabilities compared to OWNER users (cannot manage other ADMINs).

---

## Related Files

### Backend
- `prisma/schema.prisma` - UserRole enum
- `src/api/tenants/tenants.service.ts` - Tenant registration
- `src/api/user-invitations/user-invitations.service.ts` - Invitation restrictions
- `src/api/user-invitations/user-invitations.controller.ts` - Invitation permissions
- `src/api/users/users.service.ts` - User management restrictions
- `src/api/users/users.controller.ts` - User permissions

### Frontend
- `src/components/users/user-list.tsx` - User list with OWNER badge
- `src/components/users/invite-user-dialog.tsx` - Role selection
- `src/hooks/use-auth.ts` - isOwner check

---

## Future Enhancements

1. **Transfer Ownership** - Allow OWNER to transfer ownership to another user
2. **Multi-Owner Support** - Allow multiple OWNER users per tenant (if needed)
3. **Owner Recovery** - Process for recovering access if OWNER account is locked
4. **Audit Logs** - Track all OWNER actions for compliance

---

## Summary

The OWNER role provides a clear hierarchy and protection for tenant creators:

✅ **Automatic Assignment** - Created during tenant registration
✅ **Full Control** - Can manage all users including admins
✅ **Protected** - Cannot be deleted, deactivated, or modified
✅ **Single Owner** - One owner per tenant for clear accountability
✅ **Clear Hierarchy** - OWNER > ADMIN > DISPATCHER/DRIVER

This implementation ensures tenant security and provides a clear governance structure for user management.
