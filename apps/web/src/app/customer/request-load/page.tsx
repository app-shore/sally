'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { customerApi } from '@/features/customer/api';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

export default function RequestLoadPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [pickupState, setPickupState] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryState, setDeliveryState] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [equipmentType, setEquipmentType] = useState('dry_van');
  const [commodityType, setCommodityType] = useState('general');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await customerApi.requestLoad({
        pickup_address: pickupAddress,
        pickup_city: pickupCity,
        pickup_state: pickupState,
        pickup_date: pickupDate || undefined,
        delivery_address: deliveryAddress,
        delivery_city: deliveryCity,
        delivery_state: deliveryState,
        delivery_date: deliveryDate || undefined,
        weight_lbs: parseFloat(weightLbs) || 0,
        equipment_type: equipmentType,
        commodity_type: commodityType,
        notes: notes || undefined,
      });
      router.push('/customer/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/customer/dashboard')}>
          &larr; Back
        </Button>
        <h1 className="text-lg md:text-xl font-semibold text-foreground">Request a Shipment</h1>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Pickup section */}
      <Card>
        <CardHeader><CardTitle className="text-base">Pickup</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Address</Label>
            <Input value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} placeholder="1234 Industrial Blvd" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>City</Label><Input value={pickupCity} onChange={e => setPickupCity(e.target.value)} placeholder="Dallas" /></div>
            <div><Label>State</Label><Input value={pickupState} onChange={e => setPickupState(e.target.value)} placeholder="TX" /></div>
          </div>
          <div><Label>Preferred Pickup Date</Label><Input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* Delivery section */}
      <Card>
        <CardHeader><CardTitle className="text-base">Delivery</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Address</Label>
            <Input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="5678 Warehouse Dr" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>City</Label><Input value={deliveryCity} onChange={e => setDeliveryCity(e.target.value)} placeholder="Atlanta" /></div>
            <div><Label>State</Label><Input value={deliveryState} onChange={e => setDeliveryState(e.target.value)} placeholder="GA" /></div>
          </div>
          <div><Label>Preferred Delivery Date</Label><Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* Details section */}
      <Card>
        <CardHeader><CardTitle className="text-base">Shipment Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Weight (lbs)</Label><Input type="number" value={weightLbs} onChange={e => setWeightLbs(e.target.value)} placeholder="20000" /></div>
            <div>
              <Label>Equipment</Label>
              <Select value={equipmentType} onValueChange={setEquipmentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dry_van">Dry Van</SelectItem>
                  <SelectItem value="reefer">Reefer</SelectItem>
                  <SelectItem value="flatbed">Flatbed</SelectItem>
                  <SelectItem value="step_deck">Step Deck</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Commodity</Label>
            <Select value={commodityType} onValueChange={setCommodityType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="hazmat">Hazmat</SelectItem>
                <SelectItem value="refrigerated">Refrigerated</SelectItem>
                <SelectItem value="fragile">Fragile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions..." /></div>
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Submitting...' : 'Submit Request'}
      </Button>
    </div>
  );
}
