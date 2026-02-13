"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { useApproveSettlement, useMarkSettlementPaid, useVoidSettlement, useRemoveDeduction } from "../hooks/use-settlements";
import { AddDeductionDialog } from "./add-deduction-dialog";
import type { Settlement, SettlementStatus } from "../types";
import { CheckCircle, DollarSign, Ban, Plus, Trash2 } from "lucide-react";

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

interface SettlementDetailDialogProps {
  settlement: Settlement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettlementDetailDialog({
  settlement,
  open,
  onOpenChange,
}: SettlementDetailDialogProps) {
  const [deductionOpen, setDeductionOpen] = useState(false);
  const approveSettlement = useApproveSettlement();
  const markPaid = useMarkSettlementPaid();
  const voidSettlement = useVoidSettlement();
  const removeDeduction = useRemoveDeduction();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle className="text-foreground">
                {settlement.settlement_number}
              </DialogTitle>
              {getStatusBadge(settlement.status)}
            </div>
            <div className="text-sm text-muted-foreground">
              {settlement.driver?.first_name} {settlement.driver?.last_name} &middot;{" "}
              {new Date(settlement.period_start).toLocaleDateString()} -{" "}
              {new Date(settlement.period_end).toLocaleDateString()}
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Earnings */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Earnings</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Load</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Miles</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Revenue</TableHead>
                      <TableHead className="text-right">Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlement.line_items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-foreground">
                          {item.load?.load_number ?? `#${item.load_id}`}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.description}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground hidden sm:table-cell">
                          {item.miles?.toFixed(0) ?? "—"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground hidden sm:table-cell">
                          {item.load_revenue_cents ? formatCurrency(item.load_revenue_cents) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {formatCurrency(item.pay_amount_cents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Deductions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Deductions</h3>
                {settlement.status === "DRAFT" && (
                  <Button variant="outline" size="sm" onClick={() => setDeductionOpen(true)}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                )}
              </div>
              {settlement.deductions?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      {settlement.status === "DRAFT" && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlement.deductions.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-muted-foreground text-xs">
                          {d.type.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-foreground">{d.description}</TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400 font-medium">
                          -{formatCurrency(d.amount_cents)}
                        </TableCell>
                        {settlement.status === "DRAFT" && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                removeDeduction.mutate({
                                  settlementId: settlement.settlement_id,
                                  deductionId: d.id,
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No deductions</p>
              )}
            </div>

            <Separator />

            {/* Net Pay Summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-foreground">
                <span>Gross Pay</span>
                <span className="font-medium">{formatCurrency(settlement.gross_pay_cents)}</span>
              </div>
              <div className="flex justify-between text-red-600 dark:text-red-400">
                <span>Deductions</span>
                <span>-{formatCurrency(settlement.deductions_cents)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-foreground text-base">
                <span>Net Pay</span>
                <span>{formatCurrency(settlement.net_pay_cents)}</span>
              </div>
            </div>

            {/* Actions */}
            <Separator />
            <div className="flex flex-wrap gap-2">
              {settlement.status === "DRAFT" && (
                <Button
                  onClick={() => approveSettlement.mutate(settlement.settlement_id)}
                  disabled={approveSettlement.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {approveSettlement.isPending ? "Approving..." : "Approve"}
                </Button>
              )}
              {settlement.status === "APPROVED" && (
                <Button
                  onClick={() => markPaid.mutate(settlement.settlement_id)}
                  disabled={markPaid.isPending}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  {markPaid.isPending ? "Processing..." : "Mark as Paid"}
                </Button>
              )}
              {settlement.status !== "VOID" && settlement.status !== "PAID" && (
                <Button
                  variant="destructive"
                  onClick={() => voidSettlement.mutate(settlement.settlement_id)}
                  disabled={voidSettlement.isPending}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  {voidSettlement.isPending ? "Voiding..." : "Void"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddDeductionDialog
        settlementId={settlement.settlement_id}
        open={deductionOpen}
        onOpenChange={setDeductionOpen}
      />
    </>
  );
}
