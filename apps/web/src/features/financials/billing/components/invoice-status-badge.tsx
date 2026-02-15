import { Badge } from "@/shared/components/ui/badge";
import type { InvoiceStatus } from "../types";

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

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const v = variants[status];
  return <Badge className={v.className}>{v.label}</Badge>;
}
