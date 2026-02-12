"use client";

import { Check, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import type { ComplianceReport } from "@/features/routing/route-planning";

interface ComplianceCardProps {
  report: ComplianceReport;
}

export function ComplianceCard({ report }: ComplianceCardProps) {
  const summaryParts: string[] = [];
  if (report.totalRestStops > 0)
    summaryParts.push(
      `${report.totalRestStops} rest stop${report.totalRestStops > 1 ? "s" : ""}`
    );
  if (report.totalBreaks > 0)
    summaryParts.push(
      `${report.totalBreaks} break${report.totalBreaks > 1 ? "s" : ""}`
    );
  if (report.total34hRestarts > 0)
    summaryParts.push(`${report.total34hRestarts} restart`);
  if (report.totalSplitRests > 0)
    summaryParts.push(`${report.totalSplitRests} split rest`);
  if (report.dockTimeConversions > 0)
    summaryParts.push(`${report.dockTimeConversions} dock conversion`);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {report.isFullyCompliant ? (
            <>
              <div className="h-5 w-5 rounded-full bg-green-500 dark:bg-green-400 flex items-center justify-center">
                <Check className="h-3 w-3 text-white dark:text-black" />
              </div>
              <span>HOS Fully Compliant</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
              <span>HOS Requires Attention</span>
            </>
          )}
        </CardTitle>
        {summaryParts.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {summaryParts.join(" \u00B7 ")}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {report.rules.map((rule) => (
            <div key={rule.rule} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-green-500 dark:text-green-400 flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{rule.rule}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
