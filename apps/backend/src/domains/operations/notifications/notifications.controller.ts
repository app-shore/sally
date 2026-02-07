import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Public } from '../../../auth/decorators/public.decorator';
import { InAppNotificationService } from './notifications.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly service: InAppNotificationService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for current user' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listForUser(user.id, {
      status,
      category,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser() user: any) {
    return this.service.getUnreadCount(user.id);
  }

  @Post(':notification_id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @Param('notification_id') notificationId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.markAsRead(notificationId, user.id);
  }

  @Post(':notification_id/dismiss')
  @ApiOperation({ summary: 'Dismiss a notification' })
  async dismiss(
    @Param('notification_id') notificationId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.dismiss(notificationId, user.id);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(
    @CurrentUser() user: any,
    @Body() body: { category?: string },
  ) {
    const result = await this.service.markAllRead(user.id, body.category);
    return { updated: result.count };
  }

  @Post('dismiss-all-read')
  @ApiOperation({ summary: 'Dismiss all read notifications' })
  async dismissAllRead(@CurrentUser() user: any) {
    const result = await this.service.dismissAllRead(user.id);
    return { updated: result.count };
  }

  @Post('seed')
  @Public()
  @ApiOperation({ summary: 'Seed sample notifications for testing (dev only)' })
  @ApiQuery({ name: 'tenant_id', required: false, description: 'Tenant ID (default: 1)' })
  @ApiQuery({ name: 'user_id', required: false, description: 'User DB ID (default: 1)' })
  async seedNotifications(
    @Query('tenant_id') tenantIdParam?: string,
    @Query('user_id') userIdParam?: string,
  ) {
    const tenantId = tenantIdParam ? parseInt(tenantIdParam, 10) : 1;
    const userId = userIdParam ? parseInt(userIdParam, 10) : 1;
    this.logger.log(`Seeding sample notifications for tenant ${tenantId}, user ${userId}`);

    const seedData: Array<{
      type: NotificationType;
      category: string;
      title: string;
      message: string;
      iconType: string;
      actionUrl?: string;
      actionLabel?: string;
    }> = [
      {
        type: NotificationType.ROUTE_PLANNED,
        category: 'OPERATIONS',
        title: 'Route Planned Successfully',
        message: 'Route RP-100 for driver Mike Johnson has been optimized with 5 stops and 2 rest breaks.',
        iconType: 'route',
        actionUrl: '/dispatcher/active-routes',
        actionLabel: 'View Route',
      },
      {
        type: NotificationType.INTEGRATION_SYNCED,
        category: 'SYSTEM',
        title: 'Samsara ELD Synced',
        message: 'Successfully synced HOS data for 12 drivers. All records up to date.',
        iconType: 'integration',
      },
      {
        type: NotificationType.USER_JOINED,
        category: 'TEAM',
        title: 'New Team Member',
        message: 'Sarah Chen has joined as a Dispatcher. They can now access the command center.',
        iconType: 'user',
        actionUrl: '/users',
        actionLabel: 'View Team',
      },
      {
        type: NotificationType.LOAD_ASSIGNED,
        category: 'OPERATIONS',
        title: 'Load Assigned to Driver',
        message: 'Load #4521 (Walmart DC) assigned to Tom Williams on route RP-102.',
        iconType: 'route',
      },
      {
        type: NotificationType.DISPATCH_MESSAGE,
        category: 'COMMUNICATIONS',
        title: 'Message from Driver',
        message: 'Lisa Park: "Arrived at dock, waiting for unloading. ETA 45 min."',
        iconType: 'message',
        actionUrl: '/driver/messages',
        actionLabel: 'Reply',
      },
      {
        type: NotificationType.INTEGRATION_FAILED,
        category: 'SYSTEM',
        title: 'Weather API Warning',
        message: 'Weather data provider returned partial data. Some route weather forecasts may be incomplete.',
        iconType: 'integration',
      },
      {
        type: NotificationType.ROUTE_UPDATED,
        category: 'OPERATIONS',
        title: 'Route Re-optimized',
        message: 'Route RP-101 was automatically re-planned due to road closure on I-81. New ETA: 4:30 PM.',
        iconType: 'route',
        actionUrl: '/dispatcher/active-routes',
        actionLabel: 'View Changes',
      },
      {
        type: NotificationType.DRIVER_ACTIVATED,
        category: 'TEAM',
        title: 'Driver Activated',
        message: 'James Rodriguez has been activated and is ready for route assignments.',
        iconType: 'user',
        actionUrl: '/drivers',
        actionLabel: 'View Drivers',
      },
      {
        type: NotificationType.SCHEDULE_CHANGED,
        category: 'OPERATIONS',
        title: 'Delivery Window Changed',
        message: 'Target DC #1022 updated their receiving window to 8:00 AM - 2:00 PM. Affected route: RP-102.',
        iconType: 'route',
      },
      {
        type: NotificationType.SETTINGS_UPDATED,
        category: 'SYSTEM',
        title: 'Alert Preferences Updated',
        message: 'Your notification preferences have been updated. Critical alerts will now trigger SMS notifications.',
        iconType: 'integration',
      },
    ];

    const results = [];
    const errors = [];
    for (const seed of seedData) {
      try {
        const notification = await this.service.create({
          recipientId: userId,
          tenantId,
          type: seed.type,
          category: seed.category,
          title: seed.title,
          message: seed.message,
          iconType: seed.iconType,
          actionUrl: seed.actionUrl,
          actionLabel: seed.actionLabel,
        });
        results.push(notification.notificationId);
      } catch (error: any) {
        errors.push({ type: seed.type, error: error.message });
        this.logger.error(`Failed to seed notification ${seed.type}: ${error.message}`);
      }
    }

    return {
      message: `Seeded ${results.length} notifications${errors.length ? `, ${errors.length} failed` : ''}`,
      notificationIds: results,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
