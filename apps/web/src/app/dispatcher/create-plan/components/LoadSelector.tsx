"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Package, Search } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Label } from "@/shared/components/ui/label";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { useLoads } from "@/features/fleet/loads/hooks/use-loads";
import type { LoadListItem } from "@/features/fleet/loads/types";

interface LoadSelectorProps {
  selectedLoadIds: string[];
  onSelectionChange: (loadIds: string[]) => void;
}

export function LoadSelector({
  selectedLoadIds,
  onSelectionChange,
}: LoadSelectorProps) {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: loads, isLoading, error } = useLoads({ status: "pending" });

  // Pre-select load from URL query param (?load_id=LD-XXXX)
  useEffect(() => {
    const loadId = searchParams.get("load_id");
    if (loadId && loads && loads.length > 0 && selectedLoadIds.length === 0) {
      const match = loads.find((l) => l.load_id === loadId);
      if (match) {
        onSelectionChange([loadId]);
      }
    }
  }, [searchParams, loads, selectedLoadIds.length, onSelectionChange]);

  const filteredLoads = useMemo(() => {
    if (!loads) return [];
    if (!searchQuery.trim()) return loads;

    const query = searchQuery.toLowerCase();
    return loads.filter(
      (load) =>
        load.load_number.toLowerCase().includes(query) ||
        load.customer_name.toLowerCase().includes(query) ||
        load.load_id.toLowerCase().includes(query)
    );
  }, [loads, searchQuery]);

  const toggleLoad = (loadId: string) => {
    if (selectedLoadIds.includes(loadId)) {
      onSelectionChange(selectedLoadIds.filter((id) => id !== loadId));
    } else {
      onSelectionChange([...selectedLoadIds, loadId]);
    }
  };

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load loads. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground">
          Select Loads
        </Label>
        {selectedLoadIds.length > 0 && (
          <Badge variant="muted" className="text-xs">
            {selectedLoadIds.length} selected
          </Badge>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by load number, customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[220px] rounded-md border border-border">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 mt-1 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredLoads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <Package className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "No loads match your search"
                : "No unplanned loads available"}
            </p>
            {!searchQuery && (
              <p className="text-xs text-muted-foreground mt-1">
                Create loads in Fleet Management first
              </p>
            )}
          </div>
        ) : (
          <div className="p-1">
            {filteredLoads.map((load) => (
              <LoadRow
                key={load.load_id}
                load={load}
                isSelected={selectedLoadIds.includes(load.load_id)}
                onToggle={() => toggleLoad(load.load_id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function LoadRow({
  load,
  isSelected,
  onToggle,
}: {
  load: LoadListItem;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-start gap-3 p-3 rounded-md text-left transition-colors hover:bg-muted/50 ${
        isSelected ? "bg-muted/70" : ""
      }`}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        className="mt-0.5"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {load.load_number}
          </span>
          <span className="text-xs text-muted-foreground">
            {load.customer_name}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {load.stop_count} stops
          </span>
          <span className="text-xs text-muted-foreground">
            {load.weight_lbs?.toLocaleString()} lbs
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {load.commodity_type}
          </Badge>
        </div>
      </div>
    </button>
  );
}
