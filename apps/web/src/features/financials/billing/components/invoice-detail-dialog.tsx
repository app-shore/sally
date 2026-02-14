"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { useSendInvoice, useVoidInvoice } from "../hooks/use-invoices";
import { RecordPaymentDialog } from "./record-payment-dialog";
import type { Invoice } from "../types";
import { Send, Ban, DollarSign } from "lucide-react";
import { formatCents } from "@/shared/lib/utils/formatters";
import { InvoiceStatusBadge } from "./invoice-status-badge";

interface InvoiceDetailDialogProps {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDetailDialog({
  invoice,
  open,
  onOpenChange,
}: InvoiceDetailDialogProps) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const sendInvoice = useSendInvoice();
  const voidInvoice = useVoidInvoice();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle className="text-foreground">
                {invoice.invoice_number}
              </DialogTitle>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <div className="text-sm text-muted-foreground">
              {invoice.customer?.company_name} &middot; Load #{invoice.load?.load_number}
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Dates */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Issue Date</span>
                <p className="font-medium text-foreground">
                  {new Date(invoice.issue_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Due Date</span>
                <p className="font-medium text-foreground">
                  {new Date(invoice.due_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Terms</span>
                <p className="font-medium text-foreground">
                  Net {invoice.payment_terms_days}
                </p>
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Line Items</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.line_items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground text-xs">
                          {item.type.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {item.description}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {formatCents(item.unit_price_cents)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {formatCents(item.total_cents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="text-foreground">{formatCents(invoice.subtotal_cents)}</span>
              </div>
              {invoice.adjustment_cents !== 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Adjustments</span>
                  <span className="text-foreground">{formatCents(invoice.adjustment_cents)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-foreground">
                <span>Total</span>
                <span>{formatCents(invoice.total_cents)}</span>
              </div>
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Paid</span>
                <span>{formatCents(invoice.paid_cents)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground text-base">
                <span>Balance Due</span>
                <span>{formatCents(invoice.balance_cents)}</span>
              </div>
            </div>

            {/* Payments History */}
            {invoice.payments && invoice.payments.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Payment History</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.payments.map((payment) => (
                        <TableRow key={payment.payment_id}>
                          <TableCell className="text-foreground">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {payment.payment_method ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {payment.reference_number ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                            {formatCents(payment.amount_cents)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            {/* Notes */}
            {invoice.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Notes</h3>
                  <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                </div>
              </>
            )}

            {/* Actions */}
            <Separator />
            <div className="flex flex-wrap gap-2">
              {invoice.status === "DRAFT" && (
                <Button
                  onClick={() => sendInvoice.mutate(invoice.invoice_id)}
                  disabled={sendInvoice.isPending}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sendInvoice.isPending ? "Sending..." : "Mark as Sent"}
                </Button>
              )}
              {invoice.status !== "PAID" && invoice.status !== "VOID" && (
                <Button variant="outline" onClick={() => setPaymentOpen(true)}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              )}
              {invoice.status !== "VOID" && invoice.status !== "PAID" && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to void invoice ${invoice.invoice_number}? This action cannot be undone.`)) {
                      voidInvoice.mutate(invoice.invoice_id);
                    }
                  }}
                  disabled={voidInvoice.isPending}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  {voidInvoice.isPending ? "Voiding..." : "Void"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RecordPaymentDialog
        invoiceId={invoice.invoice_id}
        balanceCents={invoice.balance_cents}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
      />
    </>
  );
}
