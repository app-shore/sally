# Super Admin Tenant Management - Design

> **Status:** ✅ Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-06-super-admin-tenant-management-design.md`, `2026-02-08-super-admin-tenant-editing.md`

---

## Overview

Comprehensive multi-tenant admin features for SALLY's super admin portal. Includes full tenant lifecycle management (approve, reject, suspend, reactivate), tenant detail editing, dedicated super admin settings, and role-based navigation routing.

---

## Data Model (from actual Prisma schema)

### Tenant Model (Validated)

```prisma
model Tenant {
  id                    Int          @id @default(autoincrement())
  tenantId              String       @unique @map("tenant_id") @db.VarChar(50)
  companyName           String       @map("company_name") @db.VarChar(255)
  subdomain             String?      @unique @db.VarChar(100)
  contactEmail          String?      @map("contact_email") @db.VarChar(255)
  contactPhone          String?      @map("contact_phone") @db.VarChar(50)
  status                TenantStatus @default(PENDING_APPROVAL)
  dotNumber             String?      @map("dot_number") @db.VarChar(8)
  fleetSize             FleetSize?   @map("fleet_size")

  // Approval tracking
  approvedAt            DateTime?
  approvedBy            String?      @db.VarChar(100)
  rejectedAt            DateTime?
  rejectionReason       String?

  // Suspension tracking
  suspendedAt           DateTime?
  suspendedBy           String?      @db.VarChar(100)
  suspensionReason      String?

  // Reactivation tracking
  reactivatedAt         DateTime?
  reactivatedBy         String?      @db.VarChar(100)

  // Onboarding tracking
  onboardingCompletedAt DateTime?
  onboardingProgress    Json?

  isActive              Boolean      @default(false)
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt
}

enum TenantStatus { PENDING_APPROVAL, ACTIVE, REJECTED, SUSPENDED }
enum FleetSize { SIZE_1_10, SIZE_11_50, SIZE_51_100, SIZE_101_500, SIZE_500_PLUS }
```

### SuperAdminPreferences Model (Validated)

```prisma
model SuperAdminPreferences {
  id                      Int      @id @default(autoincrement())
  userId                  Int      @unique
  user                    User     @relation(...)
  notifyNewTenants        Boolean  @default(true)
  notifyStatusChanges     Boolean  @default(true)
  notificationFrequency   String   @default("immediate") @db.VarChar(20)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}
```

---

## API Endpoints (Validated against actual controller)

### Tenants Controller (`/api/v1/tenants`)
File: `apps/backend/src/domains/platform/tenants/tenants.controller.ts`

| Method | Endpoint | Access | Status |
|--------|----------|--------|--------|
| POST | `/tenants/register` | Public | ✅ Built |
| GET | `/tenants/check-subdomain/:subdomain` | Public | ✅ Built |
| GET | `/tenants` | SUPER_ADMIN | ✅ Built |
| POST | `/tenants/:tenantId/approve` | SUPER_ADMIN | ✅ Built |
| POST | `/tenants/:tenantId/reject` | SUPER_ADMIN | ✅ Built |
| POST | `/tenants/:tenantId/suspend` | SUPER_ADMIN | ✅ Built |
| POST | `/tenants/:tenantId/reactivate` | SUPER_ADMIN | ✅ Built |
| PATCH | `/tenants/:tenantId` | SUPER_ADMIN | ✅ Built |
| GET | `/tenants/:tenantId/details` | SUPER_ADMIN | ✅ Built |

### Super Admin Preferences Controller
File: `apps/backend/src/domains/platform/settings/super-admin-preferences.controller.ts`

| Method | Endpoint | Access | Status |
|--------|----------|--------|--------|
| GET | `/preferences/super-admin` | SUPER_ADMIN | ✅ Built |
| PATCH | `/preferences/super-admin` | SUPER_ADMIN | ✅ Built |

---

## Tenant Lifecycle Management

### Status Transitions

```
PENDING_APPROVAL -> ACTIVE (approve)
PENDING_APPROVAL -> REJECTED (reject)
ACTIVE -> SUSPENDED (suspend)
SUSPENDED -> ACTIVE (reactivate)
```

### Approve Flow
1. Super admin clicks "Approve" on pending tenant
2. Backend: tenant status = ACTIVE, isActive = true, approvedAt/approvedBy set
3. All OWNER/ADMIN users activated (isActive = true)
4. Welcome email sent

### Reject Flow
1. Super admin enters rejection reason (required)
2. Backend: tenant status = REJECTED, rejectedAt/rejectionReason set
3. Optional rejection email to owner

### Suspend Flow
1. Super admin enters suspension reason (required, min 10 chars via `SuspendTenantDto`)
2. Backend: tenant status = SUSPENDED, suspendedAt/suspendedBy/suspensionReason set
3. All users logged out and unable to access

### Reactivate Flow
1. Super admin confirms reactivation
2. Backend: tenant status = ACTIVE, reactivatedAt/reactivatedBy set
3. Users can log in again

---

## Tenant Detail Editing

### UpdateTenantDto (Validated)
File: `apps/backend/src/domains/platform/tenants/dto/update-tenant.dto.ts`

Editable fields (all optional):
- `companyName` - Company name
- `subdomain` - With uniqueness validation
- `dotNumber` - 1-8 digits
- `fleetSize` - FleetSize enum
- `ownerFirstName`, `ownerLastName` - Owner user details
- `ownerEmail` - Also updates tenant contactEmail
- `ownerPhone` - Updates tenant contactPhone

### Transactional Update
The `updateTenant` service method updates both tenant and owner user records in a single Prisma transaction. If subdomain changes, availability is checked first.

---

## UI Architecture

### Frontend Pages

```
apps/web/src/app/(super-admin)/admin/
├── tenants/page.tsx          # Tabbed tenant management
├── feature-flags/page.tsx    # Feature flags
└── settings/page.tsx         # Super admin personal settings
```

### Tabbed Interface
- **Pending** tab - Approve/Reject actions, count badge
- **Active** tab - Suspend/View Details actions
- **Suspended** tab - Reactivate/View Details actions
- **Rejected** tab - View Details only, shows rejection reason

### Dialog Components
- `RejectTenantDialog` - Textarea for rejection reason (required)
- `SuspendTenantDialog` - Textarea for suspension reason + warning
- `ReactivateTenantDialog` - Confirmation with previous suspension reason
- `TenantDetailsDialog` - Tabbed detail view (Overview, Users, Activity) with edit mode

### Navigation Routing
- Super Admin -> `/admin/settings` (personal profile)
- Other roles -> `/settings/preferences` (tenant settings)

---

## Current State

- ✅ All backend endpoints implemented (register, approve, reject, suspend, reactivate, update, details)
- ✅ DTOs with class-validator validation (RegisterTenantDto, SuspendTenantDto, UpdateTenantDto)
- ✅ Prisma schema with full tenant lifecycle fields
- ✅ SuperAdminPreferences model and controller
- ✅ Frontend tenant management tabs with all dialogs
- ✅ Tenant detail editing with read/edit mode toggle
- ✅ Action callbacks wired from parent to detail dialog
