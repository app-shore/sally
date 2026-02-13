export type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'VOID' | 'FACTORED';
export type LineItemType = 'LINEHAUL' | 'FUEL_SURCHARGE' | 'DETENTION_PICKUP' | 'DETENTION_DELIVERY' | 'LAYOVER' | 'LUMPER' | 'TONU' | 'ACCESSORIAL' | 'ADJUSTMENT';

export interface InvoiceLineItem {
  id: number;
  type: LineItemType;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  sequence_order: number;
}

export interface InvoicePayment {
  id: number;
  payment_id: string;
  amount_cents: number;
  payment_method: string | null;
  reference_number: string | null;
  payment_date: string;
  notes: string | null;
}

export interface Invoice {
  id: number;
  invoice_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  customer_id: number;
  customer: { company_name: string; billing_email?: string };
  load_id: number;
  load: { load_number: string; load_id: string };
  subtotal_cents: number;
  adjustment_cents: number;
  total_cents: number;
  paid_cents: number;
  balance_cents: number;
  issue_date: string;
  due_date: string;
  paid_date: string | null;
  payment_terms_days: number;
  notes: string | null;
  internal_notes: string | null;
  qb_invoice_id: string | null;
  qb_synced_at: string | null;
  created_at: string;
  line_items: InvoiceLineItem[];
  payments?: InvoicePayment[];
}

export interface InvoiceSummary {
  outstanding_cents: number;
  overdue_cents: number;
  paid_this_month_cents: number;
  draft_count: number;
  aging: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_over_90: number;
  };
}
