"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FeatureGuard } from "@/features/platform/feature-flags";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
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
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useInvoices, useInvoiceSummary, useGenerateInvoice } from "@/features/financials/billing";
import { InvoiceDetailDialog } from "@/features/financials/billing/components/invoice-detail-dialog";
import type { Invoice } from "@/features/financials/billing/types";
import { DollarSign, FileText, AlertTriangle, Clock } from "lucide-react";
import { formatCents } from "@/shared/lib/utils/formatters";
import { InvoiceStatusBadge } from "@/features/financials/billing/components/invoice-status-badge";
import { apiClient } from "@/shared/lib/api";

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

  const { data: deliveredLoads } = useQuery({
    queryKey: ['loads', 'delivered'],
    queryFn: () => apiClient<Array<{ loadId: string; loadNumber: string; customerName: string; rateCents: number | null }>>('/loads/?status=delivered&limit=100'),
    enabled: generateOpen,
  });

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
                  <Label>Select Delivered Load</Label>
                  <Select value={loadIdInput} onValueChange={setLoadIdInput}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a delivered load..." />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveredLoads?.map((load) => (
                        <SelectItem key={load.loadId} value={load.loadId}>
                          {load.loadNumber} — {load.customerName}
                          {load.rateCents ? ` (${formatCents(load.rateCents)})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  {formatCents(summary?.outstanding_cents ?? 0)}
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
                  {formatCents(summary?.overdue_cents ?? 0)}
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
                  {formatCents(summary?.paid_this_month_cents ?? 0)}
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
                        key={invoice.invoiceId}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <TableCell className="font-medium text-foreground">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {invoice.customer?.companyName ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {invoice.load?.loadNumber ?? "—"}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {formatCents(invoice.totalCents)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-foreground">
                          {formatCents(invoice.balanceCents)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell><InvoiceStatusBadge status={invoice.status} /></TableCell>
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
