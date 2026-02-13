'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Separator } from '@/shared/components/ui/separator';
import { useUpdateDriver } from '../hooks/use-drivers';
import type { Driver, UpdateDriverRequest } from '../types';
import { useReferenceData } from '@/features/platform/reference-data';

interface EditDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver;
}

export default function EditDriverDialog({ open, onOpenChange, driver }: EditDriverDialogProps) {
  const updateDriver = useUpdateDriver();
  const { data: refData } = useReferenceData(['cdl_class', 'us_state', 'endorsement']);
  const cdlClasses = refData?.cdl_class ?? [];
  const usStates = refData?.us_state ?? [];
  const endorsementOptions = refData?.endorsement ?? [];

  const [formData, setFormData] = useState<UpdateDriverRequest>({
    name: driver.name || '',
    phone: driver.phone || '',
    email: driver.email || '',
    cdl_class: driver.cdl_class || '',
    license_number: driver.license_number || '',
    license_state: driver.license_state || '',
    endorsements: driver.endorsements || [],
    hire_date: driver.hire_date ? new Date(driver.hire_date).toISOString().split('T')[0] : '',
    medical_card_expiry: driver.medical_card_expiry ? new Date(driver.medical_card_expiry).toISOString().split('T')[0] : '',
    home_terminal_city: driver.home_terminal_city || '',
    home_terminal_state: driver.home_terminal_state || '',
    emergency_contact_name: driver.emergency_contact_name || '',
    emergency_contact_phone: driver.emergency_contact_phone || '',
    notes: driver.notes || '',
  });

  const [error, setError] = useState<string | null>(null);

  // Reset form when driver changes
  useEffect(() => {
    setFormData({
      name: driver.name || '',
      phone: driver.phone || '',
      email: driver.email || '',
      cdl_class: driver.cdl_class || '',
      license_number: driver.license_number || '',
      license_state: driver.license_state || '',
      endorsements: driver.endorsements || [],
      hire_date: driver.hire_date ? new Date(driver.hire_date).toISOString().split('T')[0] : '',
      medical_card_expiry: driver.medical_card_expiry ? new Date(driver.medical_card_expiry).toISOString().split('T')[0] : '',
      home_terminal_city: driver.home_terminal_city || '',
      home_terminal_state: driver.home_terminal_state || '',
      emergency_contact_name: driver.emergency_contact_name || '',
      emergency_contact_phone: driver.emergency_contact_phone || '',
      notes: driver.notes || '',
    });
    setError(null);
  }, [driver, open]);

  const handleEndorsementToggle = (value: string) => {
    const current = formData.endorsements || [];
    if (current.includes(value)) {
      setFormData({ ...formData, endorsements: current.filter((e) => e !== value) });
    } else {
      setFormData({ ...formData, endorsements: [...current, value] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await updateDriver.mutateAsync({
        driverId: driver.driver_id,
        data: formData,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update driver');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Driver</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name (full width) */}
          <div>
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Phone | Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {/* CDL Class | License # */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-cdl">CDL Class</Label>
              <Select
                value={formData.cdl_class || ''}
                onValueChange={(value) => setFormData({ ...formData, cdl_class: value })}
              >
                <SelectTrigger id="edit-cdl">
                  <SelectValue placeholder="Select CDL class" />
                </SelectTrigger>
                <SelectContent>
                  {cdlClasses.map((cdl) => (
                    <SelectItem key={cdl.code} value={cdl.code}>
                      {cdl.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-license">License Number</Label>
              <Input
                id="edit-license"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
              />
            </div>
          </div>

          {/* License State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-license-state">License State</Label>
              <Select
                value={formData.license_state || ''}
                onValueChange={(value) => setFormData({ ...formData, license_state: value })}
              >
                <SelectTrigger id="edit-license-state">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {usStates.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.label} ({state.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Endorsements */}
          <div>
            <Label>Endorsements</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              {endorsementOptions.map((opt) => (
                <div key={opt.code} className="flex items-center gap-2">
                  <Checkbox
                    id={`endorsement-${opt.code}`}
                    checked={(formData.endorsements || []).includes(opt.code)}
                    onCheckedChange={() => handleEndorsementToggle(opt.code)}
                  />
                  <Label htmlFor={`endorsement-${opt.code}`} className="text-sm font-normal cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Hire Date | Medical Card Expiry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-hire-date">Hire Date</Label>
              <Input
                id="edit-hire-date"
                type="date"
                value={formData.hire_date || ''}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-medical">Medical Card Expiry</Label>
              <Input
                id="edit-medical"
                type="date"
                value={formData.medical_card_expiry || ''}
                onChange={(e) => setFormData({ ...formData, medical_card_expiry: e.target.value })}
              />
            </div>
          </div>

          <Separator />

          {/* Home Terminal City | State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-city">Home Terminal City</Label>
              <Input
                id="edit-city"
                value={formData.home_terminal_city}
                onChange={(e) => setFormData({ ...formData, home_terminal_city: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-terminal-state">Home Terminal State</Label>
              <Select
                value={formData.home_terminal_state || ''}
                onValueChange={(value) => setFormData({ ...formData, home_terminal_state: value })}
              >
                <SelectTrigger id="edit-terminal-state">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {usStates.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.label} ({state.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Emergency Contact Name | Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-ec-name">Emergency Contact Name</Label>
              <Input
                id="edit-ec-name"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-ec-phone">Emergency Contact Phone</Label>
              <Input
                id="edit-ec-phone"
                type="tel"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
              />
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div>
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Add notes about this driver..."
            />
          </div>

          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateDriver.isPending}>
              {updateDriver.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
