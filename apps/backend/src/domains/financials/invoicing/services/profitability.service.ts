import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

export interface LoadProfitability {
  load_id: string;
  load_number: string;
  revenue_cents: number;
  driver_cost_cents: number;
  fuel_cost_cents: number;
  margin_cents: number;
  margin_percent: number;
}

@Injectable()
export class ProfitabilityService {
  private readonly logger = new Logger(ProfitabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate profitability for a single load.
   * Revenue = invoice total (or load rate if no invoice)
   * Driver cost = settlement line item pay amount
   * Fuel cost = estimated from route miles / mpg * fuel price
   */
  async calculateForLoad(tenantId: number, loadId: string): Promise<LoadProfitability> {
    const load = await this.prisma.load.findFirst({
      where: { loadId, tenantId },
      include: {
        invoices: { where: { status: { not: 'VOID' } }, select: { totalCents: true }, take: 1 },
        settlementLineItems: { select: { payAmountCents: true } },
        routePlanLoads: { include: { plan: { select: { totalMiles: true } } } },
      },
    });

    if (!load) return this.emptyProfitability(loadId, '');

    const revenueCents = load.invoices[0]?.totalCents ?? load.rateCents ?? 0;
    const driverCostCents = load.settlementLineItems.reduce((sum, li) => sum + li.payAmountCents, 0);

    // Estimate fuel cost: miles / 6.5 mpg * $3.50/gal
    const routeMiles = load.routePlanLoads?.[0]?.plan?.totalMiles ?? 0;
    const estimatedMpg = 6.5;
    const estimatedFuelPricePerGalCents = 350;
    const fuelCostCents = routeMiles > 0 ? Math.round((routeMiles / estimatedMpg) * estimatedFuelPricePerGalCents) : 0;

    const marginCents = revenueCents - driverCostCents - fuelCostCents;
    const marginPercent = revenueCents > 0 ? (marginCents / revenueCents) * 100 : 0;

    return {
      load_id: load.loadId,
      load_number: load.loadNumber,
      revenue_cents: revenueCents,
      driver_cost_cents: driverCostCents,
      fuel_cost_cents: fuelCostCents,
      margin_cents: marginCents,
      margin_percent: Math.round(marginPercent * 10) / 10,
    };
  }

  /** Calculate profitability for all delivered loads */
  async calculateForTenant(tenantId: number, limit = 50): Promise<LoadProfitability[]> {
    const loads = await this.prisma.load.findMany({
      where: { tenantId, status: 'delivered' },
      include: {
        invoices: { where: { status: { not: 'VOID' } }, select: { totalCents: true }, take: 1 },
        settlementLineItems: { select: { payAmountCents: true } },
        routePlanLoads: { include: { plan: { select: { totalMiles: true } } } },
      },
      orderBy: { deliveredAt: 'desc' },
      take: limit,
    });

    return loads.map(load => {
      const revenueCents = load.invoices[0]?.totalCents ?? load.rateCents ?? 0;
      const driverCostCents = load.settlementLineItems.reduce((sum, li) => sum + li.payAmountCents, 0);
      const routeMiles = load.routePlanLoads?.[0]?.plan?.totalMiles ?? 0;
      const fuelCostCents = routeMiles > 0 ? Math.round((routeMiles / 6.5) * 350) : 0;
      const marginCents = revenueCents - driverCostCents - fuelCostCents;
      const marginPercent = revenueCents > 0 ? (marginCents / revenueCents) * 100 : 0;

      return {
        load_id: load.loadId,
        load_number: load.loadNumber,
        revenue_cents: revenueCents,
        driver_cost_cents: driverCostCents,
        fuel_cost_cents: fuelCostCents,
        margin_cents: marginCents,
        margin_percent: Math.round(marginPercent * 10) / 10,
      };
    });
  }

  private emptyProfitability(loadId: string, loadNumber: string): LoadProfitability {
    return {
      load_id: loadId,
      load_number: loadNumber,
      revenue_cents: 0,
      driver_cost_cents: 0,
      fuel_cost_cents: 0,
      margin_cents: 0,
      margin_percent: 0,
    };
  }
}
