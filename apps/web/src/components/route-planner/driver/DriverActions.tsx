"use client";

/**
 * Driver Actions - Action buttons for drivers
 *
 * Shows:
 * - Request rest stop change
 * - Report delay
 * - View full details link
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RoutePlan } from "@/lib/types/routePlan";
import { MessageSquare, Clock, FileText } from "lucide-react";

interface DriverActionsProps {
  plan: RoutePlan;
}

export default function DriverActions({ plan }: DriverActionsProps) {
  const handleRequestChange = () => {
    // In production: open dialog to request rest stop change
    alert("Request rest stop change - coming soon");
  };

  const handleReportDelay = () => {
    // In production: open dialog to report delay
    alert("Report delay - coming soon");
  };

  const handleViewDetails = () => {
    // In production: navigate to full plan details
    alert("View full details - coming soon");
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 text-base"
            onClick={handleRequestChange}
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            Request Rest Stop Change
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 text-base"
            onClick={handleReportDelay}
          >
            <Clock className="h-5 w-5 mr-2" />
            Report Delay
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 text-base"
            onClick={handleViewDetails}
          >
            <FileText className="h-5 w-5 mr-2" />
            View Full Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
