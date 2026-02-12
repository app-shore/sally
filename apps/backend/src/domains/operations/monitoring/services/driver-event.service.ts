import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { RouteEventService } from './route-event.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';

@Injectable()
export class DriverEventService {
  private readonly logger = new Logger(DriverEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly routeEventService: RouteEventService,
    private readonly sse: SseService,
  ) {}

  /**
   * Driver taps "Start Route" — begins the first drive segment.
   */
  async handleStartRoute(
    plan: any,
    dto: { notes?: string; latitude?: number; longitude?: number },
    tenantId: number,
  ) {
    // Idempotent: if a segment is already in_progress, route is already started
    const inProgress = plan.segments.find((s: any) => s.status === 'in_progress');
    if (inProgress) {
      return { status: 'already_started', currentSegment: inProgress.segmentId };
    }

    // Find first planned segment
    const firstSegment = plan.segments.find((s: any) => s.status === 'planned');
    if (!firstSegment) {
      throw new BadRequestException('No planned segments to start');
    }

    // Transition first segment: planned → in_progress
    await this.prisma.routeSegment.update({
      where: { id: firstSegment.id },
      data: { status: 'in_progress', actualDeparture: new Date() },
    });

    // Record event
    await this.routeEventService.recordEvent({
      planId: plan.id,
      planStringId: plan.planId,
      tenantId,
      segmentId: firstSegment.segmentId,
      eventType: 'ROUTE_STARTED',
      source: 'driver',
      eventData: { notes: dto.notes },
      location: dto.latitude != null ? { lat: dto.latitude, lon: dto.longitude! } : undefined,
    });

    return {
      status: 'started',
      currentSegment: firstSegment.segmentId,
      segmentType: firstSegment.segmentType,
    };
  }

  /**
   * Driver taps "Pickup Complete" — completes dock segment, updates load to in_transit.
   */
  async handlePickupComplete(
    plan: any,
    dto: { segmentId: string; notes?: string; latitude?: number; longitude?: number },
    tenantId: number,
  ) {
    const segment = plan.segments.find((s: any) => s.segmentId === dto.segmentId);
    if (!segment) throw new BadRequestException(`Segment ${dto.segmentId} not found in plan`);
    if (segment.segmentType !== 'dock') throw new BadRequestException('Pickup can only be confirmed on dock segments');
    if (segment.actionType !== 'pickup') throw new BadRequestException('This is not a pickup segment');

    // Idempotent
    if (segment.status === 'completed') {
      return { status: 'already_completed', segmentId: dto.segmentId };
    }
    if (segment.status !== 'in_progress') {
      throw new BadRequestException(`Segment must be in_progress to confirm pickup. Current: ${segment.status}`);
    }

    // Complete the dock segment
    await this.prisma.routeSegment.update({
      where: { id: segment.id },
      data: { status: 'completed', actualDeparture: new Date() },
    });

    // Update load status: assigned → in_transit
    const loadUpdates = await this.updateLoadsForSegment(plan, segment, 'in_transit');

    // Start next drive segment if available
    const nextDrive = this.findNextPlannedSegment(plan.segments, segment.sequenceOrder);
    if (nextDrive) {
      await this.prisma.routeSegment.update({
        where: { id: nextDrive.id },
        data: { status: 'in_progress', actualDeparture: new Date() },
      });
    }

    // Record event
    await this.routeEventService.recordEvent({
      planId: plan.id,
      planStringId: plan.planId,
      tenantId,
      segmentId: dto.segmentId,
      eventType: 'PICKUP_CONFIRMED',
      source: 'driver',
      eventData: {
        actionType: 'pickup',
        loadsUpdated: loadUpdates,
        nextSegmentId: nextDrive?.segmentId,
        notes: dto.notes,
      },
      location: dto.latitude != null ? { lat: dto.latitude, lon: dto.longitude! } : undefined,
      impactSummary: { segmentsAffected: nextDrive ? 2 : 1, loadsAffected: loadUpdates.length },
    });

    // Check for plan completion
    await this.checkAndCompletePlan(plan, tenantId);

    return {
      status: 'pickup_confirmed',
      segmentId: dto.segmentId,
      loadsUpdated: loadUpdates,
      nextSegmentId: nextDrive?.segmentId ?? null,
    };
  }

  /**
   * Driver taps "Delivery Complete" — completes dock segment, updates load to delivered.
   */
  async handleDeliveryComplete(
    plan: any,
    dto: { segmentId: string; notes?: string; latitude?: number; longitude?: number },
    tenantId: number,
  ) {
    const segment = plan.segments.find((s: any) => s.segmentId === dto.segmentId);
    if (!segment) throw new BadRequestException(`Segment ${dto.segmentId} not found in plan`);
    if (segment.segmentType !== 'dock') throw new BadRequestException('Delivery can only be confirmed on dock segments');
    if (segment.actionType !== 'dropoff') throw new BadRequestException('This is not a delivery segment');

    // Idempotent
    if (segment.status === 'completed') {
      return { status: 'already_completed', segmentId: dto.segmentId };
    }
    if (segment.status !== 'in_progress') {
      throw new BadRequestException(`Segment must be in_progress to confirm delivery. Current: ${segment.status}`);
    }

    // Complete the dock segment
    await this.prisma.routeSegment.update({
      where: { id: segment.id },
      data: { status: 'completed', actualDeparture: new Date() },
    });

    // Update load status: in_transit → delivered
    const loadUpdates = await this.updateLoadsForSegment(plan, segment, 'delivered');

    // Start next segment if available
    const nextSegment = this.findNextPlannedSegment(plan.segments, segment.sequenceOrder);
    if (nextSegment) {
      await this.prisma.routeSegment.update({
        where: { id: nextSegment.id },
        data: { status: 'in_progress', actualDeparture: new Date() },
      });
    }

    // Record event
    await this.routeEventService.recordEvent({
      planId: plan.id,
      planStringId: plan.planId,
      tenantId,
      segmentId: dto.segmentId,
      eventType: 'DELIVERY_CONFIRMED',
      source: 'driver',
      eventData: {
        actionType: 'dropoff',
        loadsUpdated: loadUpdates,
        nextSegmentId: nextSegment?.segmentId,
        notes: dto.notes,
      },
      location: dto.latitude != null ? { lat: dto.latitude, lon: dto.longitude! } : undefined,
      impactSummary: { segmentsAffected: nextSegment ? 2 : 1, loadsAffected: loadUpdates.length },
    });

    // Check for plan completion
    await this.checkAndCompletePlan(plan, tenantId);

    return {
      status: 'delivery_confirmed',
      segmentId: dto.segmentId,
      loadsUpdated: loadUpdates,
      nextSegmentId: nextSegment?.segmentId ?? null,
    };
  }

  /**
   * Dispatcher overrides a segment status (e.g., driver forgot to confirm pickup).
   */
  async handleDispatcherOverride(
    plan: any,
    dto: {
      segmentId: string;
      newStatus: string;
      reason: string;
      confirmPickup?: boolean;
      confirmDelivery?: boolean;
    },
    tenantId: number,
    dispatcherUserId: string,
  ) {
    const segment = plan.segments.find((s: any) => s.segmentId === dto.segmentId);
    if (!segment) throw new BadRequestException(`Segment ${dto.segmentId} not found in plan`);

    const previousStatus = segment.status;

    // Update segment status
    const updateData: any = { status: dto.newStatus };
    if (dto.newStatus === 'completed' && !segment.actualDeparture) updateData.actualDeparture = new Date();
    if (dto.newStatus === 'in_progress' && !segment.actualArrival) updateData.actualArrival = new Date();

    await this.prisma.routeSegment.update({
      where: { id: segment.id },
      data: updateData,
    });

    // Handle business event confirmations
    let loadUpdates: { loadId: string; newStatus: string }[] = [];
    if (dto.confirmPickup && segment.segmentType === 'dock' && segment.actionType === 'pickup') {
      loadUpdates = await this.updateLoadsForSegment(plan, segment, 'in_transit');
    }
    if (dto.confirmDelivery && segment.segmentType === 'dock' && segment.actionType === 'dropoff') {
      loadUpdates = await this.updateLoadsForSegment(plan, segment, 'delivered');
    }

    // Start next segment if this one was completed
    let nextSegment = null;
    if (dto.newStatus === 'completed') {
      nextSegment = this.findNextPlannedSegment(plan.segments, segment.sequenceOrder);
      if (nextSegment) {
        await this.prisma.routeSegment.update({
          where: { id: nextSegment.id },
          data: { status: 'in_progress', actualDeparture: new Date() },
        });
      }
    }

    // Record event
    await this.routeEventService.recordEvent({
      planId: plan.id,
      planStringId: plan.planId,
      tenantId,
      segmentId: dto.segmentId,
      eventType: 'DISPATCHER_OVERRIDE',
      source: 'dispatcher',
      eventData: {
        previousStatus,
        newStatus: dto.newStatus,
        reason: dto.reason,
        dispatcherUserId,
        confirmPickup: dto.confirmPickup,
        confirmDelivery: dto.confirmDelivery,
        loadsUpdated: loadUpdates,
        nextSegmentId: nextSegment?.segmentId,
      },
    });

    // Check for plan completion
    await this.checkAndCompletePlan(plan, tenantId);

    return {
      status: 'overridden',
      segmentId: dto.segmentId,
      previousStatus,
      newStatus: dto.newStatus,
      loadsUpdated: loadUpdates,
      nextSegmentId: nextSegment?.segmentId ?? null,
    };
  }

  // --- Private helpers ---

  /**
   * Find loads connected to a dock segment via its stopId, and update their status.
   */
  private async updateLoadsForSegment(
    plan: any,
    segment: any,
    newLoadStatus: string,
  ): Promise<{ loadId: string; newStatus: string }[]> {
    if (!segment.stopId) return [];

    // Find loads on this plan that have a stop matching this segment's stop
    const routePlanLoads = await this.prisma.routePlanLoad.findMany({
      where: { planId: plan.id },
      include: {
        load: {
          include: { stops: { where: { stopId: segment.stopId } } },
        },
      },
    });

    const updates: { loadId: string; newStatus: string }[] = [];
    for (const rpl of routePlanLoads) {
      if (rpl.load.stops.length > 0) {
        await this.prisma.load.update({
          where: { id: rpl.load.id },
          data: { status: newLoadStatus },
        });
        updates.push({ loadId: rpl.load.loadId, newStatus: newLoadStatus });
        this.logger.log(`Load ${rpl.load.loadId} status → ${newLoadStatus}`);
      }
    }

    return updates;
  }

  /**
   * Find the next planned segment after the given sequence order.
   */
  private findNextPlannedSegment(segments: any[], afterSequenceOrder: number): any | null {
    return segments
      .filter((s: any) => s.sequenceOrder > afterSequenceOrder && s.status === 'planned')
      .sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder)[0] ?? null;
  }

  /**
   * Check if all segments are done → mark plan as completed.
   */
  async checkAndCompletePlan(plan: any, tenantId: number): Promise<boolean> {
    // Re-fetch fresh segment statuses
    const segments = await this.prisma.routeSegment.findMany({
      where: { planId: plan.id },
    });

    const allDone = segments.every((s) => s.status === 'completed' || s.status === 'skipped');
    if (!allDone) return false;

    // Mark plan as completed
    await this.prisma.routePlan.update({
      where: { id: plan.id },
      data: { status: 'completed', isActive: false, completedAt: new Date() },
    });

    // Record event
    await this.routeEventService.recordEvent({
      planId: plan.id,
      planStringId: plan.planId,
      tenantId,
      eventType: 'ROUTE_COMPLETED',
      source: 'system',
      eventData: {
        totalSegments: segments.length,
        completedSegments: segments.filter((s) => s.status === 'completed').length,
        skippedSegments: segments.filter((s) => s.status === 'skipped').length,
      },
    });

    this.logger.log(`Route ${plan.planId} completed — all segments done`);
    return true;
  }
}
