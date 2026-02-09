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

  async updateSegmentStatuses(segments: any[], gpsData: any): Promise<any | null> {
    const sorted = [...segments].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    const driverLat = gpsData?.gps?.latitude;
    const driverLon = gpsData?.gps?.longitude;

    if (driverLat == null || driverLon == null) return this.determineCurrentSegment(segments);

    for (const segment of sorted) {
      if (segment.status === 'completed' || segment.status === 'skipped') continue;

      const distToDestMiles = this.haversineDistance(driverLat, driverLon, segment.toLat, segment.toLon);

      if (distToDestMiles < 1) {
        if (segment.status !== 'completed') {
          await this.prisma.routeSegment.update({
            where: { id: segment.id },
            data: {
              status: 'completed',
              actualArrival: segment.actualArrival ?? new Date(),
            },
          });
          segment.status = 'completed';
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

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (lat2 == null || lon2 == null) return Infinity;
    const R = 3959;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
