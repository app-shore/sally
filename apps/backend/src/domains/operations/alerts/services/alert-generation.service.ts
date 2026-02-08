import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';
import { AlertGroupingService } from './alert-grouping.service';
import { ChannelResolutionService } from '../../notifications/channel-resolution.service';
import { NotificationDeliveryService } from '../../notifications/delivery.service';
import { randomUUID } from 'crypto';

interface GenerateAlertParams {
  tenantId: number;
  driverId: string;
  routePlanId?: string;
  vehicleId?: string;
  alertType: string;
  category: string;
  priority: string;
  title: string;
  message: string;
  recommendedAction?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AlertGenerationService {
  private readonly logger = new Logger(AlertGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sseService: SseService,
    private readonly groupingService: AlertGroupingService,
    private readonly channelResolution: ChannelResolutionService,
    private readonly deliveryService: NotificationDeliveryService,
  ) {}

  async generateAlert(params: GenerateAlertParams) {
    const config = await this.groupingService.getGroupingConfig(params.tenantId);

    // Step 1: Check for duplicates
    const dedupKey = this.groupingService.generateDedupKey(
      params.tenantId,
      params.driverId,
      params.alertType,
    );

    if (config.groupSameTypePerDriver) {
      const duplicate = await this.groupingService.findDuplicate(
        dedupKey,
        config.dedupWindowMinutes,
      );

      if (duplicate) {
        this.logger.debug(
          `Skipping duplicate alert: ${params.alertType} for driver ${params.driverId} (existing: ${duplicate.alertId})`,
        );
        return null;
      }
    }

    // Step 2: Generate group key
    const groupKey = this.groupingService.generateGroupKey(
      params.tenantId,
      params.driverId,
      params.category,
    );

    // Step 3: Create the alert
    const alertId = `ALT-${randomUUID().slice(0, 8).toUpperCase()}`;

    const alert = await this.prisma.alert.create({
      data: {
        alertId,
        tenantId: params.tenantId,
        driverId: params.driverId,
        routePlanId: params.routePlanId,
        vehicleId: params.vehicleId,
        alertType: params.alertType,
        category: params.category,
        priority: params.priority,
        title: params.title,
        message: params.message,
        recommendedAction: params.recommendedAction,
        metadata: params.metadata,
        dedupKey,
        groupKey,
      },
    });

    // Step 4: Link to parent if cascading is enabled
    if (config.linkCascading) {
      const parent = await this.groupingService.findParentAlert(
        params.tenantId,
        params.driverId,
        params.alertType,
      );

      if (parent) {
        await this.groupingService.linkToParent(alert.alertId, parent.alertId);
        this.logger.log(`Linked alert ${alert.alertId} to parent ${parent.alertId}`);
      }
    }

    // Step 5: Resolve channels and deliver per-user
    try {
      const dispatchers = await this.prisma.user.findMany({
        where: {
          tenantId: params.tenantId,
          role: { in: ['OWNER', 'ADMIN', 'DISPATCHER'] },
          isActive: true,
          deletedAt: null,
        },
        select: { id: true, userId: true, email: true },
      });

      for (const dispatcher of dispatchers) {
        const resolved = await this.channelResolution.resolveChannels({
          tenantId: params.tenantId,
          userId: dispatcher.id,
          alertPriority: params.priority.toLowerCase(),
          alertType: params.alertType,
        });

        // Emit per-user SSE with preference-resolved flags
        this.sseService.emitToUser(dispatcher.userId, 'alert:new', {
          alert_id: alert.alertId,
          alert_type: alert.alertType,
          category: alert.category,
          priority: alert.priority,
          title: alert.title,
          message: alert.message,
          driver_id: alert.driverId,
          created_at: alert.createdAt,
          playSound: resolved.playSound,
          flashTab: resolved.flashTab,
        });

        // Deliver to all resolved channels (in_app creates notification record + SSE, others go external)
        if (resolved.channels.length > 0) {
          await this.deliveryService.deliver({
            recipientUserId: dispatcher.userId,
            recipientDbId: dispatcher.id,
            tenantId: params.tenantId,
            type: 'DISPATCH_MESSAGE',
            category: alert.category,
            title: alert.title,
            message: alert.message,
            channels: resolved.channels,
            recipientEmail: dispatcher.email,
          });
        }
      }
    } catch (error: any) {
      this.logger.error(`Per-user delivery failed: ${error.message}`);
    }

    this.logger.log(
      `Generated alert ${alert.alertId}: ${alert.alertType} (${alert.priority}) for driver ${alert.driverId}`,
    );

    return alert;
  }
}
