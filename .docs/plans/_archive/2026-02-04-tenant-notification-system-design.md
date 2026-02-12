# Tenant Notification System Design

**Date:** February 4, 2026
**Status:** Approved for Implementation
**Estimated Reading Time:** 10 minutes

## Overview

This design document outlines the implementation of a notification system for the tenant registration and approval workflow. The system will send automated emails at key points in the tenant lifecycle while providing a foundation for future communication channels (SMS, push notifications, in-app alerts).

## Goals

1. **Automated Email Notifications:**
   - Send confirmation email when new company registers
   - Send approval email when admin activates tenant
   - Send rejection email when admin rejects tenant (with reason)

2. **Audit Trail:**
   - Track all notifications sent by the system
   - Enable debugging of "email not received" issues
   - Support future features (resend, notification history)

3. **Extensibility:**
   - Architecture supports future channels (SMS, push, in-app)
   - Clean separation between notification logic and delivery channels
   - Consistent branding across all communications

4. **Flexible Deployment:**
   - Support both subdomain-based routing (acme.sally.com) and single-domain (sally.com)
   - Configurable via environment variables

## Current State

### What Exists
- ✅ `EmailService` with Resend/SMTP/Console mode support
- ✅ User invitation email template and flow
- ✅ Tenant registration creates PENDING_APPROVAL tenants
- ✅ Super admin can approve/reject tenants
- ❌ No emails sent on registration/approval/rejection (TODO comments in code)

### What's Missing
- Email notifications for tenant lifecycle events
- Notification tracking/audit trail
- Consistent notification architecture for future features

## Design Decisions

### Decision 1: Email Recipients
**Chosen:** Owner only receives customer-facing emails

- Registration confirmation → Owner who registered
- Approval notification → Owner
- Rejection notification → Owner
- SALLY internal team notified separately (dashboard/internal system)

**Rationale:** Clean separation between customer communication and internal notifications. Easier to manage and scale.

### Decision 2: Notification System Architecture
**Chosen:** NotificationService layer (Option B)

- Create `NotificationService` that orchestrates notification logic
- Uses `EmailService` for email delivery
- Supports multiple channels (email now, SMS/push/in-app later)
- Email templates remain in code (can be externalized later)

**Rationale:** Balance between quick implementation and future extensibility. Clean abstraction without over-engineering.

### Decision 3: Notification Types
**Chosen:** Complete tenant approval flow (Option B)

1. `TENANT_REGISTRATION_CONFIRMATION` - Thank you for registering
2. `TENANT_APPROVED` - Your account is active
3. `TENANT_REJECTED` - Unable to approve (with reason)
4. `USER_INVITATION` - Existing flow (reference only)

**Rationale:** Handle complete tenant lifecycle. Password reset and other features can be added later as separate work.

### Decision 4: Notification Data Storage
**Chosen:** Basic logging with lightweight tracking (Option B)

- Store: type, recipient, status, timestamps, related entity IDs, error messages
- Don't store: full email content (subject/body)
- Keep metadata JSON field for flexibility

**Rationale:** Provides audit trail and debugging capability without database bloat. Email content can be regenerated if needed.

### Decision 5: Email Template Style
**Chosen:** Reuse existing SALLY branded template style (Option A)

- Black header with SALLY wordmark
- "Smart Routes. Confident Dispatchers. Happy Drivers." tagline
- Same button styling and layout structure
- Professional, consistent branding

**Rationale:** Brand consistency builds trust. Users recognize SALLY emails.

### Decision 6: Approval Email CTA
**Chosen:** Both direct link and subdomain reminder (Option C)

- Primary button: Direct login link
- Text reminder: Subdomain and base URL
- Flexible for multi-tenant or single-domain deployments

**Rationale:** Convenience (direct link) + reference value (subdomain reminder).

### Decision 7: Deployment Configuration
**Chosen:** Configurable subdomain vs single-domain routing

Environment variables:
- `TENANT_BASE_URL` - Base domain (e.g., sally.appshore.in)
- `USE_TENANT_SUBDOMAINS` - true/false toggle

**Rationale:** Supports both multi-tenant (subdomains) and single-domain deployments without code changes.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (TenantsService, UserInvitationsService, etc.)             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ calls
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  NotificationService                         │
│  - sendTenantRegistrationConfirmation()                     │
│  - sendTenantApprovalNotification()                         │
│  - sendTenantRejectionNotification()                        │
│  - getNotificationHistory()                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ uses
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     EmailService                             │
│  - sendTenantRegistrationEmail()          [NEW]             │
│  - sendTenantApprovalEmail()              [NEW]             │
│  - sendTenantRejectionEmail()             [NEW]             │
│  - sendUserInvitation()                   [EXISTS]          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ delivers via
                      ▼
┌─────────────────────────────────────────────────────────────┐
│          Email Providers (Resend / SMTP / Console)          │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Flow 1: Tenant Registration
```
User submits registration form
  ↓
POST /api/v1/tenants/register
  ↓
TenantsService.registerTenant()
  ↓
Create tenant (status: PENDING_APPROVAL, isActive: false)
Create owner user (isActive: false)
  ↓
NotificationService.sendTenantRegistrationConfirmation()
  ↓
Create notification record (status: PENDING)
  ↓
EmailService.sendTenantRegistrationEmail()
  ↓
Update notification (status: SENT or FAILED)
  ↓
Return success → redirect to /registration/pending-approval
```

#### Flow 2: Tenant Approval
```
Super Admin clicks "Approve"
  ↓
POST /api/v1/tenants/:tenantId/approve
  ↓
TenantsService.approveTenant()
  ↓
Update tenant (status: ACTIVE, isActive: true)
Activate owner/admin users (isActive: true)
  ↓
NotificationService.sendTenantApprovalNotification()
  ↓
Create notification record (status: PENDING)
  ↓
EmailService.sendTenantApprovalEmail()
  ↓
Update notification (status: SENT or FAILED)
  ↓
Return success to super admin
```

#### Flow 3: Tenant Rejection
```
Super Admin clicks "Reject" → enters reason
  ↓
POST /api/v1/tenants/:tenantId/reject
  ↓
TenantsService.rejectTenant()
  ↓
Update tenant (status: REJECTED, rejectionReason)
  ↓
NotificationService.sendTenantRejectionNotification()
  ↓
Create notification record (status: PENDING)
  ↓
EmailService.sendTenantRejectionEmail()
  ↓
Update notification (status: SENT or FAILED)
  ↓
Return success to super admin
```

## Database Schema

### New Table: Notification

```prisma
model Notification {
  id              Int              @id @default(autoincrement())
  notificationId  String           @unique @default(cuid())

  // Notification details
  type            NotificationType
  channel         NotificationChannel @default(EMAIL)
  recipient       String           // Email address or phone number
  status          NotificationStatus @default(PENDING)

  // Related entities (nullable - depends on notification type)
  tenantId        Int?
  tenant          Tenant?          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  userId          Int?
  user            User?            @relation(fields: [userId], references: [id], onDelete: Cascade)
  invitationId    Int?
  invitation      UserInvitation?  @relation(fields: [invitationId], references: [id], onDelete: Cascade)

  // Metadata
  metadata        Json?            // Flexible field for additional data
  errorMessage    String?          // If status is FAILED
  sentAt          DateTime?

  // Timestamps
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([tenantId])
  @@index([userId])
  @@index([type])
  @@index([status])
  @@index([createdAt])
}

enum NotificationType {
  USER_INVITATION
  TENANT_REGISTRATION_CONFIRMATION
  TENANT_APPROVED
  TENANT_REJECTED
}

enum NotificationChannel {
  EMAIL
  SMS      // Future
  PUSH     // Future
  IN_APP   // Future
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
}
```

### Schema Design Rationale

**Flexible Relationships:**
- `tenantId`, `userId`, `invitationId` are nullable
- Different notification types relate to different entities
- Clean cascade deletions

**Metadata JSON Field:**
- Stores notification-specific data without rigid schema
- Example: `{ companyName, subdomain, rejectionReason }`
- Enables future notification types without schema changes

**Channel Enum:**
- Ready for SMS, push notifications, in-app alerts
- Single table for all notification types across all channels

**Indexes:**
- Fast queries by tenant, type, status, date
- Supports notification history queries
- Enables future admin dashboards

## Email Templates

All templates follow the existing SALLY branded style:
- Black header with SALLY wordmark
- Gray content area with message
- Professional button styling
- Footer with copyright and support info
- Mobile-responsive HTML

### Template 1: Tenant Registration Confirmation

**Email Method:** `EmailService.sendTenantRegistrationEmail()`

**Subject:** `Thank you for registering with SALLY`

**To:** Owner email (person who registered)

**Content:**
```
Hi {firstName},

Thank you for registering {companyName} with SALLY!

We've received your registration and our team is currently reviewing
your application. This typically takes 1-2 business days.

What happens next:
• Our team will verify your company information
• You'll receive an email once your account is approved
• You can then invite your team and start using SALLY

If you have any questions, feel free to contact our support team.

---
SALLY - Smart Routes. Confident Dispatchers. Happy Drivers.
```

**No CTA button** - purely informational

### Template 2: Tenant Approval Notification

**Email Method:** `EmailService.sendTenantApprovalEmail()`

**Subject:** `Welcome to SALLY - Your account is now active!`

**To:** Owner email

**Content:**
```
Hi {firstName},

Great news! Your account for {companyName} has been approved and
is now active.

[Login to SALLY Button] → https://{subdomain}.{baseUrl}/login

Your team's URL: {subdomain}.{baseUrl}
(or visit {baseUrl} and enter subdomain: {subdomain})

Next steps:
1. Invite your dispatchers and drivers
2. Set up your first route
3. Explore the dashboard

Welcome aboard!

---
SALLY - Smart Routes. Confident Dispatchers. Happy Drivers.
```

**Primary CTA:** Green/success-styled "Login to SALLY" button

**Subdomain Handling:**
- If `USE_TENANT_SUBDOMAINS=true`: Show subdomain URL prominently
- If `USE_TENANT_SUBDOMAINS=false`: Show base URL only

### Template 3: Tenant Rejection Notification

**Email Method:** `EmailService.sendTenantRejectionEmail()`

**Subject:** `Update on your SALLY registration`

**To:** Owner email

**Content:**
```
Hi {firstName},

Thank you for your interest in SALLY.

After reviewing your registration for {companyName}, we're unable
to approve your account at this time.

Reason: {rejectionReason}

If you believe this is an error or would like to discuss this
further, please don't hesitate to contact our support team.

[Contact Support Button] → mailto:support@sally.com or support URL

We appreciate your understanding.

---
SALLY - Smart Routes. Confident Dispatchers. Happy Drivers.
```

**Tone:** Empathetic, professional, not harsh
**CTA:** "Contact Support" button

## Service Implementation

### NotificationService API

```typescript
@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  /**
   * Send tenant registration confirmation email
   * Called from: TenantsService.registerTenant()
   */
  async sendTenantRegistrationConfirmation(
    tenantId: string,
    ownerEmail: string,
    ownerFirstName: string,
    companyName: string,
  ): Promise<Notification>

  /**
   * Send tenant approval notification email
   * Called from: TenantsService.approveTenant()
   */
  async sendTenantApprovalNotification(
    tenantId: string,
    ownerEmail: string,
    ownerFirstName: string,
    companyName: string,
    subdomain: string,
  ): Promise<Notification>

  /**
   * Send tenant rejection notification email
   * Called from: TenantsService.rejectTenant()
   */
  async sendTenantRejectionNotification(
    tenantId: string,
    ownerEmail: string,
    ownerFirstName: string,
    companyName: string,
    rejectionReason: string,
  ): Promise<Notification>

  /**
   * Get notification history for a tenant
   * Optional: For admin dashboard
   */
  async getNotificationHistory(
    tenantId: string,
    filters?: { type?: NotificationType; status?: NotificationStatus },
  ): Promise<Notification[]>

  /**
   * Private helper: Create and send notification
   * Internal method used by all public methods
   */
  private async createAndSendNotification(
    type: NotificationType,
    recipient: string,
    emailOptions: SendEmailOptions,
    metadata: any,
  ): Promise<Notification>
}
```

### EmailService Extensions

Add three new public methods to existing `EmailService`:

```typescript
@Injectable()
export class EmailService {
  // ... existing methods ...

  /**
   * Send tenant registration confirmation email
   */
  async sendTenantRegistrationEmail(
    email: string,
    firstName: string,
    companyName: string,
  ): Promise<void>

  /**
   * Send tenant approval notification email
   */
  async sendTenantApprovalEmail(
    email: string,
    firstName: string,
    companyName: string,
    subdomain: string,
  ): Promise<void>

  /**
   * Send tenant rejection notification email
   */
  async sendTenantRejectionEmail(
    email: string,
    firstName: string,
    companyName: string,
    rejectionReason: string,
  ): Promise<void>

  // Private helper methods
  private getLoginUrl(subdomain: string): string
  private getDisplayUrl(subdomain: string): string
}
```

### URL Construction Logic

```typescript
private getLoginUrl(subdomain: string): string {
  const baseUrl = this.configService.get<string>('TENANT_BASE_URL') || 'sally.appshore.in';
  const useSubdomains = this.configService.get<boolean>('USE_TENANT_SUBDOMAINS') !== false; // Default true

  if (useSubdomains) {
    // Multi-tenant: https://acme.sally.appshore.in/login
    return `https://${subdomain}.${baseUrl}/login`;
  } else {
    // Single domain: https://sally.appshore.in/login
    return `https://${baseUrl}/login`;
  }
}

private getDisplayUrl(subdomain: string): string {
  const baseUrl = this.configService.get<string>('TENANT_BASE_URL') || 'sally.appshore.in';
  const useSubdomains = this.configService.get<boolean>('USE_TENANT_SUBDOMAINS') !== false;

  if (useSubdomains) {
    return `${subdomain}.${baseUrl}`;
  } else {
    return baseUrl;
  }
}
```

## Configuration

### Environment Variables

```bash
# Existing (already configured)
RESEND_API_KEY=re_xxxxx              # Resend API key (or leave empty for console mode)
EMAIL_FROM=noreply@sally.com         # From address for all emails
APP_URL=https://sally.appshore.in    # Main application URL

# New (for this feature)
TENANT_BASE_URL=sally.appshore.in    # Base domain for tenant URLs
USE_TENANT_SUBDOMAINS=true           # true = subdomain routing, false = single domain
```

### Configuration Examples

**Production (Multi-tenant with subdomains):**
```bash
TENANT_BASE_URL=sally.com
USE_TENANT_SUBDOMAINS=true
# Result: https://acme.sally.com/login
```

**Development (Single domain for all tenants):**
```bash
TENANT_BASE_URL=sally.appshore.in
USE_TENANT_SUBDOMAINS=false
# Result: https://sally.appshore.in/login
```

**Staging (Subdomain testing):**
```bash
TENANT_BASE_URL=sally-staging.appshore.in
USE_TENANT_SUBDOMAINS=true
# Result: https://acme.sally-staging.appshore.in/login
```

## Error Handling

### Philosophy: Graceful Degradation

**Core Principle:** Email failures should NOT break critical business operations

### Implementation Strategy

1. **Notification failures are logged, not thrown:**
   ```typescript
   try {
     await this.emailService.sendEmail(...);
     notification.status = 'SENT';
   } catch (error) {
     notification.status = 'FAILED';
     notification.errorMessage = error.message;
     this.logger.error(`Failed to send notification: ${error.message}`);
     // Don't throw - allow registration/approval to succeed
   }
   ```

2. **Database records capture failures:**
   - Status: FAILED
   - Error message stored for debugging
   - Admin can view notification history
   - Future: Manual retry capability

3. **User experience:**
   - Registration succeeds even if confirmation email fails
   - Approval succeeds even if welcome email fails
   - User can contact support if they don't receive email
   - Admin can see in dashboard that email failed

## File Structure

### New Files

```
apps/backend/src/
├── services/
│   └── notification/
│       ├── notification.module.ts          # Module definition
│       ├── notification.service.ts         # Main notification service
│       └── dto/
│           └── notification-filters.dto.ts # Query filters
│
└── prisma/
    └── schema.prisma                       # Add Notification model + enums
```

### Modified Files

```
apps/backend/src/
├── common/services/
│   └── email.service.ts                    # Add 3 new template methods
│
├── api/tenants/
│   ├── tenants.module.ts                   # Import NotificationModule
│   └── tenants.service.ts                  # Inject and use NotificationService
│
└── app.module.ts                           # Import NotificationModule globally
```

## Implementation Steps

### Phase 1: Database Setup
1. Add `Notification` model to `schema.prisma`
2. Add enums: `NotificationType`, `NotificationChannel`, `NotificationStatus`
3. Run migration: `npx prisma migrate dev --name add_notifications_table`
4. Verify migration successful

### Phase 2: NotificationService
1. Create `notification/` directory structure
2. Implement `NotificationService` with all public methods
3. Implement private helper `createAndSendNotification()`
4. Create `NotificationModule`
5. Write unit tests for notification logic

### Phase 3: Email Templates
1. Add `sendTenantRegistrationEmail()` to `EmailService`
2. Add `sendTenantApprovalEmail()` to `EmailService`
3. Add `sendTenantRejectionEmail()` to `EmailService`
4. Add helper methods: `getLoginUrl()`, `getDisplayUrl()`
5. Test templates in console mode

### Phase 4: Integration
1. Update `TenantsModule` to import `NotificationModule`
2. Inject `NotificationService` into `TenantsService`
3. Call notification service in `registerTenant()` (line 98)
4. Call notification service in `approveTenant()` (line 178)
5. Call notification service in `rejectTenant()` (line 204)
6. Test full flows end-to-end

### Phase 5: Configuration & Testing
1. Add environment variables to `.env.example`
2. Document configuration options
3. Test with `USE_TENANT_SUBDOMAINS=true`
4. Test with `USE_TENANT_SUBDOMAINS=false`
5. Test email delivery with Resend/SMTP
6. Test error handling (simulated email failures)

### Phase 6: Optional Enhancements
1. Add notification history endpoint (admin only)
2. Add retry capability for failed notifications
3. Add email preview in development mode
4. Update admin dashboard to show notification status

## Testing Strategy

### Unit Tests
- `NotificationService.createAndSendNotification()` - record creation
- `NotificationService.sendTenantRegistrationConfirmation()` - business logic
- Email template rendering (verify HTML structure)
- URL construction logic (subdomain vs single-domain)

### Integration Tests
- Full registration flow → verify notification created and email sent
- Full approval flow → verify notification created and email sent
- Full rejection flow → verify notification created and email sent
- Email failure → verify graceful degradation

### Manual Testing Checklist
- [ ] Register new tenant → receive confirmation email
- [ ] Approve tenant → owner receives approval email with login link
- [ ] Reject tenant → owner receives rejection email with reason
- [ ] Click login link → goes to correct URL (subdomain or base)
- [ ] Test with `USE_TENANT_SUBDOMAINS=true` and `false`
- [ ] Verify emails look good on desktop and mobile
- [ ] Test in light and dark email clients
- [ ] Check spam folders (deliverability test)
- [ ] Simulate email failure → verify core flow still succeeds

## Security Considerations

### Email Security
- Use environment variables for API keys (never commit)
- Validate email addresses before sending
- Rate limiting on notification endpoints (future)
- SPF/DKIM/DMARC records for production domain

### Data Privacy
- Don't include sensitive data in emails (passwords, tokens beyond short-lived)
- Log minimal PII (email address for debugging only)
- Comply with email opt-out regulations (future)

### Error Messages
- Don't expose internal system details in error messages
- Generic "failed to send" messages to end users
- Detailed errors logged server-side only

## Future Enhancements

### Short-term (Next Sprint)
- [ ] Notification history endpoint for admin dashboard
- [ ] Manual retry for failed notifications
- [ ] Email preview in development mode
- [ ] Support email (support@sally.com) auto-responder

### Medium-term (Next Quarter)
- [ ] SMS notifications via Twilio
- [ ] In-app notification bell icon
- [ ] User notification preferences (opt-in/opt-out)
- [ ] Email templates with React Email (easier to maintain)
- [ ] Notification queue with Redis/Bull (reliability)

### Long-term (Future Roadmap)
- [ ] Push notifications (web + mobile)
- [ ] Notification analytics dashboard
- [ ] A/B testing for email templates
- [ ] Multi-language support
- [ ] Scheduled notifications
- [ ] Notification webhooks for integrations

## Success Criteria

### Must Have (MVP)
✅ Tenant registration sends confirmation email
✅ Tenant approval sends welcome email with login link
✅ Tenant rejection sends notification with reason
✅ All notifications tracked in database
✅ Email failures don't break core flows
✅ Consistent SALLY branding across all emails
✅ Support subdomain and single-domain configurations

### Nice to Have (V1.1)
- Notification history visible in admin dashboard
- Manual retry for failed notifications
- Email preview in development mode

### Future
- SMS notifications
- In-app notifications
- Push notifications

## Open Questions

*None - all design decisions have been made and approved.*

## Appendix

### Related Files
- `apps/backend/src/common/services/email.service.ts` - Existing email service
- `apps/backend/src/api/tenants/tenants.service.ts` - Tenant management (lines 98, 178, 204)
- `apps/backend/src/api/user-invitations/user-invitations.service.ts` - Existing invitation flow
- `apps/backend/EMAIL_SETUP.md` - Email configuration documentation

### References
- Resend API: https://resend.com/docs
- Prisma Schema: https://www.prisma.io/docs/concepts/components/prisma-schema
- NestJS Modules: https://docs.nestjs.com/modules

---

**Design Approved By:** Product Owner
**Ready for Implementation:** Yes
**Next Step:** Create git worktree and begin Phase 1 (Database Setup)
