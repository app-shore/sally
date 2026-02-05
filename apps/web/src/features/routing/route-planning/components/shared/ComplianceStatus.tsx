"use client";

import { useRoutePlanStore } from "@/features/routing/route-planning";
import { Card } from "@/shared/components/ui/card";

export function ComplianceStatus() {
  const { currentPlan } = useRoutePlanStore();

  if (!currentPlan) return null;

  const compliance = currentPlan.compliance_report || {};
  const isCompliant = currentPlan.is_feasible !== false;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold">HOS Compliance Report</h4>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${isCompliant ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {isCompliant ? "✓ Compliant" : "✗ Non-Compliant"}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Drive Hours</span>
            <span className="font-medium">{compliance.max_drive_hours_used || 0} / 11.0h</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${((compliance.max_drive_hours_used || 0) / 11) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">On-Duty Hours</span>
            <span className="font-medium">{compliance.max_duty_hours_used || 0} / 14.0h</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${((compliance.max_duty_hours_used || 0) / 14) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
