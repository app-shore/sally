import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

interface ChannelFlags {
  inApp: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface ResolvedChannels {
  channels: string[];
  playSound: boolean;
  showBrowserNotification: boolean;
  flashTab: boolean;
  suppressedByQuietHours: boolean;
}

@Injectable()
export class ChannelResolutionService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveChannels(params: {
    tenantId: number;
    userId: number;
    alertPriority: string;
    alertType: string;
  }): Promise<ResolvedChannels> {
    // 1. Get tenant defaults
    const tenantConfig = await this.prisma.alertConfiguration.findUnique({
      where: { tenantId: params.tenantId },
    });

    const defaultChannels: Record<string, ChannelFlags> = {
      critical: { inApp: true, email: true, push: true, sms: true },
      high: { inApp: true, email: true, push: true, sms: false },
      medium: { inApp: true, email: false, push: false, sms: false },
      low: { inApp: true, email: false, push: false, sms: false },
    };

    const tenantDefaults = (tenantConfig?.defaultChannels as unknown as Record<string, ChannelFlags>)?.[params.alertPriority]
      ?? defaultChannels[params.alertPriority]
      ?? { inApp: true, email: false, push: false, sms: false };

    // 2. Get user overrides
    const userPrefs = await this.prisma.userPreferences.findUnique({
      where: { userId: params.userId },
    });

    const userOverrides = (userPrefs?.alertChannels as unknown as Record<string, ChannelFlags>)?.[params.alertPriority];
    const channels: ChannelFlags = userOverrides
      ? { ...userOverrides }
      : { ...tenantDefaults };

    // 3. Mandatory alert types always get in-app
    const alertTypes = (tenantConfig?.alertTypes as Record<string, { mandatory?: boolean }>) ?? {};
    if (alertTypes[params.alertType]?.mandatory) {
      channels.inApp = true;
    }

    // 4. Quiet hours suppression (except CRITICAL)
    const inQuietHours = this.isInQuietHours(userPrefs);
    if (inQuietHours && params.alertPriority !== 'critical') {
      channels.push = false;
    }

    // 5. Sound & browser flags
    const soundSettings = (userPrefs?.soundSettings as Record<string, boolean>) ?? {
      critical: true, high: true, medium: false, low: false,
    };
    const playSound = soundSettings[params.alertPriority] ?? false;
    const browserNotifs = userPrefs?.browserNotifications ?? true;
    const flashTabOnCritical = userPrefs?.flashTabOnCritical ?? true;

    return {
      channels: this.toChannelList(channels),
      playSound: inQuietHours && params.alertPriority !== 'critical' ? false : playSound,
      showBrowserNotification: browserNotifs && channels.push,
      flashTab: params.alertPriority === 'critical' && flashTabOnCritical,
      suppressedByQuietHours: inQuietHours && params.alertPriority !== 'critical',
    };
  }

  private isInQuietHours(prefs: any): boolean {
    if (!prefs?.quietHoursEnabled || !prefs?.quietHoursStart || !prefs?.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const tz = prefs.timezone || 'America/New_York';
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
    });
    const currentTime = formatter.format(now);

    const start = prefs.quietHoursStart;
    const end = prefs.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 - 06:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }
    return currentTime >= start && currentTime < end;
  }

  private toChannelList(flags: ChannelFlags): string[] {
    const list: string[] = [];
    if (flags.inApp) list.push('in_app');
    if (flags.email) list.push('email');
    if (flags.push) list.push('push');
    if (flags.sms) list.push('sms');
    return list;
  }
}
