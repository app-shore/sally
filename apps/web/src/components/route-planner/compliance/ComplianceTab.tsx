"use client";

/**
 * Compliance Tab - Audit-ready HOS compliance view
 *
 * Fleet manager compliance verification with:
 * - HOS progress bars (drive, on-duty, since-break)
 * - REST decision log with complete reasoning
 * - Breaks required vs planned
 * - Export functionality
 */

import type { RoutePlan } from "@/lib/types/routePlan";
import ComplianceReport from "./ComplianceReport";

interface ComplianceTabProps {
  plan: RoutePlan;
}

export default function ComplianceTab({ plan }: ComplianceTabProps) {
  return (
    <div className="space-y-4">
      <ComplianceReport plan={plan} />
    </div>
  );
}
