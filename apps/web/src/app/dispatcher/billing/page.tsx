"use client";

import { useState } from "react";
import { FeatureGuard } from "@/features/platform/feature-flags";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useInvoices, useInvoiceSummary, useGenerateInvoice } from "@/features/financials/billing";
import { InvoiceDetailDialog } from "@/features/financials/billing/components/invoice-detail-dialog";
import type { Invoice, InvoiceStatus } from "@/features/financials/billing/types";
import { DollarSign, FileText, AlertTriangle, Clock } from "lucide-react";

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function getStatusBadge(status: InvoiceStatus) {
  const variants: Record<InvoiceStatus, { className: string; label: string }> = {
    DRAFT: { className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", label: "Draft" },
    SENT: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", label: "Sent" },
    VIEWED: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", label: "Viewed" },
    PARTIAL: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", label: "Partial" },
    PAID: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", label: "Paid" },
    OVERDUE: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", label: "Overdue" },
    VOID: { className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500", label: "Void" },
    FACTORED: { className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", label: "Factored" },
  };
  const v = variants[status];
  return <Badge className={v.className}>{v.label}</Badge>;
}

export default function BillingPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [loadIdInput, setLoadIdInput] = useState("");

  const { data: summary, isLoading: summaryLoading } = useInvoiceSummary();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const generateInvoice = useGenerateInvoice();

  const handleGenerate = () => {
    if (!loadIdInput.trim()) return;
    generateInvoice.mutate(
      { loadId: loadIdInput.trim() },
      {
        onSuccess: () => {
          setGenerateOpen(false);
          setLoadIdInput("");
        },
      }
    );
  };

  return (
    <FeatureGuard featureKey="billing_enabled">
      <div className="space-y-4 md:space-y-6 px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Billing
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Create, send, and track invoices for completed loads
            </p>
          </div>
          <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
            <DialogTrigger asChild>
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Generate Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Generate Invoice</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="load-id">Load ID</Label>
                  <Input
                    id="load-id"
                    placeholder="e.g. LD-20260213-001"
                    value={loadIdInput}
                    onChange={(e) => setLoadIdInput(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={generateInvoice.isPending || !loadIdInput.trim()}
                >
                  {generateInvoice.isPending ? "Generating..." : "Generate"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(summary?.outstanding_cents ?? 0)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(summary?.overdue_cents ?? 0)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Paid This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(summary?.paid_this_month_cents ?? 0)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-foreground">
                  {summary?.draft_count ?? 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filter + Table */}
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-foreground">Invoices</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="VOID">Void</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !invoices?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                No invoices found. Generate your first invoice from a delivered load.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="hidden sm:table-cell">Customer</TableHead>
                      <TableHead className="hidden md:table-cell">Load</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="hidden sm:table-cell">Balance</TableHead>
                      <TableHead className="hidden lg:table-cell">Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow
                        key={invoice.invoice_id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <TableCell className="font-medium text-foreground">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {invoice.customer?.company_name ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {invoice.load?.load_number ?? "—"}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {formatCurrency(invoice.total_cents)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-foreground">
                          {formatCurrency(invoice.balance_cents)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice Detail Dialog */}
      {selectedInvoice && (
        <InvoiceDetailDialog
          invoice={selectedInvoice}
          open={!!selectedInvoice}
          onOpenChange={(open) => {
            if (!open) setSelectedInvoice(null);
          }}
        />
      )}
    </FeatureGuard>
  );
}
