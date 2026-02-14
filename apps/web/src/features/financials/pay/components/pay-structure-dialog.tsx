"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { usePayStructure, useUpsertPayStructure } from "../hooks/use-pay-structure";
import type { PayStructureType } from "../types";

interface PayStructureDialogProps {
  driverId: string;
  driverName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayStructureDialog({
  driverId,
  driverName,
  open,
  onOpenChange,
}: PayStructureDialogProps) {
  const { data: existing } = usePayStructure(driverId);
  const upsert = useUpsertPayStructure();

  const [type, setType] = useState<PayStructureType>("PER_MILE");
  const [ratePerMile, setRatePerMile] = useState("");
  const [percentage, setPercentage] = useState("");
  const [flatRate, setFlatRate] = useState("");
  const [hybridBase, setHybridBase] = useState("");
  const [hybridPercent, setHybridPercent] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existing) {
      setType(existing.type);
      if (existing.ratePerMileCents) setRatePerMile((existing.ratePerMileCents / 100).toString());
      if (existing.percentage) setPercentage(existing.percentage.toString());
      if (existing.flatRateCents) setFlatRate((existing.flatRateCents / 100).toString());
      if (existing.hybridBaseCents) setHybridBase((existing.hybridBaseCents / 100).toString());
      if (existing.hybridPercent) setHybridPercent(existing.hybridPercent.toString());
      setEffectiveDate(existing.effectiveDate.split("T")[0]);
      setNotes(existing.notes ?? "");
    }
  }, [existing, open]);

  const handleSave = () => {
    const data: { type: PayStructureType; effective_date: string; notes?: string; rate_per_mile_cents?: number; percentage?: number; flat_rate_cents?: number; hybrid_base_cents?: number; hybrid_percent?: number } = {
      type,
      effective_date: effectiveDate,
      notes: notes || undefined,
    };

    switch (type) {
      case "PER_MILE":
        data.rate_per_mile_cents = Math.round(parseFloat(ratePerMile) * 100);
        break;
      case "PERCENTAGE":
        data.percentage = parseFloat(percentage);
        break;
      case "FLAT_RATE":
        data.flat_rate_cents = Math.round(parseFloat(flatRate) * 100);
        break;
      case "HYBRID":
        data.hybrid_base_cents = Math.round(parseFloat(hybridBase) * 100);
        data.hybrid_percent = parseFloat(hybridPercent);
        break;
    }

    upsert.mutate(
      { driverId, data },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pay Structure - {driverName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Pay Type</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as PayStructureType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PER_MILE" id="per-mile" />
                <Label htmlFor="per-mile" className="text-foreground cursor-pointer">Per Mile</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PERCENTAGE" id="percentage" />
                <Label htmlFor="percentage" className="text-foreground cursor-pointer">Percentage of Load</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FLAT_RATE" id="flat-rate" />
                <Label htmlFor="flat-rate" className="text-foreground cursor-pointer">Flat Rate</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="HYBRID" id="hybrid" />
                <Label htmlFor="hybrid" className="text-foreground cursor-pointer">Hybrid (Base + %)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Conditional fields */}
          {type === "PER_MILE" && (
            <div className="space-y-2">
              <Label htmlFor="rate-per-mile">Rate per Mile ($)</Label>
              <Input
                id="rate-per-mile"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.55"
                value={ratePerMile}
                onChange={(e) => setRatePerMile(e.target.value)}
              />
            </div>
          )}

          {type === "PERCENTAGE" && (
            <div className="space-y-2">
              <Label htmlFor="pct">Percentage of Linehaul (%)</Label>
              <Input
                id="pct"
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                placeholder="27"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
              />
            </div>
          )}

          {type === "FLAT_RATE" && (
            <div className="space-y-2">
              <Label htmlFor="flat">Flat Rate per Load ($)</Label>
              <Input
                id="flat"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="800.00"
                value={flatRate}
                onChange={(e) => setFlatRate(e.target.value)}
              />
            </div>
          )}

          {type === "HYBRID" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="hybrid-base">Base Pay ($)</Label>
                <Input
                  id="hybrid-base"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="200.00"
                  value={hybridBase}
                  onChange={(e) => setHybridBase(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hybrid-pct">+ Percentage (%)</Label>
                <Input
                  id="hybrid-pct"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  placeholder="20"
                  value={hybridPercent}
                  onChange={(e) => setHybridPercent(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="eff-date">Effective Date</Label>
            <Input
              id="eff-date"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ps-notes">Notes</Label>
            <Textarea
              id="ps-notes"
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={upsert.isPending}
          >
            {upsert.isPending ? "Saving..." : "Save Pay Structure"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
