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
import { useSettlements, useSettlementSummary, useCalculateSettlement } from "@/features/financials/pay";
import { SettlementDetailDialog } from "@/features/financials/pay/components/settlement-detail-dialog";
import type { Settlement, SettlementStatus } from "@/features/financials/pay/types";
import { Calculator, Users, DollarSign, Clock } from "lucide-react";

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function getStatusBadge(status: SettlementStatus) {
  const variants: Record<SettlementStatus, { className: string; label: string }> = {
    DRAFT: { className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", label: "Draft" },
    APPROVED: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", label: "Approved" },
    PAID: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", label: "Paid" },
    VOID: { className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500", label: "Void" },
  };
  const v = variants[status];
  return <Badge className={v.className}>{v.label}</Badge>;
}

export default function PayPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [driverIdInput, setDriverIdInput] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const { data: summary, isLoading: summaryLoading } = useSettlementSummary();
  const { data: settlements, isLoading: settlementsLoading } = useSettlements(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const calculateSettlement = useCalculateSettlement();

  const handleCalculate = () => {
    if (!driverIdInput.trim() || !periodStart || !periodEnd) return;
    calculateSettlement.mutate(
      { driver_id: driverIdInput.trim(), period_start: periodStart, period_end: periodEnd },
      {
        onSuccess: () => {
          setCalcOpen(false);
          setDriverIdInput("");
          setPeriodStart("");
          setPeriodEnd("");
        },
      }
    );
  };

  return (
    <FeatureGuard featureKey="driver_pay_enabled">
      <div className="space-y-4 md:space-y-6 px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Pay
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Calculate and manage driver pay with flexible rate structures
            </p>
          </div>
          <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
            <DialogTrigger asChild>
              <Button>
                <Calculator className="mr-2 h-4 w-4" />
                Calculate Settlement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Calculate Settlement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="driver-id">Driver ID</Label>
                  <Input
                    id="driver-id"
                    placeholder="e.g. DRV-001"
                    value={driverIdInput}
                    onChange={(e) => setDriverIdInput(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="period-start">Period Start</Label>
                    <Input
                      id="period-start"
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period-end">Period End</Label>
                    <Input
                      id="period-end"
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleCalculate}
                  disabled={calculateSettlement.isPending || !driverIdInput.trim() || !periodStart || !periodEnd}
                >
                  {calculateSettlement.isPending ? "Calculating..." : "Calculate & Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold text-foreground">{summary?.pending_approval ?? 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ready to Pay</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary?.ready_to_pay ?? 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Paid This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(summary?.paid_this_month_cents ?? 0)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Drivers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold text-foreground">{summary?.active_drivers ?? 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filter + Table */}
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-foreground">Settlements</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="VOID">Void</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {settlementsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !settlements?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                No settlements found. Calculate your first settlement for a driver.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Settlement #</TableHead>
                      <TableHead className="hidden sm:table-cell">Driver</TableHead>
                      <TableHead className="hidden md:table-cell">Period</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead className="hidden sm:table-cell">Deductions</TableHead>
                      <TableHead>Net Pay</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlements.map((s) => (
                      <TableRow
                        key={s.settlement_id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        onClick={() => setSelectedSettlement(s)}
                      >
                        <TableCell className="font-medium text-foreground">
                          {s.settlement_number}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {s.driver?.first_name} {s.driver?.last_name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {new Date(s.period_start).toLocaleDateString()} - {new Date(s.period_end).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {formatCurrency(s.gross_pay_cents)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-red-600 dark:text-red-400">
                          {s.deductions_cents > 0 ? `-${formatCurrency(s.deductions_cents)}` : "$0.00"}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {formatCurrency(s.net_pay_cents)}
                        </TableCell>
                        <TableCell>{getStatusBadge(s.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settlement Detail Dialog */}
      {selectedSettlement && (
        <SettlementDetailDialog
          settlement={selectedSettlement}
          open={!!selectedSettlement}
          onOpenChange={(open) => {
            if (!open) setSelectedSettlement(null);
          }}
        />
      )}
    </FeatureGuard>
  );
}
