export type SettlementStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'VOID';
export type PayStructureType = 'PER_MILE' | 'PERCENTAGE' | 'FLAT_RATE' | 'HYBRID';
export type DeductionType = 'FUEL_ADVANCE' | 'CASH_ADVANCE' | 'INSURANCE' | 'EQUIPMENT_LEASE' | 'ESCROW' | 'OTHER';

export interface DriverPayStructure {
  id: number;
  driver_id: number;
  type: PayStructureType;
  rate_per_mile_cents: number | null;
  percentage: number | null;
  flat_rate_cents: number | null;
  hybrid_base_cents: number | null;
  hybrid_percent: number | null;
  effective_date: string;
  notes: string | null;
}

export interface SettlementLineItem {
  id: number;
  load_id: number;
  load?: { load_number: string; load_id: string };
  description: string;
  miles: number | null;
  load_revenue_cents: number | null;
  pay_amount_cents: number;
  pay_structure_type: PayStructureType;
}

export interface SettlementDeduction {
  id: number;
  type: DeductionType;
  description: string;
  amount_cents: number;
}

export interface Settlement {
  id: number;
  settlement_id: string;
  settlement_number: string;
  status: SettlementStatus;
  driver_id: number;
  driver: { driver_id: string; first_name: string; last_name: string };
  period_start: string;
  period_end: string;
  gross_pay_cents: number;
  deductions_cents: number;
  net_pay_cents: number;
  notes: string | null;
  approved_by: number | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  line_items: SettlementLineItem[];
  deductions: SettlementDeduction[];
}

export interface SettlementSummary {
  pending_approval: number;
  ready_to_pay: number;
  paid_this_month_cents: number;
  active_drivers: number;
}
