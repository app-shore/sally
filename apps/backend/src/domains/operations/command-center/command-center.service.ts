import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { CommandCenterOverviewDto, ShiftNoteDto } from './command-center.types';
import {
  generateMockActiveRoutes,
  generateMockKPIs,
  generateMockDriverHOS,
  generateMockQuickActionCounts,
} from './command-center.mock';

@Injectable()
export class CommandCenterService {
  private readonly logger = new Logger(CommandCenterService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ---------------------------------------------------------------------------
  // Overview (aggregated endpoint)
  // ---------------------------------------------------------------------------

  async getOverview(tenantId: number): Promise<CommandCenterOverviewDto> {
    const cacheKey = `command-center:overview:${tenantId}`;
    const cached = await this.cacheManager.get<CommandCenterOverviewDto>(cacheKey);
    if (cached) return cached;

    // Get real alert stats from DB
    const realAlertStats = await this.getRealAlertStats(tenantId);

    // Generate mock data for routes, HOS (replace with real queries later)
    const activeRoutes = generateMockActiveRoutes(tenantId);
    const kpis = generateMockKPIs(activeRoutes, realAlertStats);
    const driverHosStrip = generateMockDriverHOS(activeRoutes);
    const quickActionCounts = generateMockQuickActionCounts(tenantId);

    // Sort routes by urgency: late first, then at_risk, then on_time, then completed
    const urgencyOrder = { late: 0, at_risk: 1, on_time: 2 };
    const sortedRoutes = [...activeRoutes].sort((a, b) => {
      const aUrgency = a.status === 'completed' ? 3 : (urgencyOrder[a.eta_status] ?? 2);
      const bUrgency = b.status === 'completed' ? 3 : (urgencyOrder[b.eta_status] ?? 2);
      if (aUrgency !== bUrgency) return aUrgency - bUrgency;
      // Secondary sort: more alerts first
      return b.active_alert_count - a.active_alert_count;
    });

    const result: CommandCenterOverviewDto = {
      kpis,
      active_routes: sortedRoutes,
      quick_action_counts: quickActionCounts,
      driver_hos_strip: driverHosStrip,
    };

    await this.cacheManager.set(cacheKey, result, 30 * 1000); // 30 second TTL
    return result;
  }

  // ---------------------------------------------------------------------------
  // Shift Notes (real data, backed by Prisma)
  // ---------------------------------------------------------------------------

  async getShiftNotes(tenantId: number): Promise<{ notes: ShiftNoteDto[] }> {
    const now = new Date();

    const notes = await this.prisma.shiftNote.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { isPinned: true },
          { expiresAt: { gt: now } },
        ],
      },
      include: {
        createdByUser: {
          select: { userId: true, firstName: true, lastName: true },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 10,
    });

    return {
      notes: notes.map((note) => ({
        note_id: note.noteId,
        content: note.content,
        created_by: {
          user_id: note.createdByUser.userId,
          name: `${note.createdByUser.firstName} ${note.createdByUser.lastName}`,
        },
        created_at: note.createdAt.toISOString(),
        expires_at: note.expiresAt.toISOString(),
        is_pinned: note.isPinned,
      })),
    };
  }

  async createShiftNote(
    tenantId: number,
    userStringId: string,
    content: string,
    isPinned: boolean = false,
  ): Promise<ShiftNoteDto> {
    // Look up numeric user ID from string userId
    const user = await this.prisma.user.findUnique({
      where: { userId: userStringId },
      select: { id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const note = await this.prisma.shiftNote.create({
      data: {
        tenantId,
        content,
        createdBy: user.id,
        expiresAt,
        isPinned,
      },
      include: {
        createdByUser: {
          select: { userId: true, firstName: true, lastName: true },
        },
      },
    });

    return {
      note_id: note.noteId,
      content: note.content,
      created_by: {
        user_id: note.createdByUser.userId,
        name: `${note.createdByUser.firstName} ${note.createdByUser.lastName}`,
      },
      created_at: note.createdAt.toISOString(),
      expires_at: note.expiresAt.toISOString(),
      is_pinned: note.isPinned,
    };
  }

  async deleteShiftNote(tenantId: number, noteId: string): Promise<void> {
    await this.prisma.shiftNote.updateMany({
      where: { noteId, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async getRealAlertStats(tenantId: number): Promise<{
    active: number;
    avgResponseTimeMinutes: number;
    hosViolations: number;
  }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [active, hosViolations, acknowledgedToday] = await Promise.all([
      this.prisma.alert.count({
        where: { tenantId, status: 'active' },
      }),
      this.prisma.alert.count({
        where: { tenantId, status: 'active', alertType: 'HOS_VIOLATION' },
      }),
      this.prisma.alert.findMany({
        where: {
          tenantId,
          acknowledgedAt: { not: null, gte: todayStart },
        },
        select: { createdAt: true, acknowledgedAt: true },
      }),
    ]);

    let avgResponseTimeMinutes = 0;
    if (acknowledgedToday.length > 0) {
      const totalMs = acknowledgedToday.reduce((sum, alert) => {
        const diff = alert.acknowledgedAt!.getTime() - alert.createdAt.getTime();
        return sum + diff;
      }, 0);
      avgResponseTimeMinutes = Math.round(totalMs / acknowledgedToday.length / 60000);
    }

    return { active, avgResponseTimeMinutes, hosViolations };
  }
}
