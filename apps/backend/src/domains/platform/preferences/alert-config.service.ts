import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UpdateAlertConfigDto } from './dto/alert-config.dto';

@Injectable()
export class AlertConfigService {
  constructor(private readonly prisma: PrismaService) {}

  getDefaults() {
    return {
      alertTypes: {
        HOS_VIOLATION: { enabled: true, mandatory: true },
        HOS_APPROACHING_LIMIT: { enabled: true, mandatory: false, thresholdMinutes: 60 },
        BREAK_REQUIRED: { enabled: true, mandatory: false, thresholdMinutes: 420 },
        CYCLE_APPROACHING_LIMIT: { enabled: true, mandatory: false, thresholdMinutes: 300 },
        MISSED_APPOINTMENT: { enabled: true, mandatory: true },
        APPOINTMENT_AT_RISK: { enabled: true, mandatory: false, thresholdMinutes: 30 },
        DOCK_TIME_EXCEEDED: { enabled: true, mandatory: false, thresholdMinutes: 60 },
        ROUTE_DELAY: { enabled: false, mandatory: false, thresholdMinutes: 30 },
        DRIVER_NOT_MOVING: { enabled: true, mandatory: false, thresholdMinutes: 120 },
        FUEL_LOW: { enabled: true, mandatory: false, thresholdPercent: 20 },
      },
      escalationPolicy: {
        critical: { acknowledgeSlaMinutes: 5, escalateTo: 'supervisors', channels: ['email', 'sms'] },
        high: { acknowledgeSlaMinutes: 15, escalateTo: 'all_dispatchers', channels: ['email'] },
      },
      groupingConfig: {
        dedupWindowMinutes: 15,
        groupSameTypePerDriver: true,
        smartGroupAcrossDrivers: true,
        linkCascading: true,
      },
      defaultChannels: {
        critical: { inApp: true, email: true, push: true, sms: true },
        high: { inApp: true, email: true, push: true, sms: false },
        medium: { inApp: true, email: false, push: false, sms: false },
        low: { inApp: true, email: false, push: false, sms: false },
      },
    };
  }

  async getConfig(tenantId: number) {
    const config = await this.prisma.alertConfiguration.findUnique({
      where: { tenantId },
    });

    if (!config) return this.getDefaults();

    return {
      alertTypes: config.alertTypes,
      escalationPolicy: config.escalationPolicy,
      groupingConfig: config.groupingConfig,
      defaultChannels: config.defaultChannels,
    };
  }

  async updateConfig(tenantId: number, dto: UpdateAlertConfigDto) {
    const defaults = this.getDefaults();

    return this.prisma.alertConfiguration.upsert({
      where: { tenantId },
      create: {
        tenantId,
        alertTypes: dto.alertTypes || defaults.alertTypes,
        escalationPolicy: dto.escalationPolicy || defaults.escalationPolicy,
        groupingConfig: dto.groupingConfig || defaults.groupingConfig,
        defaultChannels: dto.defaultChannels || defaults.defaultChannels,
      },
      update: {
        ...(dto.alertTypes && { alertTypes: dto.alertTypes }),
        ...(dto.escalationPolicy && { escalationPolicy: dto.escalationPolicy }),
        ...(dto.groupingConfig && { groupingConfig: dto.groupingConfig }),
        ...(dto.defaultChannels && { defaultChannels: dto.defaultChannels }),
      },
    });
  }
}
