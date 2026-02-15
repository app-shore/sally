export type SettlementStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'VOID';
export type PayStructureType = 'PER_MILE' | 'PERCENTAGE' | 'FLAT_RATE' | 'HYBRID';
export type DeductionType = 'FUEL_ADVANCE' | 'CASH_ADVANCE' | 'INSURANCE' | 'EQUIPMENT_LEASE' | 'ESCROW' | 'OTHER';

export interface DriverPayStructure {
  id: number;
  driverId: number;
  type: PayStructureType;
  ratePerMileCents: number | null;
  percentage: number | null;
  flatRateCents: number | null;
  hybridBaseCents: number | null;
  hybridPercent: number | null;
  effectiveDate: string;
  notes: string | null;
}

export interface SettlementLineItem {
  id: number;
  loadId: number;
  load?: { loadNumber: string; loadId: string };
  description: string;
  miles: number | null;
  loadRevenueCents: number | null;
  payAmountCents: number;
  payStructureType: PayStructureType;
}

export interface SettlementDeduction {
  id: number;
  type: DeductionType;
  description: string;
  amountCents: number;
}

export interface Settlement {
  id: number;
  settlementId: string;
  settlementNumber: string;
  status: SettlementStatus;
  driverId: number;
  driver: { driverId: string; name: string };
  periodStart: string;
  periodEnd: string;
  grossPayCents: number;
  deductionsCents: number;
  netPayCents: number;
  notes: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  lineItems: SettlementLineItem[];
  deductions: SettlementDeduction[];
}

export interface SettlementSummary {
  pending_approval: number;
  ready_to_pay: number;
  paid_this_month_cents: number;
  active_drivers: number;
}
