# Tenant Lifecycle Notifications - Design

> **Status:** ✅ Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-04-tenant-notification-system-design.md`

---

## Overview

Automated email notifications for tenant registration and approval workflow. Sends emails at key points in the tenant lifecycle while providing an audit trail and foundation for future communication channels.

---

## Notification Types

| Type | Trigger | Recipient | Email Subject |
|------|---------|-----------|---------------|
| `TENANT_REGISTRATION_CONFIRMATION` | Tenant registers | Owner | "Thank you for registering with SALLY" |
| `TENANT_APPROVED` | Super admin approves | Owner | "Welcome to SALLY - Your account is now active!" |
| `TENANT_REJECTED` | Super admin rejects | Owner | "Update on your SALLY registration" |
| `USER_INVITATION` | Admin invites user | Invitee | (Existing flow) |

---

## Architecture

```
Application Layer (TenantsService, UserInvitationsService)
  |
  | calls
  v
NotificationService
  - sendTenantRegistrationConfirmation()
  - sendTenantApprovalNotification()
  - sendTenantRejectionNotification()
  - getNotificationHistory()
  |
  | uses
  v
EmailService (Resend / SMTP / Console mode)
```

---

## Data Model (from actual Prisma schema)

### Notification Model (Validated)

```prisma
model Notification {
  id              Int                 @id @default(autoincrement())
  notificationId  String              @unique @default(cuid()) @db.VarChar(50)
  type            NotificationType
  channel         NotificationChannel @default(EMAIL)
  recipient       String              @db.VarChar(255)
  status          NotificationStatus  @default(PENDING)
  tenantId        Int?
  tenant          Tenant?             @relation(...)
  userId          Int?
  user            User?               @relation(...)
  invitationId    Int?
  invitation      UserInvitation?     @relation(...)
  metadata        Json?
  errorMessage    String?             @db.Text
  sentAt          DateTime?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}

enum NotificationType { USER_INVITATION, TENANT_REGISTRATION_CONFIRMATION, TENANT_APPROVED, TENANT_REJECTED }
enum NotificationChannel { EMAIL, SMS, PUSH, IN_APP }
enum NotificationStatus { PENDING, SENT, FAILED }
```

Relations validated: Tenant.notifications, User.notifications, UserInvitation.notifications all exist in schema.

---

## Email Templates

All templates follow SALLY branded style:
- Black header with SALLY wordmark
- "Smart Routes. Confident Dispatchers. Happy Drivers." tagline
- Professional button styling
- Mobile-responsive HTML

### Deployment Configuration

Environment variables:
- `TENANT_BASE_URL` - Base domain (e.g., sally.appshore.in)
- `USE_TENANT_SUBDOMAINS` - true/false toggle

### Registration Confirmation
- No CTA button (informational only)
- Content: Thank you, review timeline (1-2 business days), next steps

### Approval Notification
- Primary CTA: "Login to SALLY" button with subdomain URL
- Shows subdomain reminder
- Next steps: invite team, set up route, explore dashboard

### Rejection Notification
- Shows rejection reason from super admin
- CTA: "Contact Support" button
- Professional, empathetic tone

---

## Data Flow

### Registration Flow
```
POST /tenants/register
  -> TenantsService.registerTenant()
  -> Create tenant + owner
  -> NotificationService.sendTenantRegistrationConfirmation()
  -> Create notification record (PENDING)
  -> EmailService.sendTenantRegistrationEmail()
  -> Update notification (SENT or FAILED)
```

### Approval Flow
```
POST /tenants/:tenantId/approve
  -> TenantsService.approveTenant()
  -> Update tenant + activate users
  -> NotificationService.sendTenantApprovalNotification()
  -> Create notification record -> EmailService -> Update notification
```

---

## Design Decisions

1. **Owner-only emails** - Only the registering owner receives customer-facing emails
2. **NotificationService layer** - Orchestrates logic, uses EmailService for delivery
3. **Lightweight tracking** - Store type, recipient, status, timestamps, error messages; not full email content
4. **Channel-ready** - Enum supports EMAIL, SMS, PUSH, IN_APP for future expansion
5. **Metadata JSON** - Flexible field for notification-specific data without rigid schema

---

## Current State

- ✅ Notification model in Prisma schema with all enums and relations
- ✅ NotificationService with send methods for all 3 tenant lifecycle events
- ✅ EmailService with branded email templates
- ✅ Audit trail with notification records
- ✅ Configurable subdomain vs single-domain URL generation
- ✅ Console mode for development (no actual email sending)
