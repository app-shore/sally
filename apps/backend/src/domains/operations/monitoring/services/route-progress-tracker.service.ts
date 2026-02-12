import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@Injectable()
export class RouteProgressTrackerService {
  private readonly logger = new Logger(RouteProgressTrackerService.name);

  constructor(private readonly prisma: PrismaService) {}

  determineCurrentSegment(segments: any[]): any | null {
    const sorted = [...segments].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    const inProgress = sorted.find((s) => s.status === 'in_progress');
    if (inProgress) return inProgress;

    return sorted.find((s) => s.status === 'planned') ?? null;
  }

  async updateSegmentStatuses(
    segments: any[],
    gpsData: any,
    routeEventService?: any,
    planContext?: { planId: number; planStringId: string; tenantId: number },
  ): Promise<any | null> {
    const sorted = [...segments].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    const driverLat = gpsData?.latitude;
    const driverLon = gpsData?.longitude;

    if (driverLat == null || driverLon == null) return this.determineCurrentSegment(segments);

    for (const segment of sorted) {
      if (segment.status === 'completed' || segment.status === 'skipped') continue;

      const distToDestMiles = this.haversineDistance(driverLat, driverLon, segment.toLat, segment.toLon);

      if (distToDestMiles < 1) {
        // GPS says driver is at/near destination
        if (segment.segmentType === 'dock') {
          // Dock segments: GPS can START them but NOT complete them
          // Pickup/delivery completion requires driver confirmation
          if (segment.status === 'planned') {
            await this.prisma.routeSegment.update({
              where: { id: segment.id },
              data: { status: 'in_progress', actualArrival: segment.actualArrival ?? new Date() },
            });
            segment.status = 'in_progress';

            if (routeEventService && planContext) {
              await routeEventService.recordEvent({
                ...planContext,
                segmentId: segment.segmentId,
                eventType: 'SEGMENT_ARRIVED',
                source: 'monitoring',
                eventData: {
                  segmentType: segment.segmentType,
                  actionType: segment.actionType,
                  distanceToStopMiles: Math.round(distToDestMiles * 10) / 10,
                },
                location: { lat: driverLat, lon: driverLon },
              });
            }
          }
          // If already in_progress, do nothing — waiting for driver confirmation
          return segment;
        } else {
          // Drive, rest, fuel segments: GPS auto-completes
          if (segment.status !== 'completed') {
            const wasPlanned = segment.status === 'planned';
            await this.prisma.routeSegment.update({
              where: { id: segment.id },
              data: {
                status: 'completed',
                actualArrival: segment.actualArrival ?? new Date(),
              },
            });
            segment.status = 'completed';

            if (routeEventService && planContext) {
              await routeEventService.recordEvent({
                ...planContext,
                segmentId: segment.segmentId,
                eventType: wasPlanned ? 'SEGMENT_ARRIVED' : 'SEGMENT_DEPARTED',
                source: 'monitoring',
                eventData: {
                  segmentType: segment.segmentType,
                  newStatus: 'completed',
                  distanceToStopMiles: Math.round(distToDestMiles * 10) / 10,
                },
                location: { lat: driverLat, lon: driverLon },
              });
            }
          }
          // Continue to check next segment
        }
      } else if (segment.status === 'planned') {
        await this.prisma.routeSegment.update({
          where: { id: segment.id },
          data: {
            status: 'in_progress',
            actualDeparture: segment.actualDeparture ?? new Date(),
          },
        });
        segment.status = 'in_progress';
        return segment;
      } else {
        return segment;
      }
    }

    return null;
  }

  haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (lat2 == null || lon2 == null) return Infinity;
    const R = 3959;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
