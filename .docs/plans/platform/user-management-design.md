# User Management System - Design

> **Status:** ✅ Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-01-30-user-management-design.md`

---

## Overview

Complete user management system for SALLY encompassing authentication, tenant registration, user invitations, driver sync/activation, onboarding, and RBAC.

---

## Architecture

### Authentication Flow

Firebase handles authentication (email/password, verification, reset). Backend validates Firebase tokens and issues SALLY JWTs with tenant context.

```
1. User Registration/Login (Frontend)
   -> Firebase Auth (email/password)
   -> Firebase returns ID Token + UID
2. Exchange Token (Backend)
   POST /api/v1/auth/firebase/exchange
   -> Backend validates Firebase token
   -> Looks up user by firebaseUid
   -> Issues SALLY JWT (tenantId, role, driverId)
3. API Requests
   Use SALLY JWT for all subsequent requests
```

### JWT Payload Structure

```typescript
// Dispatcher JWT
{ sub: "user_jyc_disp_001", email: "dispatcher1@jyc.com", role: "DISPATCHER", tenantId: "tenant_jyc_001" }

// Driver JWT (includes driverId)
{ sub: "user_jyc_drv_001", email: "driver1@jyc.com", role: "DRIVER", tenantId: "tenant_jyc_001", driverId: "driver_jyc_001" }
```

---

## Data Model (from actual Prisma schema)

### User Model (Validated)

```prisma
model User {
  id                Int              @id @default(autoincrement())
  userId            String           @unique @map("user_id") @db.VarChar(50)
  tenant            Tenant?          @relation(fields: [tenantId], references: [id])
  tenantId          Int?             @map("tenant_id")
  email             String           @db.VarChar(255)
  passwordHash      String?          @map("password_hash") @db.VarChar(255)
  firstName         String           @map("first_name") @db.VarChar(100)
  lastName          String           @map("last_name") @db.VarChar(100)
  role              UserRole
  firebaseUid       String?          @unique @map("firebase_uid") @db.VarChar(128)
  emailVerified     Boolean          @default(false) @map("email_verified")
  driver            Driver?          @relation(fields: [driverId], references: [id])
  driverId          Int?             @unique @map("driver_id")
  customer          Customer?        @relation(fields: [customerId], references: [id])
  customerId        Int?             @unique @map("customer_id")
  isActive          Boolean          @default(true) @map("is_active")
  lastLoginAt       DateTime?        @map("last_login_at")
  deletedAt         DateTime?        @map("deleted_at")
  deletedBy         Int?             @map("deleted_by")
  deletionReason    String?          @map("deletion_reason")
  // Relations: refreshTokens, apiKeys, preferences, invitationsSent, invitationsAccepted, etc.
}

enum UserRole {
  DISPATCHER
  DRIVER
  ADMIN
  OWNER           // Tenant owner - created during registration, cannot be deleted
  CUSTOMER        // External customer/shipper with limited portal access
  SUPER_ADMIN
}
```

**Note:** The actual schema includes an `OWNER` role (not in original design) and a `CUSTOMER` role for the shipper portal. The `passwordHash` field also exists alongside `firebaseUid`.

### UserInvitation Model (Validated)

```prisma
model UserInvitation {
  id                    Int              @id @default(autoincrement())
  invitationId          String           @unique @default(uuid())
  tenant                Tenant           @relation(fields: [tenantId], references: [id])
  tenantId              Int
  email                 String           @db.VarChar(255)
  firstName             String           @db.VarChar(100)
  lastName              String           @db.VarChar(100)
  role                  UserRole
  driverId              Int?             // Optional driver link
  customerId            Int?             // Optional customer link
  token                 String           @unique @db.VarChar(255)
  expiresAt             DateTime
  invitedBy             Int
  status                InvitationStatus @default(PENDING)
  acceptedAt            DateTime?
  acceptedByUserId      Int?
  cancelledAt           DateTime?
  cancellationReason    String?
  createdAt             DateTime         @default(now())
}

enum InvitationStatus { PENDING, ACCEPTED, CANCELLED, EXPIRED }
```

---

## API Endpoints (Validated against actual controllers)

### Users Controller (`/api/v1/users`)
File: `apps/backend/src/domains/platform/users/users.controller.ts`

| Method | Endpoint | Access | Status |
|--------|----------|--------|--------|
| GET | `/users` | OWNER, ADMIN | ✅ Built |
| GET | `/users/:userId` | OWNER, ADMIN | ✅ Built |
| POST | `/users` | OWNER, ADMIN | ✅ Built |
| PATCH | `/users/:userId` | OWNER, ADMIN | ✅ Built |
| DELETE | `/users/:userId` | OWNER, ADMIN | ✅ Built |
| POST | `/users/:userId/deactivate` | OWNER, ADMIN | ✅ Built |
| POST | `/users/:userId/activate` | OWNER, ADMIN | ✅ Built |

### User Invitations Controller (`/api/v1/invitations`)
File: `apps/backend/src/domains/platform/user-invitations/user-invitations.controller.ts`

| Method | Endpoint | Access | Status |
|--------|----------|--------|--------|
| POST | `/invitations` | OWNER, ADMIN | ✅ Built |
| GET | `/invitations` | OWNER, ADMIN | ✅ Built |
| GET | `/invitations/by-token/:token` | Public | ✅ Built |
| POST | `/invitations/accept` | Public | ✅ Built |
| DELETE | `/invitations/:invitationId` | OWNER, ADMIN | ✅ Built |
| POST | `/invitations/:invitationId/resend` | OWNER, ADMIN | ✅ Built |

### API Keys Controller (`/api/v1/api-keys`)
File: `apps/backend/src/domains/platform/api-keys/api-keys.controller.ts`

| Method | Endpoint | Access | Status |
|--------|----------|--------|--------|
| POST | `/api-keys` | Authenticated | ✅ Built |
| GET | `/api-keys` | Authenticated | ✅ Built |
| DELETE | `/api-keys/:id` | Authenticated | ✅ Built |

---

## Tenant Registration & Approval Flow

### Self-Service Registration
1. User fills form (companyName, subdomain, dotNumber, fleetSize, admin info)
2. Frontend validates subdomain uniqueness via `GET /tenants/check-subdomain/:subdomain`
3. Creates Firebase account
4. Backend creates Tenant (PENDING_APPROVAL) + Owner User (inactive)
5. User sees "Registration successful, pending approval"

### Approval Flow (Super Admin)
1. Super admin views pending tenants at `/admin/tenants`
2. Clicks Approve -> Tenant status set to ACTIVE, admin users activated
3. Welcome email sent to owner

---

## Dispatcher Invitation System

### Invitation Process
1. Tenant OWNER/ADMIN fills invite form (email, firstName, lastName, role)
2. Backend creates UserInvitation with 7-day token
3. Email sent with acceptance link
4. Invited user accepts -> creates Firebase account -> User record created

### Driver Activation Flow
1. Drivers sync from Samsara (status: PENDING_ACTIVATION)
2. Admin selects drivers, clicks "Activate"
3. UserInvitation created per driver, emails sent
4. Driver accepts -> User record created with driverId linked

---

## Permission Matrix (Validated)

| Action | SUPER_ADMIN | OWNER | ADMIN | DISPATCHER | DRIVER | CUSTOMER |
|--------|-------------|-------|-------|------------|--------|----------|
| View users list | N/A | Yes | Yes | Read-only | No | No |
| Invite users | No | Yes | Yes | No | No | No |
| Edit user | No | Yes | Yes | No | No | No |
| Delete user | No | Yes | Yes | No | No | No |
| Manage tenants | Yes | No | No | No | No | No |

---

## Security Considerations

- Firebase handles password hashing, email verification, password reset, rate limiting
- SALLY controls tenant isolation, role assignment, multi-tenancy
- Soft delete for users (preserves audit trail)
- Cannot delete last OWNER/ADMIN in tenant
- Rate limiting: Max 5 signups per IP per hour, max 20 invitations per tenant per day

---

## Current State

- ✅ All backend controllers and services implemented
- ✅ Prisma schema includes all models (User, UserInvitation, ApiKey, RefreshToken)
- ✅ RBAC with OWNER role (addition beyond original design)
- ✅ CUSTOMER role added for shipper portal
- ✅ User invitation with resend capability
- ✅ Soft delete and deactivation flows
- 🔲 Firebase frontend integration (designed, partial)
- 🔲 Onboarding wizard UI (see onboarding-design.md)
