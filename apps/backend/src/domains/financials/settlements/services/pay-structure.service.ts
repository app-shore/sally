import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@Injectable()
export class PayStructureService {
  private readonly logger = new Logger(PayStructureService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getByDriverId(tenantId: number, driverId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { driverId, tenantId },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    return this.prisma.driverPayStructure.findUnique({
      where: { driverId: driver.id },
    });
  }

  async upsert(tenantId: number, driverId: string, data: {
    type: string;
    rate_per_mile_cents?: number;
    percentage?: number;
    flat_rate_cents?: number;
    hybrid_base_cents?: number;
    hybrid_percent?: number;
    effective_date: string;
    notes?: string;
  }) {
    const driver = await this.prisma.driver.findFirst({
      where: { driverId, tenantId },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const result = await this.prisma.driverPayStructure.upsert({
      where: { driverId: driver.id },
      update: {
        type: data.type as any,
        ratePerMileCents: data.rate_per_mile_cents ?? null,
        percentage: data.percentage ?? null,
        flatRateCents: data.flat_rate_cents ?? null,
        hybridBaseCents: data.hybrid_base_cents ?? null,
        hybridPercent: data.hybrid_percent ?? null,
        effectiveDate: new Date(data.effective_date),
        notes: data.notes ?? null,
      },
      create: {
        driverId: driver.id,
        type: data.type as any,
        ratePerMileCents: data.rate_per_mile_cents ?? null,
        percentage: data.percentage ?? null,
        flatRateCents: data.flat_rate_cents ?? null,
        hybridBaseCents: data.hybrid_base_cents ?? null,
        hybridPercent: data.hybrid_percent ?? null,
        effectiveDate: new Date(data.effective_date),
        notes: data.notes ?? null,
        tenantId,
      },
    });

    this.logger.log(`Upserted pay structure for driver ${driverId}: ${data.type}`);
    return result;
  }
}
