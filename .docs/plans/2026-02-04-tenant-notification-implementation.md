# Tenant Notification System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement automated email notifications for tenant registration, approval, and rejection with audit trail tracking.

**Architecture:** Create NotificationService layer that orchestrates notification logic, uses EmailService for delivery, and stores notification records in Postgres. Email templates follow existing SALLY branding.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, TypeScript, Resend/Nodemailer

---

## Phase 1: Database Schema

### Task 1: Add Notification Model to Prisma Schema

**Files:**
- Modify: `apps/backend/prisma/schema.prisma` (append to end of file)

**Step 1: Add notification enums and model**

Add these enums and model to the end of `schema.prisma`:

```prisma
// ============================================================================
// NOTIFICATION MODELS
// ============================================================================

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

model Notification {
  id              Int                 @id @default(autoincrement())
  notificationId  String              @unique @default(cuid()) @map("notification_id") @db.VarChar(50)

  // Notification details
  type            NotificationType
  channel         NotificationChannel @default(EMAIL)
  recipient       String              @db.VarChar(255)
  status          NotificationStatus  @default(PENDING)

  // Related entities (nullable - depends on notification type)
  tenantId        Int?                @map("tenant_id")
  tenant          Tenant?             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  userId          Int?                @map("user_id")
  user            User?               @relation(fields: [userId], references: [id], onDelete: Cascade)
  invitationId    Int?                @map("invitation_id")
  invitation      UserInvitation?     @relation(fields: [invitationId], references: [id], onDelete: Cascade)

  // Metadata
  metadata        Json?               // Flexible field for additional data
  errorMessage    String?             @map("error_message") @db.Text
  sentAt          DateTime?           @map("sent_at")

  // Timestamps
  createdAt       DateTime            @default(now()) @map("created_at")
  updatedAt       DateTime            @updatedAt @map("updated_at")

  @@index([tenantId])
  @@index([userId])
  @@index([type])
  @@index([status])
  @@index([createdAt])
  @@map("notifications")
}
```

**Step 2: Add Notification relation to Tenant model**

Find the `Tenant` model and add this relation:

```prisma
model Tenant {
  // ... existing fields ...

  notifications      Notification[]

  // ... rest of model ...
}
```

**Step 3: Add Notification relation to User model**

Find the `User` model and add this relation:

```prisma
model User {
  // ... existing fields ...

  notifications      Notification[]

  // ... rest of model ...
}
```

**Step 4: Add Notification relation to UserInvitation model**

Find the `UserInvitation` model and add this relation:

```prisma
model UserInvitation {
  // ... existing fields ...

  notifications      Notification[]

  // ... rest of model ...
}
```

**Step 5: Generate Prisma migration**

Run:
```bash
cd apps/backend
npx prisma migrate dev --name add_notifications_table
```

Expected: Migration file created and applied successfully

**Step 6: Verify migration**

Run:
```bash
npx prisma db push
npx prisma generate
```

Expected: Schema synced and Prisma client regenerated

**Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add Notification model with enums and relations

Add notification tracking table for audit trail with support for
multiple channels (EMAIL, SMS, PUSH, IN_APP). Includes relations
to Tenant, User, and UserInvitation models.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: NotificationService - Core Infrastructure

### Task 2: Create NotificationService Module Structure

**Files:**
- Create: `apps/backend/src/services/notification/notification.service.ts`
- Create: `apps/backend/src/services/notification/notification.module.ts`
- Create: `apps/backend/src/services/notification/dto/notification-filters.dto.ts`

**Step 1: Create DTO for notification filters**

Create `apps/backend/src/services/notification/dto/notification-filters.dto.ts`:

```typescript
import { IsOptional, IsEnum } from 'class-validator';
import { NotificationType, NotificationStatus } from '@prisma/client';

export class NotificationFiltersDto {
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;
}
```

**Step 2: Create NotificationService skeleton**

Create `apps/backend/src/services/notification/notification.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/services/email.service';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  Notification,
} from '@prisma/client';
import { NotificationFiltersDto } from './dto/notification-filters.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  /**
   * Send tenant registration confirmation email
   */
  async sendTenantRegistrationConfirmation(
    tenantId: string,
    ownerEmail: string,
    ownerFirstName: string,
    companyName: string,
  ): Promise<Notification> {
    // TODO: Implement in next task
    throw new Error('Not implemented');
  }

  /**
   * Send tenant approval notification email
   */
  async sendTenantApprovalNotification(
    tenantId: string,
    ownerEmail: string,
    ownerFirstName: string,
    companyName: string,
    subdomain: string,
  ): Promise<Notification> {
    // TODO: Implement in next task
    throw new Error('Not implemented');
  }

  /**
   * Send tenant rejection notification email
   */
  async sendTenantRejectionNotification(
    tenantId: string,
    ownerEmail: string,
    ownerFirstName: string,
    companyName: string,
    rejectionReason: string,
  ): Promise<Notification> {
    // TODO: Implement in next task
    throw new Error('Not implemented');
  }

  /**
   * Get notification history for a tenant
   */
  async getNotificationHistory(
    tenantId: string,
    filters?: NotificationFiltersDto,
  ): Promise<Notification[]> {
    // Get tenant database ID from tenantId string
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId },
    });

    if (!tenant) {
      return [];
    }

    return this.prisma.notification.findMany({
      where: {
        tenantId: tenant.id,
        ...(filters?.type && { type: filters.type }),
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Private helper: Create and send notification
   */
  private async createAndSendNotification(
    type: NotificationType,
    recipient: string,
    metadata: any,
    emailSender: () => Promise<void>,
  ): Promise<Notification> {
    // TODO: Implement in next task
    throw new Error('Not implemented');
  }
}
```

**Step 3: Create NotificationModule**

Create `apps/backend/src/services/notification/notification.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailService } from '../../common/services/email.service';

@Module({
  imports: [PrismaModule],
  providers: [NotificationService, EmailService],
  exports: [NotificationService],
})
export class NotificationModule {}
```

**Step 4: Register NotificationModule in AppModule**

Modify `apps/backend/src/app.module.ts`:

Find the `imports` array and add `NotificationModule`:

```typescript
import { NotificationModule } from './services/notification/notification.module';

@Module({
  imports: [
    // ... existing imports ...
    NotificationModule, // Add this
  ],
  // ... rest of module ...
})
```

**Step 5: Build to verify no TypeScript errors**

Run:
```bash
cd apps/backend
npm run build
```

Expected: Build succeeds with no errors

**Step 6: Commit**

```bash
git add src/services/notification/ src/app.module.ts
git commit -m "feat(notification): add NotificationService module skeleton

Create notification service infrastructure with placeholder methods
for tenant lifecycle notifications. Includes DTO for filtering and
module registration.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Implement Core createAndSendNotification Helper

**Files:**
- Modify: `apps/backend/src/services/notification/notification.service.ts`

**Step 1: Write test for createAndSendNotification**

Create `apps/backend/src/services/notification/__tests__/notification.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../notification.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from '../../../common/services/email.service';
import { NotificationType, NotificationStatus } from '@prisma/client';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: PrismaService;
  let emailService: EmailService;

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'TENANT_BASE_URL') return 'sally.appshore.in';
      if (key === 'USE_TENANT_SUBDOMAINS') return true;
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAndSendNotification', () => {
    it('should create notification, send email, and update status to SENT', async () => {
      const mockNotification = {
        id: 1,
        notificationId: 'notif_123',
        type: NotificationType.TENANT_REGISTRATION_CONFIRMATION,
        recipient: 'test@example.com',
        status: NotificationStatus.PENDING,
        tenantId: 1,
        metadata: { companyName: 'Test Co' },
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue({
        ...mockNotification,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      // Access private method via reflection for testing
      const result = await (service as any).createAndSendNotification(
        NotificationType.TENANT_REGISTRATION_CONFIRMATION,
        'test@example.com',
        { companyName: 'Test Co', tenantId: 1 },
        async () => {
          await emailService.sendEmail({
            to: 'test@example.com',
            subject: 'Test',
            html: '<p>Test</p>',
          });
        },
      );

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.TENANT_REGISTRATION_CONFIRMATION,
          recipient: 'test@example.com',
          status: NotificationStatus.PENDING,
          channel: 'EMAIL',
        }),
      });

      expect(mockEmailService.sendEmail).toHaveBeenCalled();
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotification.id },
        data: expect.objectContaining({
          status: NotificationStatus.SENT,
          sentAt: expect.any(Date),
        }),
      });

      expect(result.status).toBe(NotificationStatus.SENT);
    });

    it('should mark notification as FAILED if email sending fails', async () => {
      const mockNotification = {
        id: 1,
        notificationId: 'notif_123',
        type: NotificationType.TENANT_REGISTRATION_CONFIRMATION,
        recipient: 'test@example.com',
        status: NotificationStatus.PENDING,
        tenantId: 1,
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue({
        ...mockNotification,
        status: NotificationStatus.FAILED,
        errorMessage: 'Email service error',
      });
      mockEmailService.sendEmail.mockRejectedValue(
        new Error('Email service error'),
      );

      const result = await (service as any).createAndSendNotification(
        NotificationType.TENANT_REGISTRATION_CONFIRMATION,
        'test@example.com',
        { companyName: 'Test Co', tenantId: 1 },
        async () => {
          await emailService.sendEmail({
            to: 'test@example.com',
            subject: 'Test',
            html: '<p>Test</p>',
          });
        },
      );

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotification.id },
        data: expect.objectContaining({
          status: NotificationStatus.FAILED,
          errorMessage: 'Email service error',
        }),
      });

      expect(result.status).toBe(NotificationStatus.FAILED);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd apps/backend
npm test -- notification.service.spec.ts
```

Expected: Tests FAIL with "Not implemented" error

**Step 3: Implement createAndSendNotification**

Modify `apps/backend/src/services/notification/notification.service.ts`:

Replace the private method implementation:

```typescript
/**
 * Private helper: Create and send notification
 */
private async createAndSendNotification(
  type: NotificationType,
  recipient: string,
  metadata: any,
  emailSender: () => Promise<void>,
): Promise<Notification> {
  // Extract tenant ID from metadata
  const tenantId = metadata.tenantId || null;
  const userId = metadata.userId || null;
  const invitationId = metadata.invitationId || null;

  // Create notification record with PENDING status
  const notification = await this.prisma.notification.create({
    data: {
      type,
      channel: NotificationChannel.EMAIL,
      recipient,
      status: NotificationStatus.PENDING,
      tenantId,
      userId,
      invitationId,
      metadata,
    },
  });

  try {
    // Attempt to send email
    await emailSender();

    // Update notification status to SENT
    const updatedNotification = await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
    });

    this.logger.log(
      `Notification sent successfully: ${type} to ${recipient}`,
    );

    return updatedNotification;
  } catch (error) {
    // Update notification status to FAILED with error message
    const failedNotification = await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: NotificationStatus.FAILED,
        errorMessage: error.message,
      },
    });

    this.logger.error(
      `Failed to send notification: ${type} to ${recipient}`,
      error.message,
    );

    // Don't throw - allow business logic to continue
    return failedNotification;
  }
}
```

**Step 4: Run tests to verify they pass**

Run:
```bash
cd apps/backend
npm test -- notification.service.spec.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/services/notification/
git commit -m "feat(notification): implement createAndSendNotification helper

Add core notification creation and sending logic with graceful error
handling. Creates PENDING record, sends email, updates to SENT or
FAILED. Includes comprehensive unit tests.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Email Service Extensions

### Task 4: Add URL Helper Methods to EmailService

**Files:**
- Modify: `apps/backend/src/common/services/email.service.ts`

**Step 1: Add helper methods to EmailService**

Add these private methods to `EmailService` class (before the closing brace):

```typescript
/**
 * Get login URL (subdomain-aware or single domain)
 */
private getLoginUrl(subdomain: string): string {
  const baseUrl =
    this.configService.get<string>('TENANT_BASE_URL') || 'sally.appshore.in';
  const useSubdomains =
    this.configService.get<boolean>('USE_TENANT_SUBDOMAINS') !== false; // Default true

  if (useSubdomains) {
    // Multi-tenant: https://acme.sally.appshore.in/login
    return `https://${subdomain}.${baseUrl}/login`;
  } else {
    // Single domain: https://sally.appshore.in/login
    return `https://${baseUrl}/login`;
  }
}

/**
 * Get display URL for emails (subdomain or base URL)
 */
private getDisplayUrl(subdomain: string): string {
  const baseUrl =
    this.configService.get<string>('TENANT_BASE_URL') || 'sally.appshore.in';
  const useSubdomains =
    this.configService.get<boolean>('USE_TENANT_SUBDOMAINS') !== false;

  if (useSubdomains) {
    return `${subdomain}.${baseUrl}`;
  } else {
    return baseUrl;
  }
}

/**
 * Get subdomain instruction text for emails
 */
private getSubdomainInstructionText(subdomain: string): string {
  const baseUrl =
    this.configService.get<string>('TENANT_BASE_URL') || 'sally.appshore.in';
  const useSubdomains =
    this.configService.get<boolean>('USE_TENANT_SUBDOMAINS') !== false;

  if (useSubdomains) {
    return `Or visit ${baseUrl} and enter your subdomain: <strong>${subdomain}</strong>`;
  } else {
    return `Visit <strong>${baseUrl}</strong> to login`;
  }
}
```

**Step 2: Update .env.example with new variables**

Add to `apps/backend/.env.example`:

```bash
# Tenant subdomain configuration
TENANT_BASE_URL=sally.appshore.in
USE_TENANT_SUBDOMAINS=true
```

**Step 3: Build to verify no errors**

Run:
```bash
cd apps/backend
npm run build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/common/services/email.service.ts .env.example
git commit -m "feat(email): add URL helper methods for subdomain support

Add getLoginUrl(), getDisplayUrl(), and getSubdomainInstructionText()
helpers to support flexible subdomain vs single-domain deployments.
Configurable via TENANT_BASE_URL and USE_TENANT_SUBDOMAINS env vars.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Add Tenant Registration Confirmation Email Template

**Files:**
- Modify: `apps/backend/src/common/services/email.service.ts`

**Step 1: Add sendTenantRegistrationEmail method**

Add this public method to `EmailService` class (after `sendUserInvitation` method):

```typescript
/**
 * Send tenant registration confirmation email
 */
async sendTenantRegistrationEmail(
  email: string,
  firstName: string,
  companyName: string,
): Promise<void> {
  const subject = `Thank you for registering with SALLY`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SALLY</h1>
            <p>Smart Routes. Confident Dispatchers. Happy Drivers.</p>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>Thank you for registering <strong>${companyName}</strong> with SALLY!</p>
            <p>We've received your registration and our team is currently reviewing your application. This typically takes <strong>1-2 business days</strong>.</p>
            <h3>What happens next:</h3>
            <ul>
              <li>Our team will verify your company information</li>
              <li>You'll receive an email once your account is approved</li>
              <li>You can then invite your team and start using SALLY</li>
            </ul>
            <p>If you have any questions, feel free to contact our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 SALLY. All rights reserved.</p>
            <p>If you didn't register for SALLY, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hi ${firstName},

Thank you for registering ${companyName} with SALLY!

We've received your registration and our team is currently reviewing your application. This typically takes 1-2 business days.

What happens next:
• Our team will verify your company information
• You'll receive an email once your account is approved
• You can then invite your team and start using SALLY

If you have any questions, feel free to contact our support team.

---
SALLY - Smart Routes. Confident Dispatchers. Happy Drivers.
  `.trim();

  await this.sendEmail({ to: email, subject, html, text });
}
```

**Step 2: Build to verify no errors**

Run:
```bash
cd apps/backend
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/common/services/email.service.ts
git commit -m "feat(email): add tenant registration confirmation template

Add sendTenantRegistrationEmail() with professional branded template.
Sends confirmation email to company owner after registration with
1-2 business day review expectation.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Add Tenant Approval Email Template

**Files:**
- Modify: `apps/backend/src/common/services/email.service.ts`

**Step 1: Add sendTenantApprovalEmail method**

Add this public method to `EmailService` class:

```typescript
/**
 * Send tenant approval notification email
 */
async sendTenantApprovalEmail(
  email: string,
  firstName: string,
  companyName: string,
  subdomain: string,
): Promise<void> {
  const loginUrl = this.getLoginUrl(subdomain);
  const displayUrl = this.getDisplayUrl(subdomain);
  const subdomainInstructions = this.getSubdomainInstructionText(subdomain);

  const subject = `Welcome to SALLY - Your account is now active!`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #000;
            color: #fff;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .info-box {
            background-color: #fff;
            border: 2px solid #000;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SALLY</h1>
            <p>Smart Routes. Confident Dispatchers. Happy Drivers.</p>
          </div>
          <div class="content">
            <h2>Congratulations, ${firstName}! 🎉</h2>
            <p>Your account for <strong>${companyName}</strong> has been approved and is now active.</p>
            <p>You can now access SALLY and start managing your fleet operations.</p>
            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Login to SALLY</a>
            </div>
            <div class="info-box">
              <strong>Your team's URL:</strong><br>
              ${displayUrl}
              <br><br>
              <span style="color: #666; font-size: 14px;">${subdomainInstructions}</span>
            </div>
            <h3>Next steps:</h3>
            <ul>
              <li>Invite your dispatchers and drivers</li>
              <li>Set up your first route</li>
              <li>Explore the dashboard and features</li>
            </ul>
            <p>Welcome aboard! If you have any questions, our support team is here to help.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 SALLY. All rights reserved.</p>
            <p>Need help? Contact us at support@sally.com</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hi ${firstName},

Congratulations! Your account for ${companyName} has been approved and is now active.

Login to SALLY: ${loginUrl}

Your team's URL: ${displayUrl}

Next steps:
• Invite your dispatchers and drivers
• Set up your first route
• Explore the dashboard and features

Welcome aboard! If you have any questions, our support team is here to help.

---
SALLY - Smart Routes. Confident Dispatchers. Happy Drivers.
  `.trim();

  await this.sendEmail({ to: email, subject, html, text });
}
```

**Step 2: Build to verify no errors**

Run:
```bash
cd apps/backend
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/common/services/email.service.ts
git commit -m "feat(email): add tenant approval notification template

Add sendTenantApprovalEmail() with login button and subdomain info.
Includes congratulations message, direct login link, and next steps
for getting started with SALLY.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Add Tenant Rejection Email Template

**Files:**
- Modify: `apps/backend/src/common/services/email.service.ts`

**Step 1: Add sendTenantRejectionEmail method**

Add this public method to `EmailService` class:

```typescript
/**
 * Send tenant rejection notification email
 */
async sendTenantRejectionEmail(
  email: string,
  firstName: string,
  companyName: string,
  rejectionReason: string,
): Promise<void> {
  const subject = `Update on your SALLY registration`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #666;
            color: #fff;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .reason-box {
            background-color: #fff;
            border-left: 4px solid #666;
            padding: 15px;
            margin: 20px 0;
          }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SALLY</h1>
            <p>Smart Routes. Confident Dispatchers. Happy Drivers.</p>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>Thank you for your interest in SALLY.</p>
            <p>After reviewing your registration for <strong>${companyName}</strong>, we're unable to approve your account at this time.</p>
            <div class="reason-box">
              <strong>Reason:</strong><br>
              ${rejectionReason}
            </div>
            <p>If you believe this is an error or would like to discuss this further, please don't hesitate to contact our support team.</p>
            <div style="text-align: center;">
              <a href="mailto:support@sally.com" class="button">Contact Support</a>
            </div>
            <p>We appreciate your understanding.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 SALLY. All rights reserved.</p>
            <p>Questions? Email us at support@sally.com</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hi ${firstName},

Thank you for your interest in SALLY.

After reviewing your registration for ${companyName}, we're unable to approve your account at this time.

Reason: ${rejectionReason}

If you believe this is an error or would like to discuss this further, please don't hesitate to contact our support team at support@sally.com.

We appreciate your understanding.

---
SALLY - Smart Routes. Confident Dispatchers. Happy Drivers.
  `.trim();

  await this.sendEmail({ to: email, subject, html, text });
}
```

**Step 2: Build to verify no errors**

Run:
```bash
cd apps/backend
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/common/services/email.service.ts
git commit -m "feat(email): add tenant rejection notification template

Add sendTenantRejectionEmail() with empathetic messaging and support
contact. Includes rejection reason display and professional tone.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: NotificationService - Method Implementations

### Task 8: Implement sendTenantRegistrationConfirmation

**Files:**
- Modify: `apps/backend/src/services/notification/notification.service.ts`
- Modify: `apps/backend/src/services/notification/__tests__/notification.service.spec.ts`

**Step 1: Add test for sendTenantRegistrationConfirmation**

Add to the test file (in the `describe('NotificationService')` block):

```typescript
describe('sendTenantRegistrationConfirmation', () => {
  it('should send registration confirmation email and create notification', async () => {
    const mockTenant = { id: 1, tenantId: 'tenant_123' };
    const mockNotification = {
      id: 1,
      notificationId: 'notif_123',
      type: NotificationType.TENANT_REGISTRATION_CONFIRMATION,
      recipient: 'owner@test.com',
      status: NotificationStatus.SENT,
      tenantId: 1,
      metadata: { companyName: 'Test Co', tenantId: 1 },
      sentAt: new Date(),
    };

    mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);
    mockPrismaService.notification.create.mockResolvedValue({
      ...mockNotification,
      status: NotificationStatus.PENDING,
    });
    mockPrismaService.notification.update.mockResolvedValue(mockNotification);
    mockEmailService.sendTenantRegistrationEmail = jest
      .fn()
      .mockResolvedValue(undefined);

    const result = await service.sendTenantRegistrationConfirmation(
      'tenant_123',
      'owner@test.com',
      'John',
      'Test Co',
    );

    expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_123' },
    });
    expect(mockEmailService.sendTenantRegistrationEmail).toHaveBeenCalledWith(
      'owner@test.com',
      'John',
      'Test Co',
    );
    expect(result.status).toBe(NotificationStatus.SENT);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd apps/backend
npm test -- notification.service.spec.ts
```

Expected: Test FAILS with "Not implemented"

**Step 3: Implement sendTenantRegistrationConfirmation**

Replace the method in `notification.service.ts`:

```typescript
/**
 * Send tenant registration confirmation email
 */
async sendTenantRegistrationConfirmation(
  tenantId: string,
  ownerEmail: string,
  ownerFirstName: string,
  companyName: string,
): Promise<Notification> {
  // Get tenant database ID from tenantId string
  const tenant = await this.prisma.tenant.findUnique({
    where: { tenantId },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  // Prepare metadata
  const metadata = {
    tenantId: tenant.id,
    companyName,
  };

  // Create notification and send email
  return this.createAndSendNotification(
    NotificationType.TENANT_REGISTRATION_CONFIRMATION,
    ownerEmail,
    metadata,
    async () => {
      await this.emailService.sendTenantRegistrationEmail(
        ownerEmail,
        ownerFirstName,
        companyName,
      );
    },
  );
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd apps/backend
npm test -- notification.service.spec.ts
```

Expected: Test PASSES

**Step 5: Commit**

```bash
git add src/services/notification/
git commit -m "feat(notification): implement sendTenantRegistrationConfirmation

Add registration confirmation notification with email sending and
notification tracking. Includes unit test coverage.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Implement sendTenantApprovalNotification

**Files:**
- Modify: `apps/backend/src/services/notification/notification.service.ts`
- Modify: `apps/backend/src/services/notification/__tests__/notification.service.spec.ts`

**Step 1: Add test for sendTenantApprovalNotification**

Add to the test file:

```typescript
describe('sendTenantApprovalNotification', () => {
  it('should send approval email with login link and create notification', async () => {
    const mockTenant = {
      id: 1,
      tenantId: 'tenant_123',
      subdomain: 'testco',
    };
    const mockNotification = {
      id: 2,
      notificationId: 'notif_456',
      type: NotificationType.TENANT_APPROVED,
      recipient: 'owner@test.com',
      status: NotificationStatus.SENT,
      tenantId: 1,
      metadata: { companyName: 'Test Co', subdomain: 'testco', tenantId: 1 },
      sentAt: new Date(),
    };

    mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);
    mockPrismaService.notification.create.mockResolvedValue({
      ...mockNotification,
      status: NotificationStatus.PENDING,
    });
    mockPrismaService.notification.update.mockResolvedValue(mockNotification);
    mockEmailService.sendTenantApprovalEmail = jest
      .fn()
      .mockResolvedValue(undefined);

    const result = await service.sendTenantApprovalNotification(
      'tenant_123',
      'owner@test.com',
      'John',
      'Test Co',
      'testco',
    );

    expect(mockEmailService.sendTenantApprovalEmail).toHaveBeenCalledWith(
      'owner@test.com',
      'John',
      'Test Co',
      'testco',
    );
    expect(result.status).toBe(NotificationStatus.SENT);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd apps/backend
npm test -- notification.service.spec.ts
```

Expected: Test FAILS

**Step 3: Implement sendTenantApprovalNotification**

Replace the method:

```typescript
/**
 * Send tenant approval notification email
 */
async sendTenantApprovalNotification(
  tenantId: string,
  ownerEmail: string,
  ownerFirstName: string,
  companyName: string,
  subdomain: string,
): Promise<Notification> {
  // Get tenant database ID from tenantId string
  const tenant = await this.prisma.tenant.findUnique({
    where: { tenantId },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  // Prepare metadata
  const metadata = {
    tenantId: tenant.id,
    companyName,
    subdomain,
  };

  // Create notification and send email
  return this.createAndSendNotification(
    NotificationType.TENANT_APPROVED,
    ownerEmail,
    metadata,
    async () => {
      await this.emailService.sendTenantApprovalEmail(
        ownerEmail,
        ownerFirstName,
        companyName,
        subdomain,
      );
    },
  );
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd apps/backend
npm test -- notification.service.spec.ts
```

Expected: Test PASSES

**Step 5: Commit**

```bash
git add src/services/notification/
git commit -m "feat(notification): implement sendTenantApprovalNotification

Add approval notification with login link and subdomain info. Includes
unit test coverage for successful email delivery.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 10: Implement sendTenantRejectionNotification

**Files:**
- Modify: `apps/backend/src/services/notification/notification.service.ts`
- Modify: `apps/backend/src/services/notification/__tests__/notification.service.spec.ts`

**Step 1: Add test for sendTenantRejectionNotification**

Add to the test file:

```typescript
describe('sendTenantRejectionNotification', () => {
  it('should send rejection email with reason and create notification', async () => {
    const mockTenant = { id: 1, tenantId: 'tenant_123' };
    const mockNotification = {
      id: 3,
      notificationId: 'notif_789',
      type: NotificationType.TENANT_REJECTED,
      recipient: 'owner@test.com',
      status: NotificationStatus.SENT,
      tenantId: 1,
      metadata: {
        companyName: 'Test Co',
        rejectionReason: 'Invalid DOT number',
        tenantId: 1,
      },
      sentAt: new Date(),
    };

    mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);
    mockPrismaService.notification.create.mockResolvedValue({
      ...mockNotification,
      status: NotificationStatus.PENDING,
    });
    mockPrismaService.notification.update.mockResolvedValue(mockNotification);
    mockEmailService.sendTenantRejectionEmail = jest
      .fn()
      .mockResolvedValue(undefined);

    const result = await service.sendTenantRejectionNotification(
      'tenant_123',
      'owner@test.com',
      'John',
      'Test Co',
      'Invalid DOT number',
    );

    expect(mockEmailService.sendTenantRejectionEmail).toHaveBeenCalledWith(
      'owner@test.com',
      'John',
      'Test Co',
      'Invalid DOT number',
    );
    expect(result.status).toBe(NotificationStatus.SENT);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd apps/backend
npm test -- notification.service.spec.ts
```

Expected: Test FAILS

**Step 3: Implement sendTenantRejectionNotification**

Replace the method:

```typescript
/**
 * Send tenant rejection notification email
 */
async sendTenantRejectionNotification(
  tenantId: string,
  ownerEmail: string,
  ownerFirstName: string,
  companyName: string,
  rejectionReason: string,
): Promise<Notification> {
  // Get tenant database ID from tenantId string
  const tenant = await this.prisma.tenant.findUnique({
    where: { tenantId },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  // Prepare metadata
  const metadata = {
    tenantId: tenant.id,
    companyName,
    rejectionReason,
  };

  // Create notification and send email
  return this.createAndSendNotification(
    NotificationType.TENANT_REJECTED,
    ownerEmail,
    metadata,
    async () => {
      await this.emailService.sendTenantRejectionEmail(
        ownerEmail,
        ownerFirstName,
        companyName,
        rejectionReason,
      );
    },
  );
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd apps/backend
npm test -- notification.service.spec.ts
```

Expected: Test PASSES

**Step 5: Commit**

```bash
git add src/services/notification/
git commit -m "feat(notification): implement sendTenantRejectionNotification

Add rejection notification with reason display and support contact.
Includes unit test coverage for empathetic messaging flow.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 5: Integration with TenantsService

### Task 11: Integrate NotificationService into TenantsService

**Files:**
- Modify: `apps/backend/src/api/tenants/tenants.service.ts`
- Modify: `apps/backend/src/api/tenants/tenants.module.ts`

**Step 1: Import NotificationModule in TenantsModule**

Modify `apps/backend/src/api/tenants/tenants.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../../services/notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
```

**Step 2: Inject NotificationService in TenantsService**

Modify `apps/backend/src/api/tenants/tenants.service.ts`:

Add import at top:
```typescript
import { NotificationService } from '../../services/notification/notification.service';
```

Update constructor:
```typescript
constructor(
  private prisma: PrismaService,
  private notificationService: NotificationService,
) {}
```

**Step 3: Add notification to registerTenant method**

Find the `registerTenant` method and replace the TODO comment (around line 98):

```typescript
// Send registration confirmation email
await this.notificationService.sendTenantRegistrationConfirmation(
  result.tenant.tenantId,
  dto.email,
  dto.firstName,
  result.tenant.companyName,
);
```

**Step 4: Add notification to approveTenant method**

Find the `approveTenant` method and replace the TODO comment (around line 178):

```typescript
// Send approval email to owner
const ownerUser = tenant.users.find((u) => u.role === 'OWNER');
if (ownerUser) {
  await this.notificationService.sendTenantApprovalNotification(
    tenantId,
    ownerUser.email,
    ownerUser.firstName,
    result.companyName,
    result.subdomain || tenantId,
  );
}
```

**Step 5: Add notification to rejectTenant method**

Find the `rejectTenant` method and replace the TODO comment (around line 204):

```typescript
// Send rejection email to owner
const ownerUser = tenant.users?.find((u) => u.role === 'OWNER');
if (ownerUser) {
  await this.notificationService.sendTenantRejectionNotification(
    tenantId,
    ownerUser.email,
    ownerUser.firstName,
    tenant.companyName,
    reason,
  );
}
```

Note: Also need to fetch owner user for rejection - add before the update:

```typescript
const tenant = await this.prisma.tenant.findUnique({
  where: { tenantId },
  include: {
    users: {
      where: { role: 'OWNER' },
    },
  },
});
```

**Step 6: Build to verify no errors**

Run:
```bash
cd apps/backend
npm run build
```

Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/api/tenants/
git commit -m "feat(tenants): integrate notification service into tenant lifecycle

Add email notifications to registerTenant(), approveTenant(), and
rejectTenant() methods. Sends confirmation, approval, and rejection
emails automatically during tenant lifecycle events.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 6: Testing & Documentation

### Task 12: Manual End-to-End Testing

**Files:**
- None (manual testing)

**Step 1: Start the backend server**

Run:
```bash
cd apps/backend
npm run start:dev
```

Expected: Server starts on port 8000

**Step 2: Test tenant registration flow**

Use curl or Postman to register a new tenant:

```bash
curl -X POST http://localhost:8000/api/v1/tenants/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Transport Co",
    "subdomain": "test-transport",
    "dotNumber": "12345678",
    "fleetSize": "SIZE_11_50",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@testco.com",
    "phone": "(555) 123-4567",
    "firebaseUid": "firebase_test_123"
  }'
```

Expected:
- Response: 200 OK with tenantId
- Console logs: Email sent (console mode) or actual email sent
- Database: Notification record created with status SENT

**Step 3: Check notification was created**

Query the database:
```bash
cd apps/backend
npx prisma studio
```

Navigate to Notifications table and verify:
- Type: TENANT_REGISTRATION_CONFIRMATION
- Recipient: john@testco.com
- Status: SENT
- Metadata contains companyName

**Step 4: Test approval flow**

First, get super admin token (if needed), then approve tenant:

```bash
curl -X POST http://localhost:8000/api/v1/tenants/{tenantId}/approve \
  -H "Authorization: Bearer {super_admin_token}"
```

Expected:
- Response: 200 OK
- Console logs: Approval email sent
- Database: New notification record with type TENANT_APPROVED

**Step 5: Test rejection flow**

Register another tenant and reject it:

```bash
curl -X POST http://localhost:8000/api/v1/tenants/{tenantId}/reject \
  -H "Authorization: Bearer {super_admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Invalid DOT number"}'
```

Expected:
- Response: 200 OK
- Console logs: Rejection email sent with reason
- Database: Notification record with type TENANT_REJECTED

**Step 6: Verify notification history endpoint**

Query notification history for a tenant:

```bash
curl http://localhost:8000/api/v1/tenants/{tenantId}/notifications \
  -H "Authorization: Bearer {tenant_admin_token}"
```

Note: This endpoint may not exist yet - skip if not implemented

**Step 7: Document test results**

Create notes:
- [ ] Registration email sent successfully
- [ ] Approval email sent with correct login link
- [ ] Rejection email sent with reason
- [ ] All notifications recorded in database
- [ ] Email templates render correctly
- [ ] Subdomain URLs generated correctly (if USE_TENANT_SUBDOMAINS=true)

---

### Task 13: Update Documentation

**Files:**
- Modify: `apps/backend/EMAIL_SETUP.md`
- Create: `apps/backend/NOTIFICATION_SYSTEM.md`

**Step 1: Update EMAIL_SETUP.md**

Add section at the end of `apps/backend/EMAIL_SETUP.md`:

```markdown
## Notification System

### Automated Emails

The system now sends automated emails for:

1. **Tenant Registration Confirmation**
   - Sent when: Company registers
   - Recipient: Owner who registered
   - Content: Thank you message, review timeline

2. **Tenant Approval Notification**
   - Sent when: Super admin approves tenant
   - Recipient: Owner
   - Content: Congratulations, login link, next steps

3. **Tenant Rejection Notification**
   - Sent when: Super admin rejects tenant
   - Recipient: Owner
   - Content: Empathetic message, rejection reason, support contact

### Configuration

Add these environment variables:

```bash
# Tenant subdomain configuration
TENANT_BASE_URL=sally.appshore.in
USE_TENANT_SUBDOMAINS=true  # true = subdomain routing, false = single domain
```

### Notification Tracking

All sent emails are tracked in the `notifications` table:
- Type (registration, approval, rejection)
- Recipient email
- Status (PENDING, SENT, FAILED)
- Timestamps
- Error messages (if failed)

View notification history:
```bash
npx prisma studio
# Navigate to notifications table
```
```

**Step 2: Create NOTIFICATION_SYSTEM.md**

Create `apps/backend/NOTIFICATION_SYSTEM.md`:

```markdown
# Notification System

## Overview

The notification system provides a flexible, extensible architecture for sending communications to users across multiple channels (email now, SMS/push/in-app in the future).

## Architecture

```
Application Layer (TenantsService)
    ↓
NotificationService (orchestration)
    ↓
EmailService (delivery)
    ↓
Email Provider (Resend/SMTP/Console)
```

## Components

### NotificationService

Location: `src/services/notification/notification.service.ts`

**Responsibilities:**
- Orchestrate notification sending
- Create notification records
- Handle errors gracefully
- Provide notification history

**Public Methods:**
```typescript
sendTenantRegistrationConfirmation(tenantId, email, firstName, companyName)
sendTenantApprovalNotification(tenantId, email, firstName, companyName, subdomain)
sendTenantRejectionNotification(tenantId, email, firstName, companyName, reason)
getNotificationHistory(tenantId, filters?)
```

### EmailService

Location: `src/common/services/email.service.ts`

**New Methods:**
```typescript
sendTenantRegistrationEmail(email, firstName, companyName)
sendTenantApprovalEmail(email, firstName, companyName, subdomain)
sendTenantRejectionEmail(email, firstName, companyName, reason)
```

**Helper Methods:**
```typescript
getLoginUrl(subdomain) - Generate login URL (subdomain-aware)
getDisplayUrl(subdomain) - Get display URL for emails
getSubdomainInstructionText(subdomain) - Get instruction text
```

## Database Schema

### Notification Model

```prisma
model Notification {
  id              Int
  notificationId  String (unique)
  type            NotificationType
  channel         NotificationChannel (EMAIL, SMS, PUSH, IN_APP)
  recipient       String
  status          NotificationStatus (PENDING, SENT, FAILED)
  tenantId        Int?
  userId          Int?
  invitationId    Int?
  metadata        Json?
  errorMessage    String?
  sentAt          DateTime?
  createdAt       DateTime
  updatedAt       DateTime
}
```

## Configuration

### Environment Variables

```bash
# Email service (existing)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@sally.com

# Tenant subdomain configuration (new)
TENANT_BASE_URL=sally.appshore.in
USE_TENANT_SUBDOMAINS=true
```

### Subdomain Modes

**Multi-tenant (USE_TENANT_SUBDOMAINS=true):**
- Login URL: `https://acme.sally.appshore.in/login`
- Display: "Your team's URL: acme.sally.appshore.in"

**Single domain (USE_TENANT_SUBDOMAINS=false):**
- Login URL: `https://sally.appshore.in/login`
- Display: "Visit sally.appshore.in to login"

## Error Handling

**Philosophy: Graceful Degradation**

If email sending fails:
- Notification status set to FAILED
- Error message stored in database
- Business logic continues (registration/approval succeeds)
- Admin can view failed notifications and retry manually

**Why:** Email failures should not block critical operations like tenant approval.

## Testing

### Unit Tests

Location: `src/services/notification/__tests__/notification.service.spec.ts`

Run:
```bash
npm test -- notification.service.spec.ts
```

### Manual Testing

1. Register new tenant → check for confirmation email
2. Approve tenant → check for approval email with login link
3. Reject tenant → check for rejection email with reason
4. Query database → verify notification records created

### Console Mode Testing

If no email provider configured, emails log to console:

```bash
# Don't set RESEND_API_KEY or SMTP credentials
npm run start:dev
# Register tenant
# Check console output for email HTML
```

## Integration Points

### TenantsService

Location: `src/api/tenants/tenants.service.ts`

**registerTenant()** - Calls `sendTenantRegistrationConfirmation`
**approveTenant()** - Calls `sendTenantApprovalNotification`
**rejectTenant()** - Calls `sendTenantRejectionNotification`

### Future Integrations

- UserInvitationsService (refactor to use NotificationService)
- Password reset flow
- System alerts
- HOS violation alerts

## Future Enhancements

### Short-term
- [ ] Notification history API endpoint
- [ ] Manual retry for failed notifications
- [ ] Email preview in development mode

### Medium-term
- [ ] SMS notifications via Twilio
- [ ] In-app notification center
- [ ] User notification preferences

### Long-term
- [ ] Push notifications
- [ ] Notification analytics dashboard
- [ ] A/B testing for email templates
- [ ] Multi-language support

## Troubleshooting

### Notification not sent

1. Check notification record in database
2. Look for errorMessage field
3. Check backend logs for email service errors
4. Verify email provider configuration (RESEND_API_KEY or SMTP)

### Wrong login URL in approval email

1. Check TENANT_BASE_URL environment variable
2. Verify USE_TENANT_SUBDOMAINS setting
3. Check tenant subdomain in database

### Email goes to spam

1. Verify sending domain (SPF, DKIM, DMARC records)
2. Use professional from address (not gmail.com)
3. Test with different email providers
4. Check email content for spam triggers

## Support

Questions? Contact: engineering@sally.com
```

**Step 3: Commit documentation**

```bash
git add apps/backend/EMAIL_SETUP.md apps/backend/NOTIFICATION_SYSTEM.md
git commit -m "docs: add notification system documentation

Add comprehensive documentation for notification system including
architecture, configuration, testing, and troubleshooting guides.
Update EMAIL_SETUP.md with automated email information.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 7: Final Verification

### Task 14: Run Full Test Suite and Build

**Files:**
- None (verification step)

**Step 1: Run all tests**

Run:
```bash
cd apps/backend
npm test
```

Expected: All new tests pass, pre-existing failures remain (integration tests)

**Step 2: Run build**

Run:
```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors

**Step 3: Check for linting issues**

Run:
```bash
npm run lint
```

Expected: No new linting errors

**Step 4: Verify Prisma schema**

Run:
```bash
npx prisma validate
```

Expected: Schema is valid

**Step 5: Generate final Prisma client**

Run:
```bash
npx prisma generate
```

Expected: Client generated successfully

**Step 6: Create summary of changes**

Create notes in `IMPLEMENTATION_SUMMARY.md`:

```markdown
# Notification System Implementation Summary

## What Was Built

✅ Database schema with Notification model and enums
✅ NotificationService for orchestration
✅ Three new email templates (registration, approval, rejection)
✅ Integration with TenantsService
✅ Unit tests for NotificationService
✅ Comprehensive documentation

## Files Created

- `src/services/notification/notification.service.ts`
- `src/services/notification/notification.module.ts`
- `src/services/notification/dto/notification-filters.dto.ts`
- `src/services/notification/__tests__/notification.service.spec.ts`
- `NOTIFICATION_SYSTEM.md`

## Files Modified

- `prisma/schema.prisma` - Added Notification model
- `src/common/services/email.service.ts` - Added 3 email templates + helpers
- `src/api/tenants/tenants.service.ts` - Integrated notifications
- `src/api/tenants/tenants.module.ts` - Imported NotificationModule
- `src/app.module.ts` - Registered NotificationModule
- `.env.example` - Added TENANT_BASE_URL and USE_TENANT_SUBDOMAINS
- `EMAIL_SETUP.md` - Updated with notification info

## Database Migration

Migration: `add_notifications_table`
- Added `notifications` table
- Added enums: NotificationType, NotificationChannel, NotificationStatus
- Added relations to Tenant, User, UserInvitation

## Configuration Required

```bash
# Required (for tenant URLs)
TENANT_BASE_URL=sally.appshore.in
USE_TENANT_SUBDOMAINS=true

# Optional (existing email config)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@sally.com
```

## Testing Performed

- [x] Unit tests for NotificationService
- [x] Build succeeds with no errors
- [x] Schema validation passes
- [ ] Manual E2E testing (to be done)
- [ ] Email deliverability testing (to be done)

## Next Steps

1. Manual E2E testing in development environment
2. Configure real email provider (Resend or SMTP)
3. Test email templates in light/dark email clients
4. Check spam folder deliverability
5. Deploy to staging for integration testing

## Known Issues

- Pre-existing integration test failures (unrelated to this feature)
- No notification history API endpoint yet (future enhancement)

## Future Enhancements

- SMS notifications
- In-app notifications
- Notification preferences
- Manual retry for failed notifications
```

**Step 7: Final commit**

```bash
git add IMPLEMENTATION_SUMMARY.md
git commit -m "docs: add implementation summary

Document complete notification system implementation including files
changed, configuration required, and next steps for deployment.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Completion Checklist

✅ Phase 1: Database schema added with migration
✅ Phase 2: NotificationService module created
✅ Phase 3: Email templates added to EmailService
✅ Phase 4: NotificationService methods implemented
✅ Phase 5: Integrated with TenantsService
✅ Phase 6: Testing and documentation complete
✅ Phase 7: Final verification and summary

## Success Criteria

**Must Have (Implemented):**
- [x] Notification model in database
- [x] NotificationService orchestration layer
- [x] Three email templates (registration, approval, rejection)
- [x] Integration with tenant lifecycle
- [x] Unit tests for core functionality
- [x] Documentation for system and configuration

**Next Steps (Post-Implementation):**
- [ ] Manual E2E testing
- [ ] Email provider configuration
- [ ] Staging deployment
- [ ] Production deployment

---

**Ready for execution!** Use `@superpowers:executing-plans` or `@superpowers:subagent-driven-development` to implement this plan.
