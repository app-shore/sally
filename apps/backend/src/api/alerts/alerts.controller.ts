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
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Alerts')
@Controller('alerts')
export class AlertsController {
  private readonly logger = new Logger(AlertsController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'List all alerts (filterable by status, priority, driver)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (active, acknowledged, resolved)',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    description: 'Filter by priority (critical, high, medium, low)',
  })
  @ApiQuery({
    name: 'driver_id',
    required: false,
    description: 'Filter by driver ID',
  })
  async listAlerts(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('driver_id') driverId?: string,
  ) {
    this.logger.log(
      `List alerts requested: status=${status}, priority=${priority}, driver_id=${driverId}`,
    );

    try {
      const alerts = await this.prisma.alert.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(priority ? { priority } : {}),
          ...(driverId ? { driverId } : {}),
        },
        orderBy: [
          { priority: 'asc' }, // critical first
          { createdAt: 'desc' }, // newest first
        ],
      });

      return alerts.map((alert) => ({
        alert_id: alert.alertId,
        driver_id: alert.driverId,
        route_plan_id: alert.routePlanId,
        alert_type: alert.alertType,
        priority: alert.priority,
        title: alert.title,
        message: alert.message,
        recommended_action: alert.recommendedAction,
        status: alert.status,
        acknowledged_at: alert.acknowledgedAt,
        acknowledged_by: alert.acknowledgedBy,
        resolved_at: alert.resolvedAt,
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

  @Get(':alert_id')
  @ApiOperation({ summary: 'Get alert details by ID' })
  @ApiParam({ name: 'alert_id', description: 'Alert ID' })
  async getAlert(@Param('alert_id') alertId: string) {
    this.logger.log(`Get alert details: ${alertId}`);

    try {
      const alert = await this.prisma.alert.findUnique({
        where: { alertId },
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
        alert_type: alert.alertType,
        priority: alert.priority,
        title: alert.title,
        message: alert.message,
        recommended_action: alert.recommendedAction,
        status: alert.status,
        acknowledged_at: alert.acknowledgedAt,
        acknowledged_by: alert.acknowledgedBy,
        resolved_at: alert.resolvedAt,
        created_at: alert.createdAt,
        updated_at: alert.updatedAt,
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: { acknowledged_by: { type: 'string' } },
    },
  })
  async acknowledgeAlert(
    @Param('alert_id') alertId: string,
    @Body() body: { acknowledged_by?: string },
  ) {
    this.logger.log(
      `Acknowledge alert: ${alertId} by ${body.acknowledged_by || 'dispatcher'}`,
    );

    try {
      const alert = await this.prisma.alert.update({
        where: { alertId },
        data: {
          status: 'acknowledged',
          acknowledgedAt: new Date(),
          acknowledgedBy: body.acknowledged_by || 'dispatcher',
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
  async resolveAlert(@Param('alert_id') alertId: string) {
    this.logger.log(`Resolve alert: ${alertId}`);

    try {
      const alert = await this.prisma.alert.update({
        where: { alertId },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
        },
      });

      return {
        alert_id: alert.alertId,
        status: alert.status,
        resolved_at: alert.resolvedAt,
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
}
