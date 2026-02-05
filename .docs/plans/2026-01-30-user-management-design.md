# User Management System - Complete Design

**Date:** January 30, 2026
**Status:** Approved
**Estimated Reading Time:** 25 minutes

---

## Overview

This document specifies the complete user management system for SALLY, including:
- Firebase authentication integration
- Self-service tenant registration with manual approval
- Dispatcher email invitations
- Driver sync and activation from Samsara
- Post-approval onboarding wizard
- Comprehensive user management interface
- Role-based access control (RBAC)

---

## Table of Contents

1. [Firebase Authentication Architecture](#1-firebase-authentication-architecture)
2. [Tenant Registration & Approval Flow](#2-tenant-registration--approval-flow)
3. [Tenant Approval System](#3-tenant-approval-system)
4. [Dispatcher Invitation System](#4-dispatcher-invitation-system)
5. [Driver Sync & Activation from Samsara](#5-driver-sync--activation-from-samsara)
6. [Onboarding Wizard](#6-onboarding-wizard-post-approval)
7. [User Management UI & Permissions](#7-user-management-ui--permissions)
8. [User Deletion & Driver Status Management](#8-user-deletion--driver-status-management)
9. [API Endpoints Summary](#9-api-endpoints-summary)
10. [Data Migration & Seed Updates](#10-data-migration--seed-updates)
11. [Security & Edge Cases](#11-additional-considerations--edge-cases)

---

## 1. Firebase Authentication Architecture

### Integration Approach

**Firebase as Auth Provider + SALLY JWT for Authorization**

### Authentication Flow

```
1. User Registration/Login (Frontend)
   ↓
   Firebase Auth (email/password)
   ↓
   Firebase returns ID Token + UID
   ↓
2. Exchange Token (Backend)
   POST /api/v1/auth/firebase/exchange
   Headers: Authorization: Bearer <firebase-id-token>
   ↓
   Backend validates Firebase token
   ↓
   Looks up user by firebaseUid in database
   ↓
   Issues SALLY JWT (with tenantId, role, driverId)
   ↓
3. API Requests
   Use SALLY JWT for all subsequent requests
   (existing JWT infrastructure unchanged)
```

### Database Changes

```prisma
model User {
  // ... existing fields
  firebaseUid       String?   @unique @map("firebase_uid") @db.VarChar(128)
  emailVerified     Boolean   @default(false) @map("email_verified")
  deletedAt         DateTime?  @map("deleted_at") @db.Timestamptz
  deletedBy         Int?       @map("deleted_by")
  deletedByUser     User?      @relation("DeletedBy", fields: [deletedBy], references: [id])
  deletionReason    String?    @map("deletion_reason")
  // ... rest of fields
}
```

### JWT Payload Structure

```typescript
// Dispatcher JWT
{
  sub: "user_jyc_disp_001",
  email: "dispatcher1@jyc.com",
  role: "DISPATCHER",
  tenantId: "tenant_jyc_001"
}

// Driver JWT (includes driverId)
{
  sub: "user_jyc_drv_001",
  email: "driver1@jyc.com",
  role: "DRIVER",
  tenantId: "tenant_jyc_001",
  driverId: "driver_jyc_001"  // Links to Driver table
}
```

### Why This Architecture

- **Firebase handles:** Password hashing, email verification, password reset, rate limiting
- **SALLY controls:** Tenant isolation, role assignment, multi-tenancy
- **Easy SSO:** Add Google/Microsoft OAuth later via Firebase
- **No breaking changes:** Existing JWT authorization logic unchanged

---

## 2. Tenant Registration & Approval Flow

### Self-Service Registration

**Registration Form Fields:**

```typescript
{
  // Company Information
  companyName: string              // "JYC Carriers LLC"
  subdomain: string                // "jyc-carriers" (auto-suggested, editable)
  dotNumber: string                // "12345678" (DOT validation)
  fleetSize: enum                  // "1-10" | "11-50" | "51-100" | "101-500" | "500+"

  // Admin User Information
  firstName: string                // "John"
  lastName: string                 // "Smith"
  email: string                    // "admin@jyc.com" (becomes super admin)
  password: string                 // Firebase handles validation

  // Contact Information
  phone: string                    // "(339) 242-8066"
}
```

### Registration Process

```
1. User fills registration form
   ↓
2. Frontend validates:
   - Subdomain uniqueness (API call: GET /api/v1/tenants/check-subdomain/:subdomain)
   - Email uniqueness within system
   - DOT number format (8 digits)
   - Password strength (Firebase requirements)
   ↓
3. Create Firebase account
   Firebase.createUserWithEmailAndPassword()
   ↓
   Firebase sends email verification link
   ↓
4. Create tenant + admin user (Backend)
   POST /api/v1/tenants/register
   {
     tenant: { companyName, subdomain, dotNumber, fleetSize, phone },
     admin: { firstName, lastName, email, firebaseUid }
   }
   ↓
5. Backend creates:
   - Tenant record (status: PENDING_APPROVAL)
   - User record (role: ADMIN, emailVerified: false)
   - Sends notification email to SALLY admin team
   ↓
6. User sees: "Registration successful! Check email to verify account."
   - Cannot login until: email verified AND tenant approved
```

### Database Changes

```prisma
model Tenant {
  // ... existing fields
  status            TenantStatus  @default(PENDING_APPROVAL)
  dotNumber         String?       @map("dot_number") @db.VarChar(8)
  fleetSize         FleetSize?    @map("fleet_size")
  approvedAt        DateTime?     @map("approved_at") @db.Timestamptz
  approvedBy        String?       @map("approved_by") @db.VarChar(100)
  rejectedAt        DateTime?     @map("rejected_at") @db.Timestamptz
  rejectionReason   String?       @map("rejection_reason")
  onboardingCompletedAt  DateTime?  @map("onboarding_completed_at") @db.Timestamptz
  onboardingProgress     Json?      @map("onboarding_progress")
  // ... rest of fields
}

enum TenantStatus {
  PENDING_APPROVAL
  ACTIVE
  REJECTED
  SUSPENDED
}

enum FleetSize {
  SIZE_1_10      @map("1-10")
  SIZE_11_50     @map("11-50")
  SIZE_51_100    @map("51-100")
  SIZE_101_500   @map("101-500")
  SIZE_500_PLUS  @map("500+")
}
```

---

## 3. Tenant Approval System

### Admin Portal for SALLY Team

**Location:** `/admin/tenant-approvals`

**Access Control:**
- New role: `SUPER_ADMIN` (SALLY internal team only)
- Separate from tenant `ADMIN` role
- Not tenant-scoped (can see all tenants across system)

### Tenant Approvals Page UI

**Table Columns:**
- Company Name
- DOT Number (with verification badge)
- Fleet Size
- Admin Name & Email
- Phone
- Subdomain
- Registered Date
- Status (PENDING_APPROVAL badge)
- Actions (Approve/Reject buttons)

**Filters:**
- Status: All | Pending | Approved | Rejected
- Fleet Size: All | 1-10 | 11-50 | 51-100 | 101-500 | 500+
- Date Range: Last 7 days | Last 30 days | All time

**Search:**
- Search by company name, email, DOT number

### Approval Action Flow

```
1. SUPER_ADMIN clicks "Approve" on pending tenant
   ↓
2. Modal shows:
   - Tenant details summary
   - "Add Internal Notes" (optional, for SALLY records)
   - Confirm button
   ↓
3. Backend updates:
   POST /api/v1/admin/tenants/:tenantId/approve
   {
     status: ACTIVE,
     approvedAt: now(),
     approvedBy: currentUser.email
   }
   ↓
4. Trigger actions:
   - Set tenant status to ACTIVE
   - Send welcome email to admin user
   - Create default route planning configuration
   - Log approval event
   ↓
5. Welcome email includes:
   - Login link: https://jyc-carriers.sally.app/login
   - Next steps: Complete setup wizard
   - Support contact info
```

### Rejection Action Flow

```
1. SUPER_ADMIN clicks "Reject"
   ↓
2. Modal shows:
   - "Reason for rejection" (required, dropdown + text)
     Options:
     - Invalid DOT number
     - Duplicate registration
     - Incomplete information
     - Other (specify)
   ↓
3. Backend updates:
   POST /api/v1/admin/tenants/:tenantId/reject
   {
     status: REJECTED,
     rejectedAt: now(),
     rejectionReason: "Invalid DOT number"
   }
   ↓
4. Optional: Send rejection email to admin user
   (Can be configured to notify or silently reject)
```

### Re-registration Policy

**Rejected tenants CAN re-register with the same email:**
- Previous rejection doesn't block email reuse
- Each registration attempt is evaluated independently
- Admin can see registration history in tenant details

---

## 4. Dispatcher Invitation System

### Email-Based Invitation Flow

**Invite Dispatcher UI (Tenant Admin):**

**Location:** `/settings/users` (or in onboarding wizard Step 5)

**Invite Form:**
```typescript
{
  email: string              // "dispatcher@jyc.com"
  firstName: string          // "Sarah"
  lastName: string           // "Johnson"
  // Role is automatically DISPATCHER
}
```

### Invitation Process

```
1. Tenant ADMIN fills invite form
   ↓
2. Frontend validates:
   - Email not already a user in this tenant
   - Valid email format
   ↓
3. Backend creates invitation
   POST /api/v1/users/invite
   {
     email: "dispatcher@jyc.com",
     firstName: "Sarah",
     lastName: "Johnson",
     role: "DISPATCHER"
   }
   ↓
4. Backend:
   - Creates UserInvitation record (token, expires in 7 days)
   - Sends invitation email
   - Does NOT create User record yet
   ↓
5. Email contains:
   - Invitation link: https://jyc-carriers.sally.app/accept-invite?token=abc123
   - Company name (JYC Carriers)
   - Invited by (Admin Name)
   - Expiration notice (7 days)
```

### Invitation Acceptance Flow

```
1. Dispatcher clicks link in email
   ↓
2. Frontend validates token
   GET /api/v1/users/invitations/:token/validate
   ↓
   Returns: { valid: true, email: "...", firstName: "...", tenantName: "..." }
   ↓
3. Show signup form (pre-filled):
   - Email (read-only, from invitation)
   - First Name (pre-filled, editable)
   - Last Name (pre-filled, editable)
   - Password (user creates)
   - Confirm Password
   ↓
4. User submits form
   ↓
5. Create Firebase account
   Firebase.createUserWithEmailAndPassword()
   ↓
6. Accept invitation (Backend)
   POST /api/v1/users/invitations/:token/accept
   {
     firebaseUid: "...",
   }
   ↓
7. Backend:
   - Creates User record (role: DISPATCHER, status: ACTIVE)
   - Links firebaseUid
   - Marks invitation as accepted
   - Logs event
   ↓
8. Auto-login and redirect to /dispatcher/overview
```

### Database Model

```prisma
model UserInvitation {
  id                Int           @id @default(autoincrement())
  invitationId      String        @unique @default(uuid()) @map("invitation_id")

  tenant            Tenant        @relation(fields: [tenantId], references: [id])
  tenantId          Int           @map("tenant_id")

  email             String        @db.VarChar(255)
  firstName         String        @map("first_name") @db.VarChar(100)
  lastName          String        @map("last_name") @db.VarChar(100)
  role              UserRole

  token             String        @unique @db.VarChar(255)
  expiresAt         DateTime      @map("expires_at") @db.Timestamptz

  invitedBy         Int           @map("invited_by")
  invitedByUser     User          @relation("InvitedBy", fields: [invitedBy], references: [id])

  acceptedAt        DateTime?     @map("accepted_at") @db.Timestamptz
  acceptedByUserId  Int?          @map("accepted_by_user_id")
  acceptedByUser    User?         @relation("AcceptedBy", fields: [acceptedByUserId], references: [id])

  createdAt         DateTime      @default(now()) @map("created_at") @db.Timestamptz

  @@index([tenantId])
  @@index([token])
  @@index([email])
  @@map("user_invitations")
}
```

### Invitation Management Features

- Admin can see pending invitations in user list (status: "Invited")
- "Resend Invitation" button (generates new token, extends expiry)
- "Cancel Invitation" button (marks as cancelled)
- Expired invitations automatically cleaned up after 30 days

---

## 5. Driver Sync & Activation from Samsara

### Auto-Sync Drivers as Pending Users

**Driver Sync Process:**

```
1. Tenant completes Samsara integration in onboarding wizard
   (or later in /settings/integrations)
   ↓
2. Backend sync runs (every 5 minutes via scheduler)
   IntegrationSchedulerService.syncHOSData()
   ↓
3. Fetches drivers from Samsara (currently mock)
   Returns: [
     { externalDriverId: "samsara_001", name: "John Doe", email: "john@email.com", phone: "..." },
     { externalDriverId: "samsara_002", name: "Jane Smith", email: "jane@email.com", phone: "..." }
   ]
   ↓
4. For each Samsara driver:
   - Check if Driver record exists (by externalDriverId)
   - If NOT exists:
     → Create Driver record (status: PENDING_ACTIVATION)
     → Do NOT create User record yet
   - If exists:
     → Update Driver info (name, email, phone, HOS data)
     → Update lastSyncedAt timestamp
   ↓
5. Pending drivers appear in User Management UI
```

### Database Model Enhancement

```prisma
model Driver {
  // ... existing fields
  status            DriverStatus  @default(PENDING_ACTIVATION)
  activatedAt       DateTime?     @map("activated_at") @db.Timestamptz
  activatedBy       Int?          @map("activated_by")
  activatedByUser   User?         @relation("ActivatedBy", fields: [activatedBy], references: [id])

  // Deactivation tracking
  deactivatedAt     DateTime?     @map("deactivated_at") @db.Timestamptz
  deactivatedBy     Int?          @map("deactivated_by")
  deactivatedByUser User?         @relation("DeactivatedBy", fields: [deactivatedBy], references: [id])
  deactivationReason String?      @map("deactivation_reason")

  // Reactivation tracking
  reactivatedAt     DateTime?     @map("reactivated_at") @db.Timestamptz
  reactivatedBy     Int?          @map("reactivated_by")
  reactivatedByUser User?         @relation("ReactivatedBy", fields: [reactivatedBy], references: [id])

  // External sync tracking
  externalDriverId  String?       @map("external_driver_id") @db.VarChar(100)
  externalSource    String?       @map("external_source") @db.VarChar(50)
  lastSyncedAt      DateTime?     @map("last_synced_at") @db.Timestamptz
  syncStatus        SyncStatus?   @map("sync_status")
  // ... rest of fields
}

enum DriverStatus {
  PENDING_ACTIVATION    // Synced from Samsara, not yet onboarded to SALLY
  ACTIVE                // User account created, can login
  INACTIVE              // Deactivated by admin
  SUSPENDED             // Temporarily disabled
  REMOVED_FROM_SOURCE   // No longer in Samsara
}

enum SyncStatus {
  SYNCED                // Currently in external system
  REMOVED               // Removed from external system
  SYNC_ERROR            // Error during last sync
  MANUAL_ENTRY          // Not synced (manually added)
}
```

### User Management Page UI

**Location:** `/settings/users`

**Two Tabs:**

1. **Active Users Tab**
   - Table showing: Name, Email, Role, Status, Last Login, Actions
   - Filters: Role (All | Admin | Dispatcher | Driver), Status (Active | Inactive)
   - Actions per user: Edit, Deactivate, Delete
   - "Invite Dispatcher" button (top right)

2. **Pending Drivers Tab**
   - Table showing drivers synced from Samsara but not yet activated
   - Columns:
     - Checkbox (for bulk select)
     - Name
     - Email
     - Phone
     - License Number
     - Synced From (badge: "Samsara")
     - Last Synced (timestamp)
   - Bulk actions toolbar:
     - "Activate Selected" button (primary)
     - "Select All" checkbox
     - Count: "12 drivers pending activation"
   - Individual action: "Activate" button per row

### Driver Activation Flow

```
1. Admin selects drivers (bulk or individual)
   ↓
2. Clicks "Activate Selected"
   ↓
3. Modal shows:
   - "Activate 5 drivers?"
   - List of selected driver names
   - Checkbox: "Send invitation emails immediately" (checked by default)
   - Confirm button
   ↓
4. Backend processes activation
   POST /api/v1/drivers/activate
   {
     driverIds: ["driver_001", "driver_002", ...],
     sendInvitations: true
   }
   ↓
5. For each driver:
   - Create UserInvitation record
   - Generate invitation token (7 day expiry)
   - Send invitation email (if sendInvitations: true)
   - Update Driver status: PENDING_ACTIVATION → ACTIVE
   - Set activatedAt, activatedBy
   ↓
6. Driver receives invitation email (same flow as dispatcher)
   - Link: https://jyc-carriers.sally.app/accept-invite?token=xyz789
   - Pre-filled: email, name
   - Driver creates password
   - User account created (role: DRIVER, linked to Driver record)
   ↓
7. Driver auto-login → redirected to /driver/dashboard
```

### Key Behaviors

- Drivers synced from Samsara do NOT get User accounts automatically
- Admin must explicitly activate them (gives control over who can access SALLY)
- Once activated, Driver.status = ACTIVE and UserInvitation is created
- Driver accepts invitation → User record created with driverId foreign key
- If driver's email changes in Samsara, next sync updates Driver.email (but User.email stays same)

### Samsara Sync Edge Cases

**Driver removed from Samsara:**
```
Next sync:
  - syncStatus = REMOVED
  - status = REMOVED_FROM_SOURCE
  - isActive unchanged (admin decides)
  - Show alert: "5 drivers removed from Samsara - review needed"
```

**Driver email changes in Samsara:**
```
  - Update Driver.email (external system is source of truth)
  - User.email stays same (login credential)
  - Show warning: "Email mismatch between SALLY and Samsara"
```

**Driver already has User account before sync:**
```
  - Match by email or externalDriverId
  - Link existing User to Driver record
  - Update Driver.status = ACTIVE
```

---

## 6. Onboarding Wizard (Post-Approval)

### Guided Setup After Tenant Approval

**Trigger:** First login after tenant approval

### Wizard Steps

**Step 1: Welcome & Company Profile (Required)**
- Welcome message: "Let's get your account set up!"
- Fields:
  - Company Address (street, city, state, zip)
  - MC Number (Motor Carrier Number) - optional
  - Primary Operating Regions (multi-select: Northeast, Southeast, Midwest, etc.)
- "Continue" button

**Step 2: Connect Integrations (Recommended, can skip)**
- Category cards (reuse existing IntegrationOnboarding component)
- **Samsara (HOS/ELD)** - "Recommended" badge
  - Opens ConfigureIntegrationForm
  - Test Connection → Success/Error feedback
- **Truckbase (TMS)** - "Recommended" badge
  - Opens ConfigureIntegrationForm
  - Test Connection → Success/Error feedback
- **Fuel Finder (Fuel Prices)** - "Optional" badge
- **OpenWeather (Weather)** - "Optional" badge
- "Skip for now" link (bottom left)
- "Continue" button (enabled even if skipped)

**Step 3: Activate Drivers (Conditional)**
- If Samsara NOT connected:
  - Skip this step entirely
- If Samsara connected:
  - Show synced drivers table (same as Pending Drivers tab)
  - Bulk select checkboxes
  - "Activate Selected Drivers" button
  - "Skip for now" link (can activate later in settings)
- "Continue" button

**Step 4: Route Planning Configuration (Optional, can skip)**
- Quick form with key defaults:
  - Optimization Mode: Time / Cost / Balanced (default: Balanced)
  - HOS Warning Threshold: 80% (when to alert approaching limit)
  - Prefer Full Rest: Yes/No (default: Yes)
  - Allow Dock Rest: Yes/No (default: Yes)
- "Use Recommended Defaults" button (pre-fills values)
- "Skip for now" link
- "Continue" button

**Step 5: Invite Dispatchers (Optional, can skip)**
- Simple form:
  - Email
  - First Name
  - Last Name
  - "Add Another" link (can invite multiple)
- List of added dispatchers (can remove before sending)
- "Send Invitations" button
- "Skip for now" link (can invite later in settings)
- "Finish Setup" button

**Final Screen: Setup Complete!**
- Checklist showing what was completed:
  - ✓ Company profile updated
  - ✓ Samsara connected (or ✗ Not connected - link to settings)
  - ✓ 5 drivers activated (or ✗ No drivers activated)
  - ✓ Route planning configured (or ✗ Using defaults)
  - ✓ 2 dispatchers invited (or ✗ No dispatchers)
- "Go to Dashboard" button
- "Complete Remaining Steps" link (goes to settings)

### Onboarding State Tracking

Stored in `Tenant.onboardingProgress` (JSON):
```json
{
  "step1_profile": true,
  "step2_integrations": true,
  "step3_drivers": false,
  "step4_config": true,
  "step5_dispatchers": false
}
```

### Onboarding Wizard Behavior

- Modal overlay (cannot close until dismissed or completed)
- Progress indicator at top (Step 1 of 5)
- Can go back to previous steps
- Saves progress automatically (can logout and resume later)
- "Dismiss wizard" link (bottom) → Shows confirmation: "You can complete setup anytime in Settings"
- After dismissal, shows banner on dashboard: "Complete your setup" (until all steps done)

---

## 7. User Management UI & Permissions

### Complete User Management Interface

**Location:** `/settings/users`

**Role-Based Access:**
- **ADMIN:** Full access (invite, activate, edit, deactivate, delete)
- **DISPATCHER:** Read-only access (view users list, cannot modify)
- **DRIVER:** No access (404 or redirect)

### Page Layout

```
Header:
  - Title: "User Management"
  - Search bar (search by name, email)
  - "Invite Dispatcher" button (ADMIN only)

Tabs:
  1. Active Users (default)
  2. Pending Drivers
  3. Invitations (shows pending/expired invitations)

Filters (above table):
  - Role: All | Admin | Dispatcher | Driver
  - Status: All | Active | Inactive
  - Date Added: Last 7 days | Last 30 days | All time
```

### Tab 1: Active Users Table

**Columns:**
- Avatar/Initials
- Name (firstName + lastName)
- Email
- Role (badge: ADMIN/DISPATCHER/DRIVER)
- Status (badge: Active/Inactive)
- Last Login (relative time: "2 hours ago")
- Created Date
- Actions (dropdown menu)

**Actions Menu (ADMIN only):**
- Edit User (opens modal)
- Change Role (ADMIN → DISPATCHER, etc.)
- Deactivate (if active) / Activate (if inactive)
- Reset Password Link (sends email via Firebase)
- Delete User (confirmation required)

**Bulk Actions (ADMIN only):**
- Select multiple users (checkboxes)
- Bulk Deactivate
- Bulk Delete (with confirmation)

### Tab 2: Pending Drivers Table

**Columns:**
- Checkbox (for bulk select)
- Name
- Email
- Phone
- License Number
- Source (badge: "Samsara" with icon)
- Last Synced (timestamp)
- Actions

**Actions (ADMIN only):**
- "Activate" button (individual)
- "Activate Selected" button (bulk, appears when ≥1 selected)

**Empty State:**
- Icon + message: "No pending drivers"
- "Connect Samsara in Integrations to sync drivers"
- Button: "Go to Integrations"

### Tab 3: Invitations Table

**Columns:**
- Email
- Name (firstName + lastName)
- Role (DISPATCHER/DRIVER)
- Status (badge: Pending/Accepted/Expired/Cancelled)
- Invited By (admin name)
- Sent Date
- Expires Date (or "Expired" badge if past)
- Actions

**Actions (ADMIN only):**
- Resend Invitation (generates new token, extends expiry)
- Cancel Invitation (marks as cancelled)
- Copy Invitation Link (for manual sharing)

**Filters:**
- Status: All | Pending | Accepted | Expired | Cancelled

### Edit User Modal (ADMIN only)

**Fields:**
- First Name
- Last Name
- Email (read-only if firebaseUid exists)
- Role (dropdown: ADMIN/DISPATCHER/DRIVER)
- Status (toggle: Active/Inactive)

**Validation:**
- Cannot change role to DRIVER without linking to Driver record
- Cannot remove ADMIN role if user is last admin in tenant
- Email change requires Firebase email update

**Actions:**
- "Save Changes" button
- "Cancel" button

### Permission Matrix

| Action | ADMIN | DISPATCHER | DRIVER |
|--------|-------|------------|--------|
| View users list | ✓ | ✓ (read-only) | ✗ |
| Invite dispatcher | ✓ | ✗ | ✗ |
| Activate drivers | ✓ | ✗ | ✗ |
| Edit user | ✓ | ✗ | ✗ |
| Change role | ✓ | ✗ | ✗ |
| Deactivate user | ✓ | ✗ | ✗ |
| Delete user | ✓ | ✗ | ✗ |
| Resend invitation | ✓ | ✗ | ✗ |
| View own profile | ✓ | ✓ | ✓ |
| Edit own profile | ✓ | ✓ | ✓ |

---

## 8. User Deletion & Driver Status Management

### Admin Can Remove Dispatchers

**Delete Dispatcher Flow:**

```
1. Admin clicks "Delete User" in actions menu
   ↓
2. Confirmation modal shows:
   - "Delete dispatcher Sarah Johnson?"
   - Warning: "This action cannot be undone"
   - Checkbox: "Also delete all audit logs" (optional)
   - "Delete" button (destructive, red)
   - "Cancel" button
   ↓
3. Backend processes deletion:
   DELETE /api/v1/users/:userId
   ↓
4. Soft Delete (Recommended):
   - Set User.isActive = false
   - Set User.deletedAt = now()
   - Set User.deletedBy = currentAdmin.userId
   - Keep all historical data (route plans, logs)
   - User cannot login
   - Email can be reused for new registration
```

**Business Rules:**
- Cannot delete last ADMIN in tenant (validation error)
- Cannot delete yourself (validation error)
- Can delete DISPATCHER anytime (no restrictions)
- Deleting DRIVER also deactivates linked Driver record

### Admin Can Deactivate/Reactivate External Drivers

**Deactivate Driver Flow:**

```
1. Admin clicks "Deactivate Driver"
   ↓
2. Modal shows:
   - "Deactivate driver John Doe?"
   - Dropdown: "Reason for deactivation"
     Options:
     - Left company
     - On leave (temporary)
     - Compliance issue
     - Removed from Samsara
     - Other (text field)
   - Warning: "Driver will not be able to login or be assigned to routes"
   - Checkbox: "Also deactivate linked User account" (checked by default)
   - "Deactivate" button
   ↓
3. Backend processes:
   POST /api/v1/drivers/:driverId/deactivate
   {
     reason: "Left company",
     deactivateUser: true
   }
   ↓
4. Updates:
   - Driver.status = INACTIVE
   - Driver.isActive = false
   - Driver.deactivatedAt = now()
   - Driver.deactivatedBy = currentAdmin.id
   - Driver.deactivationReason = "Left company"
   - User.isActive = false (if deactivateUser: true)
   ↓
5. Side effects:
   - Remove from active route assignments
   - Cancel pending route plans
   - Keep historical data (completed routes)
```

**Reactivate Driver Flow:**

```
1. Admin clicks "Reactivate Driver" (in inactive drivers view)
   ↓
2. Modal shows:
   - "Reactivate driver John Doe?"
   - Info: "Driver will be able to login and be assigned to routes again"
   - Checkbox: "Send reactivation notification email to driver"
   - "Reactivate" button
   ↓
3. Backend processes:
   POST /api/v1/drivers/:driverId/reactivate
   {
     sendNotification: true
   }
   ↓
4. Updates:
   - Driver.status = ACTIVE
   - Driver.isActive = true
   - Driver.reactivatedAt = now()
   - Driver.reactivatedBy = currentAdmin.id
   - User.isActive = true
```

### Inactive Drivers View

**Filter in Active Users Tab:**

```
Status Filter:
- All
- Active
- Inactive ← Shows deactivated drivers
- Deleted (soft deleted)

Additional columns for inactive:
- Deactivated Date
- Reason (deactivationReason)
- Actions: Reactivate, Delete Permanently
```

### Driver Status Badges

```typescript
PENDING_ACTIVATION  → Yellow badge: "Pending"
ACTIVE             → Green badge: "Active"
INACTIVE           → Gray badge: "Inactive"
SUSPENDED          → Orange badge: "Suspended"
REMOVED_FROM_SOURCE → Red badge: "Removed from Samsara"
```

### Sync Status Badges

```typescript
SYNCED             → Green dot: "Synced with Samsara"
REMOVED            → Red dot: "Removed from Samsara"
SYNC_ERROR         → Orange dot: "Sync error"
MANUAL_ENTRY       → Blue dot: "Manual entry"
```

---

## 9. API Endpoints Summary

### Tenant Registration & Management

```
POST   /api/v1/tenants/register                    # Self-service registration (public)
GET    /api/v1/tenants/check-subdomain/:subdomain  # Check subdomain availability (public)
GET    /api/v1/admin/tenants                       # List all tenants (SUPER_ADMIN only)
GET    /api/v1/admin/tenants/:tenantId             # Get tenant details (SUPER_ADMIN)
POST   /api/v1/admin/tenants/:tenantId/approve     # Approve tenant (SUPER_ADMIN)
POST   /api/v1/admin/tenants/:tenantId/reject      # Reject tenant (SUPER_ADMIN)
POST   /api/v1/admin/tenants/:tenantId/suspend     # Suspend tenant (SUPER_ADMIN)
```

### Firebase Authentication

```
POST   /api/v1/auth/firebase/exchange              # Exchange Firebase token for SALLY JWT (public)
POST   /api/v1/auth/firebase/link                  # Link existing user to Firebase UID
GET    /api/v1/auth/firebase/verify-email          # Verify email status from Firebase
```

### User Invitations

```
POST   /api/v1/users/invite                        # Invite dispatcher (ADMIN only)
GET    /api/v1/users/invitations                   # List all invitations (ADMIN only)
GET    /api/v1/users/invitations/:token/validate   # Validate invitation token (public)
POST   /api/v1/users/invitations/:token/accept     # Accept invitation (public)
POST   /api/v1/users/invitations/:invitationId/resend  # Resend invitation (ADMIN)
DELETE /api/v1/users/invitations/:invitationId    # Cancel invitation (ADMIN)
```

### User Management

```
GET    /api/v1/users                               # List users (ADMIN, DISPATCHER read-only)
GET    /api/v1/users/:userId                       # Get user details
PUT    /api/v1/users/:userId                       # Update user (ADMIN only)
DELETE /api/v1/users/:userId                       # Delete user (ADMIN only)
POST   /api/v1/users/:userId/deactivate            # Deactivate user (ADMIN only)
POST   /api/v1/users/:userId/activate              # Activate user (ADMIN only)
POST   /api/v1/users/bulk-deactivate               # Bulk deactivate (ADMIN only)
POST   /api/v1/users/bulk-delete                   # Bulk delete (ADMIN only)
```

### Driver Activation

```
GET    /api/v1/drivers/pending                     # List pending drivers from Samsara
POST   /api/v1/drivers/activate                    # Activate drivers (create invitations)
POST   /api/v1/drivers/:driverId/activate          # Activate single driver
POST   /api/v1/drivers/:driverId/deactivate        # Deactivate driver (ADMIN)
POST   /api/v1/drivers/:driverId/reactivate        # Reactivate driver (ADMIN)
GET    /api/v1/drivers/inactive                    # List inactive drivers (ADMIN)
GET    /api/v1/drivers/removed-from-source         # List drivers removed from Samsara (ADMIN)
```

### Onboarding

```
GET    /api/v1/onboarding/progress                 # Get onboarding progress
PUT    /api/v1/onboarding/progress                 # Update onboarding step
POST   /api/v1/onboarding/complete                 # Mark onboarding complete
POST   /api/v1/onboarding/dismiss                  # Dismiss wizard
```

---

## 10. Data Migration & Seed Updates

### Handling Existing Seed Data

**Migration Strategy for Existing Users:**

```typescript
// Migration script: migrate-users-to-firebase.ts

1. For each existing User in database:
   - Generate temporary password (random, secure)
   - Create Firebase account:
     Firebase.createUser({
       email: user.email,
       password: tempPassword,
       emailVerified: true  // Skip verification for existing users
     })
   - Store firebaseUid in User.firebaseUid
   - Send "Account Migrated" email with password reset link

2. Update existing Tenants:
   - Set status: ACTIVE (already approved)
   - Set onboardingCompletedAt: now() (skip wizard)
   - Set approvedAt: createdAt (retroactive approval)

3. Update existing Drivers:
   - If linked to User: status = ACTIVE
   - If not linked to User: status = PENDING_ACTIVATION
```

**Updated Seed Script:**

```typescript
// prisma/seed.ts updates

1. Create tenants with new fields:
   {
     status: TenantStatus.ACTIVE,  // Pre-approved for seed data
     dotNumber: "12345678",
     fleetSize: FleetSize.SIZE_51_100,
     approvedAt: new Date(),
     approvedBy: "system@sally.com"
   }

2. Create SUPER_ADMIN user (for SALLY team):
   {
     userId: "user_sally_superadmin_001",
     email: "admin@sally.com",
     role: UserRole.SUPER_ADMIN,
     tenantId: null,  // No tenant (system-wide access)
     isActive: true
   }
```

---

## 11. Additional Considerations & Edge Cases

### Security & Compliance

**Email Verification:**
- Firebase sends verification email automatically on signup
- User can login even if email not verified (but show banner: "Verify your email")
- Option to require verification before accessing features (configurable per tenant)

**Password Policy (Firebase):**
- Minimum 6 characters (Firebase default)
- Recommend 8+ characters with complexity requirements
- Password reset via Firebase (sends email with reset link)
- No password stored in SALLY database

**Data Privacy:**
- Credentials encrypted at rest (already implemented)
- User deletion: soft delete (set isActive: false) vs hard delete
- GDPR compliance: "Delete my account" feature exports data + removes PII

**Rate Limiting:**
- Registration: Max 5 signups per IP per hour (prevent abuse)
- Invitation: Max 20 invitations per tenant per day
- Login attempts: Firebase handles (lockout after 5 failed attempts)

### Multi-Tenant Edge Cases

**User exists in multiple tenants:**
- Same email can be admin@company-a.com AND admin@company-b.com
- Firebase UID is globally unique
- User record per tenant (separate userId per tenant)
- Login flow: email lookup → select tenant → Firebase login → SALLY JWT with tenantId

**Subdomain conflicts:**
- Validate uniqueness before registration
- Auto-suggest alternatives if taken (jyc-carriers-2, jyc-carriers-llc)
- Reserved subdomains: admin, api, www, app, dashboard, mail

**Tenant deactivation:**
- SUSPENDED status: Users cannot login, data preserved
- Show message: "Your account is temporarily suspended. Contact support."
- Admin can reactivate later

### Driver Sync Edge Cases

**Driver removed from Samsara:**
```
Next sync:
  - syncStatus = REMOVED
  - status = REMOVED_FROM_SOURCE
  - isActive unchanged (admin decides)
  - Show alert: "5 drivers removed from Samsara - review needed"
```

**Driver email changes in Samsara:**
```
  - Update Driver.email (external system is source of truth)
  - User.email stays same (login credential)
  - Show warning: "Email mismatch between SALLY and Samsara"
```

**Duplicate drivers (same email in Samsara):**
```
  - Log warning in sync logs
  - Create both Driver records
  - Admin must manually resolve (merge or deactivate duplicate)
```

**Driver already has User account before sync:**
```
  - Match by email or externalDriverId
  - Link existing User to Driver record
  - Update Driver.status = ACTIVE
```

### Invitation Edge Cases

**Invitation token expired:**
- Show message: "This invitation has expired. Contact your administrator."
- Admin can resend (generates new token)

**User accepts invitation after admin deleted it:**
- Show error: "This invitation is no longer valid."

**User already has account (accepted invitation):**
- If clicks link again: redirect to login with message "You've already accepted this invitation"

**Admin deletes user who has pending invitation:**
- Cascade delete: Remove invitation when user is deleted
- Or: Keep invitation, allow re-acceptance (creates new user)

### Onboarding Edge Cases

**User dismisses wizard but completes steps manually:**
- Track progress in onboardingProgress JSON
- Mark complete when all required steps done (even if dismissed)
- Remove banner when onboardingCompletedAt is set

**User completes wizard but later disconnects integration:**
- onboardingCompletedAt stays set (don't reset)
- Show alert in settings: "Samsara disconnected. Reconnect to sync drivers."

**Multiple admins complete onboarding:**
- First admin completes wizard → onboardingCompletedAt set
- Other admins don't see wizard (already completed)
- Option: "Re-run setup wizard" link in settings (for troubleshooting)

### Future Enhancements (Phase 2+)

**SSO Integration:**
- Google OAuth (via Firebase)
- Microsoft Azure AD (via Firebase)
- SAML for enterprise customers

**Two-Factor Authentication:**
- Firebase supports SMS and TOTP
- Enable per tenant (security requirement)

**Audit Logging:**
- Log all user management actions (invite, activate, deactivate, delete)
- Show audit trail in UI (who did what, when)
- Export logs for compliance

**Role Customization:**
- Custom roles beyond ADMIN/DISPATCHER/DRIVER
- Permission sets (can_invite_users, can_activate_drivers, can_approve_routes)
- Role templates per tenant

**Driver Self-Registration:**
- Driver receives SMS with registration link
- Creates account without admin activation
- Admin approves access after registration

---

## Summary

This design provides a complete user management system with:

✅ **Firebase Authentication** - Email/password with secure token exchange
✅ **Tenant Registration** - Self-service with manual approval workflow
✅ **Dispatcher Invitations** - Email-based with 7-day expiry tokens
✅ **Driver Sync & Activation** - Auto-sync from Samsara, manual activation by admin
✅ **Onboarding Wizard** - 5-step guided setup (integrations, drivers, config, invites)
✅ **User Management UI** - 3 tabs (active users, pending drivers, invitations)
✅ **User Deletion** - Soft delete for dispatchers, preserve audit trail
✅ **Driver Status Management** - Deactivate/reactivate with reason tracking
✅ **RBAC** - SUPER_ADMIN, ADMIN, DISPATCHER, DRIVER roles with permissions
✅ **Edge Case Handling** - Email conflicts, expired tokens, sync issues, etc.

---

**Document Version:** 1.0
**Last Updated:** January 30, 2026
**Status:** Ready for implementation
