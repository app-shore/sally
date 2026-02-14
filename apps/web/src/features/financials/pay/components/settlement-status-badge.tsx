import { Badge } from "@/shared/components/ui/badge";
import type { SettlementStatus } from "../types";

const variants: Record<SettlementStatus, { className: string; label: string }> = {
  DRAFT: { className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", label: "Draft" },
  APPROVED: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", label: "Approved" },
  PAID: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", label: "Paid" },
  VOID: { className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500", label: "Void" },
};

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  const v = variants[status];
  return <Badge className={v.className}>{v.label}</Badge>;
}
