"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getLoads, getLoad } from "@/lib/api/loads";
import { useRoutePlanStore } from "@/lib/store/routePlanStore";
import type { StopInput } from "@/lib/types/routePlan";

export function LoadSelector() {
  const { selectedLoadId, setSelectedLoadId, setStops, selectedLoad } = useRoutePlanStore();

  // Fetch list of loads
  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['loads', 'available'],
    queryFn: () => getLoads({ status: 'pending' }),
  });

  // Fetch selected load details
  const { data: loadDetails } = useQuery({
    queryKey: ['load', selectedLoadId],
    queryFn: () => getLoad(selectedLoadId!),
    enabled: !!selectedLoadId,
  });

  // Update stops when load details are fetched
  useEffect(() => {
    if (loadDetails?.stops && loadDetails.stops.length > 0) {
      // Convert load stops to StopInput format
      const stops: StopInput[] = loadDetails.stops
        .sort((a, b) => a.sequence_order - b.sequence_order)
        .map((stop) => ({
          stop_id: `${stop.stop_id}`,
          name: stop.stop_name || 'Unknown Stop',
          city: stop.stop_city || '',
          state: stop.stop_state || '',
          lat: 0, // Will be populated by backend
          lon: 0, // Will be populated by backend
          location_type: 'customer' as const,
          action_type: stop.action_type,
          earliest_arrival: stop.earliest_arrival,
          latest_arrival: stop.latest_arrival,
          estimated_dock_hours: stop.estimated_dock_hours,
        }));

      setStops(stops);

      // Store the full load for display
      useRoutePlanStore.getState().selectLoad(loadDetails);
    }
  }, [loadDetails, setStops]);

  const handleLoadChange = (loadId: string) => {
    setSelectedLoadId(loadId);
  };

  // Calculate distance estimate (placeholder - would come from backend)
  const estimateDistance = (stopCount: number) => {
    return Math.floor(100 + stopCount * 150); // Rough estimate
  };

  return (
    <div className="space-y-2">
      <Label>Load</Label>
      <Select
        value={selectedLoadId || undefined}
        onValueChange={handleLoadChange}
        disabled={isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading loads..." : "Select load..."} />
        </SelectTrigger>
        <SelectContent>
          {loads.map((load) => (
            <SelectItem key={load.load_id} value={load.load_id}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{load.load_number}</span>
                <span className="text-muted-foreground">• {load.customer_name}</span>
                <Badge variant="outline">{load.stop_count} stops</Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Load details card (appears after selection) */}
      {loadDetails && (
        <div className="mt-2 p-3 bg-muted/30 rounded-md text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-4 flex-wrap">
            <span>📦 {loadDetails.weight_lbs.toLocaleString()} lbs</span>
            <span>🏭 {loadDetails.commodity_type}</span>
            <span>📏 ~{estimateDistance(loadDetails.stops.length)} mi</span>
            <Badge variant="secondary">{loadDetails.stops.length} stops</Badge>
          </div>
          {loadDetails.stops.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="text-xs">
                {loadDetails.stops[0].stop_city && loadDetails.stops[0].stop_state && (
                  <span className="font-medium">
                    {loadDetails.stops[0].stop_city}, {loadDetails.stops[0].stop_state}
                  </span>
                )}
                {loadDetails.stops.length > 1 &&
                  loadDetails.stops[loadDetails.stops.length - 1].stop_city &&
                  loadDetails.stops[loadDetails.stops.length - 1].stop_state && (
                  <>
                    <span className="mx-2">→</span>
                    <span className="font-medium">
                      {loadDetails.stops[loadDetails.stops.length - 1].stop_city}, {loadDetails.stops[loadDetails.stops.length - 1].stop_state}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
