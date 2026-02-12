# Tenant Lifecycle Notifications - Implementation

> **Status:** ✅ Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-04-tenant-notification-implementation.md`

---

## Overview

Implementation of automated email notifications for the tenant registration, approval, and rejection workflows with audit trail tracking.

---

## File Structure (Validated)

### Database
- Notification model added to `apps/backend/prisma/schema.prisma`
- Enums: NotificationType, NotificationChannel, NotificationStatus
- Relations to Tenant, User, UserInvitation models
- Indexes on tenantId, userId, type, status, createdAt

### Backend Files

```
apps/backend/src/services/notification/
├── notification.service.ts          # Core NotificationService
├── notification.module.ts           # Module registration
└── dto/
    └── notification-filters.dto.ts  # Type/status filter DTO

apps/backend/src/common/services/
└── email.service.ts                 # Email delivery (Resend/SMTP/Console)
```

---

## Implementation Tasks

### Task 1: Prisma Schema
- Added Notification model with flexible relationships (tenantId, userId, invitationId all nullable)
- Added metadata Json field for notification-specific data
- Added errorMessage field for failure tracking
- Added relations to Tenant, User, UserInvitation models

### Task 2: NotificationService
- `sendTenantRegistrationConfirmation(tenant, owner)` - Creates PENDING notification, calls EmailService, updates to SENT/FAILED
- `sendTenantApprovalNotification(tenant, owner)` - Sends approval email with login URL
- `sendTenantRejectionNotification(tenant, owner, reason)` - Sends rejection email with reason
- `getNotificationHistory(tenantId?, type?, status?)` - Audit trail queries

### Task 3: Email Templates
- `sendTenantRegistrationEmail()` - Branded HTML email, no CTA button
- `sendTenantApprovalEmail()` - Login button CTA with subdomain URL
- `sendTenantRejectionEmail()` - Contact support CTA with rejection reason

### Task 4: Integration with TenantsService
- `registerTenant()` now calls `notificationService.sendTenantRegistrationConfirmation()`
- `approveTenant()` now calls `notificationService.sendTenantApprovalNotification()`
- `rejectTenant()` now calls `notificationService.sendTenantRejectionNotification()`

---

## Key Implementation Patterns

### Notification Record Lifecycle

```typescript
// 1. Create PENDING record
const notification = await this.prisma.notification.create({
  data: {
    type: 'TENANT_APPROVED',
    channel: 'EMAIL',
    recipient: owner.email,
    status: 'PENDING',
    tenantId: tenant.id,
    userId: owner.id,
    metadata: { companyName: tenant.companyName, subdomain: tenant.subdomain },
  },
});

// 2. Attempt email delivery
try {
  await this.emailService.sendTenantApprovalEmail(owner.email, { ... });
  await this.prisma.notification.update({
    where: { id: notification.id },
    data: { status: 'SENT', sentAt: new Date() },
  });
} catch (error) {
  await this.prisma.notification.update({
    where: { id: notification.id },
    data: { status: 'FAILED', errorMessage: error.message },
  });
}
```

### URL Generation

```typescript
const baseUrl = this.configService.get('TENANT_BASE_URL', 'sally.appshore.in');
const useSubdomains = this.configService.get('USE_TENANT_SUBDOMAINS', 'false');

const loginUrl = useSubdomains === 'true'
  ? `https://${subdomain}.${baseUrl}/login`
  : `https://${baseUrl}/login`;
```

---

## Current State

- ✅ Notification model in schema with all relations
- ✅ NotificationService with all 3 tenant lifecycle methods
- ✅ EmailService with branded HTML templates
- ✅ Audit trail with PENDING/SENT/FAILED tracking
- ✅ Configurable URL generation (subdomain vs single-domain)
- ✅ Error handling with errorMessage storage
- ✅ Integrated into TenantsService registration/approval/rejection flows
