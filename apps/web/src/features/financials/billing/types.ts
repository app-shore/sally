export type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'VOID' | 'FACTORED';
export type LineItemType = 'LINEHAUL' | 'FUEL_SURCHARGE' | 'DETENTION_PICKUP' | 'DETENTION_DELIVERY' | 'LAYOVER' | 'LUMPER' | 'TONU' | 'ACCESSORIAL' | 'ADJUSTMENT';

export interface InvoiceLineItem {
  id: number;
  type: LineItemType;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  sequenceOrder: number;
}

export interface InvoicePayment {
  id: number;
  paymentId: string;
  amountCents: number;
  paymentMethod: string | null;
  referenceNumber: string | null;
  paymentDate: string;
  notes: string | null;
}

export interface Invoice {
  id: number;
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  customerId: number;
  customer: { companyName: string; billingEmail?: string };
  loadId: number;
  load: { loadNumber: string; loadId: string };
  subtotalCents: number;
  adjustmentCents: number;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  paymentTermsDays: number;
  notes: string | null;
  internalNotes: string | null;
  qbInvoiceId: string | null;
  qbSyncedAt: string | null;
  createdAt: string;
  lineItems: InvoiceLineItem[];
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
