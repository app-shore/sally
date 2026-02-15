'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/shared/components/ui/collapsible';
import { loadsApi } from '../api';
import { customersApi } from '@/features/fleet/customers/api';
import type { RateconData } from '../types/ratecon';
import type { LoadCreate, LoadStopCreate } from '../types';
import type { Customer } from '@/features/fleet/customers/types';

interface RateconReviewFormProps {
  data: RateconData;
  fileName: string;
  onSuccess: () => void;
  onCancel: () => void;
  onBack: () => void;
}

export function RateconReviewForm({ data, fileName, onSuccess, onCancel, onBack }: RateconReviewFormProps) {
  const [customerName, setCustomerName] = useState(data.broker_name);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [referenceNumber, setReferenceNumber] = useState(data.load_number || '');
  const [equipmentType, setEquipmentType] = useState(data.equipment_type || '');
  const [weightLbs, setWeightLbs] = useState(String(data.weight_lbs || ''));
  const [rateDollars, setRateDollars] = useState(String(data.rate_total_usd || ''));
  const [commodityType, setCommodityType] = useState(data.commodity || '');
  const [pieces, setPieces] = useState(String(data.pieces || ''));
  const [specialRequirements, setSpecialRequirements] = useState(data.special_instructions || '');

  const [stops, setStops] = useState<Array<{
    name: string;
    action_type: 'pickup' | 'delivery' | 'both';
    address: string;
    city: string;
    state: string;
    zip_code: string;
    earliest_arrival: string;
    estimated_dock_hours: number;
  }>>(
    data.stops.map((s) => ({
      name: s.facility_name,
      action_type: s.action_type,
      address: s.address,
      city: s.city,
      state: s.state,
      zip_code: s.zip_code,
      earliest_arrival: s.appointment_date && s.appointment_time
        ? `${s.appointment_date}T${s.appointment_time}`
        : s.appointment_date || '',
      estimated_dock_hours: 2,
    })),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load customers for matching
  useEffect(() => {
    customersApi.list().then(setCustomers).catch(() => {});
  }, []);

  // Try to auto-match customer by broker name
  useEffect(() => {
    if (customers.length > 0 && data.broker_name) {
      const match = customers.find(
        (c) => c.company_name.toLowerCase().includes(data.broker_name.toLowerCase())
          || data.broker_name.toLowerCase().includes(c.company_name.toLowerCase()),
      );
      if (match) {
        setSelectedCustomerId(String(match.id));
        setCustomerName(match.company_name);
      }
    }
  }, [customers, data.broker_name]);

  const handleCustomerChange = (value: string) => {
    setSelectedCustomerId(value);
    if (value && value !== 'new') {
      const customer = customers.find((c) => String(c.id) === value);
      if (customer) setCustomerName(customer.company_name);
    }
  };

  const updateStop = (index: number, field: string, value: string | number) => {
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const addStop = () => {
    setStops((prev) => [
      ...prev,
      { name: '', action_type: 'delivery' as const, address: '', city: '', state: '', zip_code: '', earliest_arrival: '', estimated_dock_hours: 2 },
    ]);
  };

  const removeStop = (index: number) => {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (!customerName.trim()) {
        setFormError('Customer name is required');
        setIsSubmitting(false);
        return;
      }
      if (!weightLbs || Number(weightLbs) <= 0) {
        setFormError('Weight is required');
        setIsSubmitting(false);
        return;
      }
      if (stops.length < 2) {
        setFormError('At least 2 stops are required');
        setIsSubmitting(false);
        return;
      }

      const loadStops: LoadStopCreate[] = stops.map((s, i) => ({
        stop_id: `STOP-IMPORT-${Date.now()}-${i}`,
        sequence_order: i + 1,
        action_type: s.action_type,
        earliest_arrival: s.earliest_arrival || undefined,
        estimated_dock_hours: s.estimated_dock_hours,
        name: s.name,
        address: s.address,
        city: s.city,
        state: s.state,
        zip_code: s.zip_code,
      }));

      const loadData: LoadCreate = {
        weight_lbs: Number(weightLbs),
        commodity_type: commodityType || 'General Freight',
        equipment_type: equipmentType || undefined,
        special_requirements: specialRequirements || undefined,
        customer_name: customerName,
        customer_id: selectedCustomerId ? Number(selectedCustomerId) : undefined,
        reference_number: referenceNumber || undefined,
        rate_cents: rateDollars ? Math.round(Number(rateDollars) * 100) : undefined,
        pieces: pieces ? Number(pieces) : undefined,
        intake_source: 'import',
        intake_metadata: {
          source_file: fileName,
          parsed_at: new Date().toISOString(),
          broker_name: data.broker_name,
          broker_mc: data.broker_mc,
          original_load_number: data.load_number,
        },
        stops: loadStops,
      };

      await loadsApi.create(loadData);
      onSuccess();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create load');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* AI badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          <Sparkles className="h-3 w-3 mr-1" />
          Extracted from rate con
        </Badge>
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{fileName}</span>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* Core fields */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Customer */}
          <div>
            <Label className="text-xs text-muted-foreground">Customer *</Label>
            {customers.length > 0 ? (
              <Select value={selectedCustomerId} onValueChange={handleCustomerChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={customerName || 'Select customer...'} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">+ New Customer ({customerName})</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input className="h-9" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            )}
          </div>

          {/* Reference (broker load number) */}
          <div>
            <Label className="text-xs text-muted-foreground">Reference / PO #</Label>
            <Input className="h-9" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Equipment */}
          <div>
            <Label className="text-xs text-muted-foreground">Equipment</Label>
            <Input className="h-9" value={equipmentType} onChange={(e) => setEquipmentType(e.target.value)} placeholder="e.g., Dry Van" />
          </div>

          {/* Weight */}
          <div>
            <Label className="text-xs text-muted-foreground">Weight (lbs) *</Label>
            <Input className="h-9" type="number" value={weightLbs} onChange={(e) => setWeightLbs(e.target.value)} />
          </div>

          {/* Rate */}
          <div>
            <Label className="text-xs text-muted-foreground">Rate ($)</Label>
            <Input className="h-9" type="number" step="0.01" value={rateDollars} onChange={(e) => setRateDollars(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-border" />

      {/* Stops */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Route ({stops.length} stops)
          </h4>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addStop}>
            <Plus className="h-3 w-3 mr-1" />
            Add Stop
          </Button>
        </div>

        <div className="space-y-2">
          {stops.map((stop, index) => (
            <div key={index} className="border border-border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {index + 1}. {stop.action_type}
                  </Badge>
                  {stop.name && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{stop.name}</span>
                  )}
                </div>
                {stops.length > 2 && (
                  <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeStop(index)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Facility Name</Label>
                  <Input className="h-8 text-sm" value={stop.name} onChange={(e) => updateStop(index, 'name', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select value={stop.action_type} onValueChange={(v) => updateStop(index, 'action_type', v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Pickup</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Address</Label>
                <Input className="h-8 text-sm" value={stop.address} onChange={(e) => updateStop(index, 'address', e.target.value)} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">City</Label>
                  <Input className="h-8 text-sm" value={stop.city} onChange={(e) => updateStop(index, 'city', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">State</Label>
                  <Input className="h-8 text-sm" value={stop.state} onChange={(e) => updateStop(index, 'state', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">ZIP</Label>
                  <Input className="h-8 text-sm" value={stop.zip_code} onChange={(e) => updateStop(index, 'zip_code', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Appointment</Label>
                  <Input className="h-8 text-sm" type="datetime-local" value={stop.earliest_arrival} onChange={(e) => updateStop(index, 'earliest_arrival', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Est. Dock Hours</Label>
                  <Input className="h-8 text-sm" type="number" step="0.5" value={stop.estimated_dock_hours} onChange={(e) => updateStop(index, 'estimated_dock_hours', Number(e.target.value))} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* More details (collapsible) */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-3.5 w-3.5 transition-transform data-[state=open]:rotate-90" />
          More Details
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Commodity</Label>
              <Input className="h-9" value={commodityType} onChange={(e) => setCommodityType(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Pieces</Label>
              <Input className="h-9" type="number" value={pieces} onChange={(e) => setPieces(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Special Requirements</Label>
            <Textarea
              className="h-20 resize-none"
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Actions */}
      <div className="flex justify-between pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          Upload Different File
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Load'}
          </Button>
        </div>
      </div>
    </form>
  );
}
