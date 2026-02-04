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
