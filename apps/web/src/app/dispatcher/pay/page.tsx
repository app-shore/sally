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
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useSettlements, useSettlementSummary, useCalculateSettlement } from "@/features/financials/pay";
import { SettlementDetailDialog } from "@/features/financials/pay/components/settlement-detail-dialog";
import type { Settlement } from "@/features/financials/pay/types";
import { Calculator, Users, DollarSign, Clock } from "lucide-react";
import { formatCents } from "@/shared/lib/utils/formatters";
import { SettlementStatusBadge } from "@/features/financials/pay/components/settlement-status-badge";
import { apiClient } from "@/shared/lib/api";

function getMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff).toISOString().split('T')[0];
}

function getSunday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  return new Date(d.getFullYear(), d.getMonth(), diff).toISOString().split('T')[0];
}

export default function PayPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [driverIdInput, setDriverIdInput] = useState("");
  const [periodStart, setPeriodStart] = useState(getMonday());
  const [periodEnd, setPeriodEnd] = useState(getSunday());

  const { data: summary, isLoading: summaryLoading } = useSettlementSummary();
  const { data: settlements, isLoading: settlementsLoading } = useSettlements(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const calculateSettlement = useCalculateSettlement();

  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => apiClient<Array<{ driver_id: string; name: string; is_active: boolean }>>('/drivers/'),
    enabled: calcOpen,
  });

  const handleCalculate = () => {
    if (!driverIdInput.trim() || !periodStart || !periodEnd) return;
    calculateSettlement.mutate(
      { driver_id: driverIdInput.trim(), period_start: periodStart, period_end: periodEnd },
      {
        onSuccess: () => {
          setCalcOpen(false);
          setDriverIdInput("");
          setPeriodStart(getMonday());
          setPeriodEnd(getSunday());
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
                  <Label>Driver</Label>
                  <Select value={driverIdInput} onValueChange={setDriverIdInput}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a driver..." />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers?.filter(d => d.is_active).map((driver) => (
                        <SelectItem key={driver.driver_id} value={driver.driver_id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  {formatCents(summary?.paid_this_month_cents ?? 0)}
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
                        key={s.settlementId}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        onClick={() => setSelectedSettlement(s)}
                      >
                        <TableCell className="font-medium text-foreground">
                          {s.settlementNumber}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {s.driver?.name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {new Date(s.periodStart).toLocaleDateString()} - {new Date(s.periodEnd).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {formatCents(s.grossPayCents)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-red-600 dark:text-red-400">
                          {s.deductionsCents > 0 ? `-${formatCents(s.deductionsCents)}` : "$0.00"}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {formatCents(s.netPayCents)}
                        </TableCell>
                        <TableCell><SettlementStatusBadge status={s.status} /></TableCell>
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
