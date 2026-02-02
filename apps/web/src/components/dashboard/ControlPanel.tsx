'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ControlPanelProps {
  formData: any;
  setFormData: (data: any) => void;
  onRunEngine: () => void;
  isRunning: boolean;
}

export function ControlPanel({ formData, setFormData, onRunEngine, isRunning }: ControlPanelProps) {
  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>REST Optimizer Control Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="driver_id">Driver ID</Label>
          <Input
            id="driver_id"
            value={formData.driver_id}
            onChange={(e) => handleChange('driver_id', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="hours_driven">Hours Driven</Label>
          <Input
            id="hours_driven"
            type="number"
            step="0.1"
            value={formData.hours_driven}
            onChange={(e) => handleChange('hours_driven', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="on_duty_time">On-Duty Time</Label>
          <Input
            id="on_duty_time"
            type="number"
            step="0.1"
            value={formData.on_duty_time}
            onChange={(e) => handleChange('on_duty_time', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="hours_since_break">Hours Since Break</Label>
          <Input
            id="hours_since_break"
            type="number"
            step="0.1"
            value={formData.hours_since_break}
            onChange={(e) => handleChange('hours_since_break', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="dock_duration_hours">Dock Duration (hours)</Label>
          <Input
            id="dock_duration_hours"
            type="number"
            step="0.1"
            value={formData.dock_duration_hours}
            onChange={(e) => handleChange('dock_duration_hours', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="dock_location">Dock Location</Label>
          <Input
            id="dock_location"
            value={formData.dock_location}
            onChange={(e) => handleChange('dock_location', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="remaining_distance_miles">Remaining Distance (miles)</Label>
          <Input
            id="remaining_distance_miles"
            type="number"
            step="1"
            value={formData.remaining_distance_miles}
            onChange={(e) => handleChange('remaining_distance_miles', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="destination">Destination</Label>
          <Input
            id="destination"
            value={formData.destination}
            onChange={(e) => handleChange('destination', e.target.value)}
          />
        </div>
        <Button onClick={onRunEngine} disabled={isRunning} className="w-full">
          {isRunning ? 'Running...' : 'Run Optimizer'}
        </Button>
      </CardContent>
    </Card>
  );
}
