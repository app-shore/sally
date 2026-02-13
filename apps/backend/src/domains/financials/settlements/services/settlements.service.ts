import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate settlement for a driver in a given period.
   * Looks up delivered loads, applies pay structure, computes line items.
   */
  async calculate(tenantId: number, data: {
    driver_id: string;
    period_start: string;
    period_end: string;
    preview?: boolean;
  }) {
    const driver = await this.prisma.driver.findFirst({
      where: { driverId: data.driver_id, tenantId },
      include: { payStructure: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    if (!driver.payStructure) throw new BadRequestException('Driver has no pay structure configured');

    const periodStart = new Date(data.period_start);
    const periodEnd = new Date(data.period_end);

    // Find delivered loads for this driver in the period
    const loads = await this.prisma.load.findMany({
      where: {
        tenantId,
        driverId: driver.id,
        status: 'delivered',
        deliveredAt: { gte: periodStart, lte: periodEnd },
      },
      include: {
        routePlanLoads: {
          include: { plan: { select: { totalMiles: true } } },
        },
      },
    });

    if (loads.length === 0) throw new BadRequestException('No delivered loads found in this period');

    // Calculate pay for each load
    const lineItems: Array<{
      loadId: number;
      description: string;
      miles: number | null;
      loadRevenueCents: number | null;
      payAmountCents: number;
      payStructureType: string;
    }> = [];

    const ps = driver.payStructure;
    for (const load of loads) {
      const routeMiles = load.routePlanLoads?.[0]?.plan?.totalMiles ?? null;
      const loadRevenueCents = load.rateCents ?? 0;
      let payAmountCents = 0;

      switch (ps.type) {
        case 'PER_MILE':
          payAmountCents = Math.round((routeMiles ?? 0) * (ps.ratePerMileCents ?? 0));
          break;
        case 'PERCENTAGE':
          payAmountCents = Math.round(loadRevenueCents * ((ps.percentage ?? 0) / 100));
          break;
        case 'FLAT_RATE':
          payAmountCents = ps.flatRateCents ?? 0;
          break;
        case 'HYBRID':
          payAmountCents = (ps.hybridBaseCents ?? 0) + Math.round(loadRevenueCents * ((ps.hybridPercent ?? 0) / 100));
          break;
      }

      lineItems.push({
        loadId: load.id,
        description: `Load #${load.loadNumber} - ${ps.type.replace(/_/g, ' ').toLowerCase()}`,
        miles: routeMiles,
        loadRevenueCents,
        payAmountCents,
        payStructureType: ps.type,
      });
    }

    const grossPayCents = lineItems.reduce((sum, li) => sum + li.payAmountCents, 0);

    // Preview mode: return calculation without creating
    if (data.preview) {
      return {
        driver_id: data.driver_id,
        driver_name: `${driver.firstName} ${driver.lastName}`,
        period_start: data.period_start,
        period_end: data.period_end,
        line_items: lineItems,
        gross_pay_cents: grossPayCents,
        deductions_cents: 0,
        net_pay_cents: grossPayCents,
        load_count: loads.length,
      };
    }

    // Create settlement
    const settlementNumber = await this.generateSettlementNumber(tenantId, driver.lastName, periodStart);

    const settlement = await this.prisma.settlement.create({
      data: {
        settlementId: `stl_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
        settlementNumber,
        status: 'DRAFT',
        driverId: driver.id,
        periodStart,
        periodEnd,
        grossPayCents,
        deductionsCents: 0,
        netPayCents: grossPayCents,
        tenantId,
        lineItems: {
          create: lineItems,
        },
      },
      include: { lineItems: true, driver: true },
    });

    this.logger.log(`Created settlement ${settlementNumber} for driver ${driver.driverId} (${loads.length} loads, gross $${(grossPayCents / 100).toFixed(2)})`);
    return settlement;
  }

  /** List settlements with filtering */
  async findAll(tenantId: number, filters?: { status?: string; driver_id?: string }, pagination?: { limit?: number; offset?: number }) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.driver_id) {
      const driver = await this.prisma.driver.findFirst({ where: { driverId: filters.driver_id, tenantId } });
      if (driver) where.driverId = driver.id;
    }

    return this.prisma.settlement.findMany({
      where,
      include: {
        driver: { select: { driverId: true, firstName: true, lastName: true } },
        lineItems: true,
        deductions: true,
      },
      orderBy: { createdAt: 'desc' },
      take: pagination?.limit ?? 50,
      skip: pagination?.offset ?? 0,
    });
  }

  /** Get single settlement with all relations */
  async findOne(tenantId: number, settlementId: string) {
    const settlement = await this.prisma.settlement.findFirst({
      where: { settlementId, tenantId },
      include: {
        driver: { select: { driverId: true, firstName: true, lastName: true } },
        lineItems: { include: { load: { select: { loadNumber: true, loadId: true } } } },
        deductions: true,
      },
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    return settlement;
  }

  /** Add deduction to draft settlement */
  async addDeduction(tenantId: number, settlementId: string, data: {
    type: string;
    description: string;
    amount_cents: number;
  }) {
    const settlement = await this.findOne(tenantId, settlementId);
    if (settlement.status !== 'DRAFT') throw new BadRequestException('Can only add deductions to draft settlements');

    const deduction = await this.prisma.settlementDeduction.create({
      data: {
        settlementId: settlement.id,
        type: data.type as any,
        description: data.description,
        amountCents: data.amount_cents,
      },
    });

    // Recalculate
    const totalDeductions = settlement.deductionsCents + data.amount_cents;
    await this.prisma.settlement.update({
      where: { id: settlement.id },
      data: {
        deductionsCents: totalDeductions,
        netPayCents: settlement.grossPayCents - totalDeductions,
      },
    });

    return deduction;
  }

  /** Remove deduction from draft settlement */
  async removeDeduction(tenantId: number, settlementId: string, deductionId: number) {
    const settlement = await this.findOne(tenantId, settlementId);
    if (settlement.status !== 'DRAFT') throw new BadRequestException('Can only remove deductions from draft settlements');

    const deduction = settlement.deductions.find(d => d.id === deductionId);
    if (!deduction) throw new NotFoundException('Deduction not found');

    await this.prisma.settlementDeduction.delete({ where: { id: deductionId } });

    const totalDeductions = settlement.deductionsCents - deduction.amountCents;
    await this.prisma.settlement.update({
      where: { id: settlement.id },
      data: {
        deductionsCents: totalDeductions,
        netPayCents: settlement.grossPayCents - totalDeductions,
      },
    });
  }

  /** Approve settlement */
  async approve(tenantId: number, settlementId: string, userId?: number) {
    const settlement = await this.findOne(tenantId, settlementId);
    if (settlement.status !== 'DRAFT') throw new BadRequestException('Can only approve draft settlements');

    return this.prisma.settlement.update({
      where: { id: settlement.id },
      data: {
        status: 'APPROVED',
        approvedBy: userId || null,
        approvedAt: new Date(),
      },
      include: { driver: true, lineItems: true, deductions: true },
    });
  }

  /** Mark settlement as paid */
  async markPaid(tenantId: number, settlementId: string) {
    const settlement = await this.findOne(tenantId, settlementId);
    if (settlement.status !== 'APPROVED') throw new BadRequestException('Can only mark approved settlements as paid');

    return this.prisma.settlement.update({
      where: { id: settlement.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
      include: { driver: true, lineItems: true, deductions: true },
    });
  }

  /** Void settlement */
  async voidSettlement(tenantId: number, settlementId: string) {
    const settlement = await this.findOne(tenantId, settlementId);
    if (settlement.status === 'VOID') throw new BadRequestException('Settlement is already voided');
    if (settlement.status === 'PAID') throw new BadRequestException('Cannot void a paid settlement');

    return this.prisma.settlement.update({
      where: { id: settlement.id },
      data: { status: 'VOID' },
      include: { driver: true, lineItems: true, deductions: true },
    });
  }

  /** Settlement summary stats */
  async getSummary(tenantId: number) {
    const [draftCount, approvedCount, paidThisPeriod, activeDrivers] = await Promise.all([
      this.prisma.settlement.count({ where: { tenantId, status: 'DRAFT' } }),
      this.prisma.settlement.count({ where: { tenantId, status: 'APPROVED' } }),
      this.prisma.settlement.aggregate({
        where: { tenantId, status: 'PAID', paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
        _sum: { netPayCents: true },
      }),
      this.prisma.driverPayStructure.count({ where: { tenantId } }),
    ]);

    return {
      pending_approval: draftCount,
      ready_to_pay: approvedCount,
      paid_this_month_cents: paidThisPeriod._sum.netPayCents ?? 0,
      active_drivers: activeDrivers,
    };
  }

  /** Generate settlement number: STL-YYYY-WNN-LASTNAME */
  private async generateSettlementNumber(tenantId: number, driverLastName: string, periodStart: Date): Promise<string> {
    const year = periodStart.getFullYear();
    const weekNum = Math.ceil(((periodStart.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
    const weekStr = `W${String(weekNum).padStart(2, '0')}`;
    const nameStr = driverLastName.toUpperCase().slice(0, 6);
    return `STL-${year}-${weekStr}-${nameStr}`;
  }
}
