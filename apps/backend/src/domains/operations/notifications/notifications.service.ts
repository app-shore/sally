import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotificationType } from '@prisma/client';

interface ListParams {
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}

interface CreateNotificationParams {
  recipientId: number;
  tenantId?: number;
  type: NotificationType;
  category: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  iconType?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class InAppNotificationService {
  private readonly logger = new Logger(InAppNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: number, params?: ListParams) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;

    const where: any = { userId };

    if (params?.status === 'unread') {
      where.readAt = null;
      where.dismissedAt = null;
    } else if (params?.status === 'read') {
      where.readAt = { not: null };
      where.dismissedAt = null;
    }

    if (params?.category) {
      where.category = params.category;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async getUnreadCount(userId: number) {
    const unread = await this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
        dismissedAt: null,
      },
    });

    return { unread };
  }

  async markAsRead(notificationId: string, userId: number) {
    return this.prisma.notification.update({
      where: { notificationId },
      data: { readAt: new Date() },
    });
  }

  async dismiss(notificationId: string, userId: number) {
    return this.prisma.notification.update({
      where: { notificationId },
      data: { dismissedAt: new Date() },
    });
  }

  async markAllRead(userId: number, category?: string) {
    const where: any = { userId, readAt: null };
    if (category) where.category = category;

    return this.prisma.notification.updateMany({
      where,
      data: { readAt: new Date() },
    });
  }

  async dismissAllRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: { not: null },
        dismissedAt: null,
      },
      data: { dismissedAt: new Date() },
    });
  }

  async create(params: CreateNotificationParams) {
    return this.prisma.notification.create({
      data: {
        type: params.type,
        channel: 'IN_APP',
        recipient: '',
        status: 'SENT',
        userId: params.recipientId,
        tenantId: params.tenantId,
        category: params.category,
        title: params.title,
        message: params.message,
        actionUrl: params.actionUrl,
        actionLabel: params.actionLabel,
        iconType: params.iconType,
        metadata: params.metadata,
        sentAt: new Date(),
      },
    });
  }
}
