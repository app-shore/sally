import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { AlertStatsService } from './services/alert-stats.service';
import { AlertAnalyticsService } from './services/alert-analytics.service';
import { AlertTriggersService } from './services/alert-triggers.service';
import { SnoozeAlertDto } from './dto/snooze-alert.dto';
import { AddNoteDto } from './dto/add-note.dto';
import { ResolveAlertDto } from './dto/resolve-alert.dto';
import { BulkAcknowledgeDto, BulkResolveDto } from './dto/bulk-action.dto';

@ApiTags('Alerts')
@Controller('alerts')
export class AlertsController {
  private readonly logger = new Logger(AlertsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertStatsService: AlertStatsService,
    private readonly analyticsService: AlertAnalyticsService,
    private readonly triggersService: AlertTriggersService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List all alerts (filterable by status, priority, driver, category)',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by priority' })
  @ApiQuery({ name: 'driver_id', required: false, description: 'Filter by driver ID' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  async listAlerts(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('driver_id') driverId?: string,
    @Query('category') category?: string,
  ) {
    this.logger.log(
      `List alerts requested: status=${status}, priority=${priority}, driver_id=${driverId}, category=${category}`,
    );

    try {
      const alerts = await this.prisma.alert.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(priority ? { priority } : {}),
          ...(driverId ? { driverId } : {}),
          ...(category ? { category } : {}),
        },
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'desc' },
        ],
      });

      return alerts.map((alert) => ({
        alert_id: alert.alertId,
        driver_id: alert.driverId,
        route_plan_id: alert.routePlanId,
        vehicle_id: alert.vehicleId,
        alert_type: alert.alertType,
        category: alert.category,
        priority: alert.priority,
        title: alert.title,
        message: alert.message,
        recommended_action: alert.recommendedAction,
        metadata: alert.metadata,
        status: alert.status,
        acknowledged_at: alert.acknowledgedAt,
        acknowledged_by: alert.acknowledgedBy,
        snoozed_until: alert.snoozedUntil,
        resolved_at: alert.resolvedAt,
        resolved_by: alert.resolvedBy,
        resolution_notes: alert.resolutionNotes,
        auto_resolved: alert.autoResolved,
        escalation_level: alert.escalationLevel,
        parent_alert_id: alert.parentAlertId,
        created_at: alert.createdAt,
        updated_at: alert.updatedAt,
      }));
    } catch (error) {
      this.logger.error(`List alerts failed: ${error.message}`);
      throw new HttpException(
        { detail: 'Failed to fetch alerts' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get alert statistics for the current tenant' })
  async getAlertStats(@CurrentUser() user: any) {
    return this.alertStatsService.getStats(user.tenantDbId);
  }

  @Get('analytics/volume')
  @ApiOperation({ summary: 'Get alert volume by category and priority' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days (default 7)' })
  async getVolumeAnalytics(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    const d = days ? parseInt(days, 10) : 7;
    const [byCategory, byPriority] = await Promise.all([
      this.analyticsService.getVolumeByCategory(user.tenantDbId, d),
      this.analyticsService.getVolumeByPriority(user.tenantDbId, d),
    ]);
    return { byCategory, byPriority };
  }

  @Get('analytics/response-time')
  @ApiOperation({ summary: 'Get response time trend' })
  @ApiQuery({ name: 'days', required: false })
  async getResponseTimeTrend(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getResponseTimeTrend(user.tenantDbId, days ? parseInt(days, 10) : 7);
  }

  @Get('analytics/resolution')
  @ApiOperation({ summary: 'Get resolution rates' })
  @ApiQuery({ name: 'days', required: false })
  async getResolutionRates(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getResolutionRates(user.tenantDbId, days ? parseInt(days, 10) : 7);
  }

  @Get('analytics/top-types')
  @ApiOperation({ summary: 'Get top alert types' })
  @ApiQuery({ name: 'days', required: false })
  async getTopAlertTypes(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getTopAlertTypes(user.tenantDbId, days ? parseInt(days, 10) : 7);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get alert history with filtering and pagination' })
  async getAlertHistory(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
    @Query('status') status?: string,
    @Query('driver_id') driverId?: string,
  ) {
    return this.analyticsService.getAlertHistory(user.tenantDbId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      startDate,
      endDate,
      category,
      priority,
      status,
      driverId,
    });
  }

  @Get(':alert_id')
  @ApiOperation({ summary: 'Get alert details by ID' })
  @ApiParam({ name: 'alert_id', description: 'Alert ID' })
  async getAlert(@Param('alert_id') alertId: string) {
    this.logger.log(`Get alert details: ${alertId}`);

    try {
      const alert = await this.prisma.alert.findUnique({
        where: { alertId },
        include: {
          notes: { orderBy: { createdAt: 'asc' } },
          childAlerts: true,
        },
      });

      if (!alert) {
        throw new HttpException(
          { detail: `Alert ${alertId} not found` },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        alert_id: alert.alertId,
        driver_id: alert.driverId,
        route_plan_id: alert.routePlanId,
        vehicle_id: alert.vehicleId,
        alert_type: alert.alertType,
        category: alert.category,
        priority: alert.priority,
        title: alert.title,
        message: alert.message,
        recommended_action: alert.recommendedAction,
        metadata: alert.metadata,
        status: alert.status,
        acknowledged_at: alert.acknowledgedAt,
        acknowledged_by: alert.acknowledgedBy,
        snoozed_until: alert.snoozedUntil,
        resolved_at: alert.resolvedAt,
        resolved_by: alert.resolvedBy,
        resolution_notes: alert.resolutionNotes,
        auto_resolved: alert.autoResolved,
        escalation_level: alert.escalationLevel,
        parent_alert_id: alert.parentAlertId,
        created_at: alert.createdAt,
        updated_at: alert.updatedAt,
        notes: alert.notes.map((n) => ({
          note_id: n.noteId,
          author_name: n.authorName,
          content: n.content,
          created_at: n.createdAt,
        })),
        child_alerts: alert.childAlerts.map((c) => ({
          alert_id: c.alertId,
          alert_type: c.alertType,
          priority: c.priority,
          title: c.title,
          status: c.status,
          created_at: c.createdAt,
        })),
      };
    } catch (error) {
      this.logger.error(`Get alert failed: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { detail: 'Failed to fetch alert' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':alert_id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiParam({ name: 'alert_id', description: 'Alert ID' })
  async acknowledgeAlert(
    @Param('alert_id') alertId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Acknowledge alert: ${alertId} by ${user.userId}`);

    try {
      const alert = await this.prisma.alert.update({
        where: { alertId },
        data: {
          status: 'acknowledged',
          acknowledgedAt: new Date(),
          acknowledgedBy: user.userId,
        },
      });

      return {
        alert_id: alert.alertId,
        status: alert.status,
        acknowledged_at: alert.acknowledgedAt,
        acknowledged_by: alert.acknowledgedBy,
        message: 'Alert acknowledged successfully',
      };
    } catch (error) {
      this.logger.error(`Acknowledge alert failed: ${error.message}`);
      throw new HttpException(
        { detail: 'Failed to acknowledge alert' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':alert_id/resolve')
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiParam({ name: 'alert_id', description: 'Alert ID' })
  async resolveAlert(
    @Param('alert_id') alertId: string,
    @Body() dto: ResolveAlertDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Resolve alert: ${alertId}`);

    try {
      const alert = await this.prisma.alert.update({
        where: { alertId },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: user.userId,
          resolutionNotes: dto.resolutionNotes,
        },
      });

      return {
        alert_id: alert.alertId,
        status: alert.status,
        resolved_at: alert.resolvedAt,
        resolution_notes: alert.resolutionNotes,
        message: 'Alert resolved successfully',
      };
    } catch (error) {
      this.logger.error(`Resolve alert failed: ${error.message}`);
      throw new HttpException(
        { detail: 'Failed to resolve alert' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':alert_id/snooze')
  @ApiOperation({ summary: 'Snooze an alert for a specified duration' })
  @ApiParam({ name: 'alert_id', description: 'Alert ID' })
  async snoozeAlert(
    @Param('alert_id') alertId: string,
    @Body() dto: SnoozeAlertDto,
  ) {
    this.logger.log(`Snooze alert: ${alertId} for ${dto.durationMinutes} min`);

    const snoozedUntil = new Date(Date.now() + dto.durationMinutes * 60000);

    const alert = await this.prisma.alert.update({
      where: { alertId },
      data: {
        status: 'snoozed',
        snoozedUntil,
      },
    });

    return {
      alert_id: alert.alertId,
      status: alert.status,
      snoozed_until: snoozedUntil,
      message: `Alert snoozed until ${snoozedUntil.toISOString()}`,
    };
  }

  @Post(':alert_id/notes')
  @ApiOperation({ summary: 'Add a note to an alert' })
  @ApiParam({ name: 'alert_id', description: 'Alert ID' })
  async addNote(
    @Param('alert_id') alertId: string,
    @Body() dto: AddNoteDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Add note to alert: ${alertId}`);

    const note = await this.prisma.alertNote.create({
      data: {
        alertId,
        authorId: user.userId,
        authorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        content: dto.content,
      },
    });

    return {
      note_id: note.noteId,
      alert_id: note.alertId,
      author_name: note.authorName,
      content: note.content,
      created_at: note.createdAt,
    };
  }

  @Post('bulk/acknowledge')
  @ApiOperation({ summary: 'Acknowledge multiple alerts at once' })
  async bulkAcknowledge(
    @Body() dto: BulkAcknowledgeDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Bulk acknowledge: ${dto.alertIds.length} alerts`);

    const result = await this.prisma.alert.updateMany({
      where: { alertId: { in: dto.alertIds } },
      data: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: user.userId,
      },
    });

    return { updated: result.count, message: `${result.count} alerts acknowledged` };
  }

  @Post('bulk/resolve')
  @ApiOperation({ summary: 'Resolve multiple alerts at once' })
  async bulkResolve(
    @Body() dto: BulkResolveDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Bulk resolve: ${dto.alertIds.length} alerts`);

    const result = await this.prisma.alert.updateMany({
      where: { alertId: { in: dto.alertIds } },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: user.userId,
        resolutionNotes: dto.resolutionNotes,
      },
    });

    return { updated: result.count, message: `${result.count} alerts resolved` };
  }

}
