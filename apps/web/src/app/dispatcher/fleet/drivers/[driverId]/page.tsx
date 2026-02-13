'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useDriverById,
  useDriverHOS,
  InviteDriverDialog,
  EditDriverDialog,
  type Driver,
} from '@/features/fleet/drivers';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { Separator } from '@/shared/components/ui/separator';
import { useReferenceData } from '@/features/platform/reference-data';
import {
  ArrowLeft,
  Pencil,
  Phone,
  Mail,
  Shield,
  Truck,
  Package,
  Clock,
  MapPin,
  AlertTriangle,
  User,
  FileText,
  ExternalLink,
} from 'lucide-react';

export default function DriverProfilePage({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = use(params);
  const { data: driver, isLoading, error } = useDriverById(driverId);
  const { data: hos } = useDriverHOS(driverId);
  const { data: refData } = useReferenceData(['cdl_class', 'endorsement']);
  const cdlClasses = refData?.cdl_class ?? [];
  const endorsementOptions = refData?.endorsement ?? [];
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="space-y-6">
        <Link
          href="/dispatcher/fleet"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Fleet
        </Link>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">
              {error instanceof Error ? error.message : 'Driver not found'}
            </p>
            <Button onClick={() => router.push('/dispatcher/fleet')}>Return to Fleet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // HOS calculations
  const driveRemaining = driver.current_hos?.drive_remaining ?? (11 - (driver.current_hours_driven ?? 0));
  const shiftRemaining = driver.current_hos?.shift_remaining ?? (14 - (driver.current_on_duty_time ?? 0));
  const cycleRemaining = driver.current_hos?.cycle_remaining ?? (70 - (driver.cycle_hours_used ?? 0));
  const breakRequired = driver.current_hos?.break_required ?? ((driver.current_hours_since_break ?? 0) >= 8);

  const drivePercent = Math.max(0, Math.min(100, (driveRemaining / 11) * 100));
  const shiftPercent = Math.max(0, Math.min(100, (shiftRemaining / 14) * 100));
  const cyclePercent = Math.max(0, Math.min(100, (cycleRemaining / 70) * 100));

  // Medical card expiry calculation
  const medicalDaysRemaining = driver.medical_card_expiry
    ? Math.ceil((new Date(driver.medical_card_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const cdlLabel = cdlClasses.find((c) => c.code === driver.cdl_class);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href="/dispatcher/fleet"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Fleet
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{driver.name}</h1>
            <Badge variant={driver.status === 'ACTIVE' ? 'default' : driver.status === 'INACTIVE' ? 'muted' : 'outline'}>
              {driver.status || 'Unknown'}
            </Badge>
          </div>
        </div>
        <Button onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" /> Edit
        </Button>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" /> Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="text-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {driver.phone || '\u2014'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {driver.email || '\u2014'}
                </p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Emergency Contact</p>
                <p className="text-foreground">{driver.emergency_contact_name || '\u2014'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Emergency Phone</p>
                <p className="text-foreground">{driver.emergency_contact_phone || '\u2014'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HOS Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" /> HOS Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Drive</span>
                  <span className="text-foreground">{driveRemaining.toFixed(1)}h / 11h</span>
                </div>
                <Progress value={drivePercent} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Shift</span>
                  <span className="text-foreground">{shiftRemaining.toFixed(1)}h / 14h</span>
                </div>
                <Progress value={shiftPercent} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Cycle</span>
                  <span className="text-foreground">{cycleRemaining.toFixed(1)}h / 70h</span>
                </div>
                <Progress value={cyclePercent} className="h-2" />
              </div>
            </div>
            {breakRequired && (
              <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                Break required
              </div>
            )}
            {hos && (
              <p className="text-xs text-muted-foreground">
                Source: {hos.data_source} &middot; Updated: {new Date(hos.last_updated).toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Compliance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" /> Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">CDL Class</p>
                <div className="flex items-center gap-2">
                  {driver.cdl_class ? (
                    <Badge variant="outline">Class {driver.cdl_class}</Badge>
                  ) : (
                    <span className="text-muted-foreground">&mdash;</span>
                  )}
                  {cdlLabel && (
                    <span className="text-xs text-muted-foreground">{cdlLabel.metadata?.description}</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">License</p>
                <p className="text-foreground">
                  {driver.license_number || '\u2014'}
                  {driver.license_state && (
                    <span className="text-muted-foreground ml-1">({driver.license_state})</span>
                  )}
                </p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Endorsements</p>
              <div className="flex flex-wrap gap-1">
                {driver.endorsements && driver.endorsements.length > 0 ? (
                  driver.endorsements.map((e) => {
                    const opt = endorsementOptions.find((o) => o.code === e);
                    return (
                      <Badge key={e} variant="muted">
                        {opt?.label || e}
                      </Badge>
                    );
                  })
                ) : (
                  <span className="text-muted-foreground text-sm">None</span>
                )}
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Medical Card Expiry</p>
                {driver.medical_card_expiry ? (
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">
                      {new Date(driver.medical_card_expiry).toLocaleDateString()}
                    </span>
                    {medicalDaysRemaining !== null && medicalDaysRemaining <= 0 && (
                      <Badge variant="destructive">EXPIRED</Badge>
                    )}
                    {medicalDaysRemaining !== null && medicalDaysRemaining > 0 && medicalDaysRemaining <= 30 && (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">
                        {medicalDaysRemaining}d left
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">&mdash;</span>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hire Date</p>
                <p className="text-foreground">
                  {driver.hire_date ? new Date(driver.hire_date).toLocaleDateString() : '\u2014'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operations Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" /> Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Home Terminal</p>
                <p className="text-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {driver.home_terminal_city && driver.home_terminal_state
                    ? `${driver.home_terminal_city}, ${driver.home_terminal_state}`
                    : '\u2014'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Timezone</p>
                <p className="text-foreground">{driver.home_terminal_timezone || '\u2014'}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Assigned Vehicle</p>
                <p className="text-muted-foreground">Unassigned</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Load</p>
                {driver.current_load ? (
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3" />
                    <span className="text-foreground">{driver.current_load.reference_number}</span>
                    <Badge variant="outline">{driver.current_load.status}</Badge>
                  </div>
                ) : (
                  <p className="text-muted-foreground">&mdash;</p>
                )}
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">SALLY Access</p>
              <div className="flex items-center gap-2 mt-1">
                {driver.sally_access_status === 'ACTIVE' && <Badge variant="default">Active</Badge>}
                {driver.sally_access_status === 'INVITED' && <Badge variant="muted">Invited</Badge>}
                {driver.sally_access_status === 'DEACTIVATED' && <Badge variant="destructive">Deactivated</Badge>}
                {(!driver.sally_access_status || driver.sally_access_status === 'NO_ACCESS') && (
                  <>
                    <Badge variant="outline">No Access</Badge>
                    <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
                      Invite to SALLY
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes Card (full width) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground whitespace-pre-wrap">
            {driver.notes || <span className="text-muted-foreground">No notes</span>}
          </p>
        </CardContent>
      </Card>

      {/* Integration Card (conditional) */}
      {driver.external_source && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ExternalLink className="h-4 w-4" /> Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">External ID</p>
                <p className="text-foreground font-mono text-sm">{driver.external_driver_id || '\u2014'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="text-foreground">{driver.external_source}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sync Status</p>
                <Badge variant="outline">{driver.sync_status || '\u2014'}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Synced</p>
                <p className="text-foreground text-sm">
                  {driver.last_synced_at ? new Date(driver.last_synced_at).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Driver Dialog */}
      {driver && (
        <EditDriverDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          driver={driver}
        />
      )}

      {/* Invite Driver Dialog */}
      <InviteDriverDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        driver={driver}
      />
    </div>
  );
}
