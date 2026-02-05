'use client';

import { useEffect } from 'react';
import { Rocket, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Accordion } from '@/components/ui/accordion';
import { OnboardingItemCard } from '@/components/onboarding/OnboardingItemCard';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

export default function SetupHubPage() {
  const { user, isAuthenticated } = useAuth();
  const { status, loading, fetchStatus } = useOnboardingStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'OWNER' || user?.role === 'ADMIN')) {
      fetchStatus();
    }
  }, [isAuthenticated, user?.role, fetchStatus]);

  // Redirect if not OWNER or ADMIN
  if (isAuthenticated && user && user.role !== 'OWNER' && user.role !== 'ADMIN') {
    router.push('/');
    return null;
  }

  if (loading || !status) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground" />
      </div>
    );
  }

  const criticalCount = status.items.critical.filter((i) => i.complete).length;
  const recommendedCount = status.items.recommended.filter((i) => i.complete).length;
  const optionalCount = status.items.optional.filter((i) => i.complete).length;

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Setup Hub</CardTitle>
              <p className="text-sm text-muted-foreground">Get your SALLY platform fully operational</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall Progress</span>
              <span className="text-sm font-semibold">{status.overallProgress}% complete</span>
            </div>
            <Progress value={status.overallProgress} className="h-3" />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Critical:</span>
              <span className="font-medium">
                {criticalCount}/{status.items.critical.length}
              </span>
              {status.criticalComplete && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Recommended:</span>
              <span className="font-medium">
                {recommendedCount}/{status.items.recommended.length}
              </span>
              {status.recommendedComplete && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Optional:</span>
              <span className="font-medium">
                {optionalCount}/{status.items.optional.length}
              </span>
              {status.optionalComplete && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <CardTitle>Critical - Required for Route Planning</CardTitle>
            </div>
            <Badge variant={status.criticalComplete ? 'default' : 'destructive'}>
              {status.criticalComplete ? 'Complete' : `${status.items.critical.filter(i => !i.complete).length} remaining`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            <OnboardingItemCard
              item={status.items.critical[0]}
              priority="critical"
              description="Import loads from your TMS for route planning"
              whyMatters="Route planning needs load data (pickup/delivery locations, time windows). Without TMS, you have no loads to plan routes for."
              actionLink="/settings/integrations"
              actionLabel="Connect TMS"
              statusText={
                status.items.critical[0].metadata.connected
                  ? `Connected: ${status.items.critical[0].metadata.connectedSystem} (${new Date(status.items.critical[0].metadata.connectedAt).toLocaleDateString()})`
                  : 'Not connected'
              }
            />
            <OnboardingItemCard
              item={status.items.critical[1]}
              priority="critical"
              description="Routes must be assigned to active drivers"
              whyMatters="Routes must be assigned to drivers. HOS compliance calculations require driver data."
              actionLink="/drivers"
              actionLabel="Activate Drivers"
              statusText={`${status.items.critical[1].metadata.activeCount} active, ${status.items.critical[1].metadata.pendingCount} pending activation`}
            />
            <OnboardingItemCard
              item={status.items.critical[2]}
              priority="critical"
              description="Vehicle data needed for fuel and capacity planning"
              whyMatters="Route planning needs vehicle capacity and fuel data. Fuel stop insertion requires vehicle MPG and tank capacity."
              actionLink="/settings/fleet"
              actionLabel="Add Vehicle"
              statusText={`${status.items.critical[2].metadata.count} vehicles configured`}
            />
          </Accordion>
        </CardContent>
      </Card>

      {/* Recommended Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle>Recommended - Highly Recommended</CardTitle>
            </div>
            <Badge variant={status.recommendedComplete ? 'default' : 'muted'}>
              {status.recommendedComplete ? 'Complete' : `${status.items.recommended.filter(i => !i.complete).length} remaining`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            <OnboardingItemCard
              item={status.items.recommended[0]}
              priority="recommended"
              description="Invite dispatchers and drivers for collaboration"
              whyMatters="Most organizations need multiple dispatchers/drivers. Collaboration features work better with teams."
              actionLink="/users"
              actionLabel="Invite Team"
              statusText={`${status.items.recommended[0].metadata.count} ${status.items.recommended[0].metadata.count === 1 ? 'user' : 'users'} (${status.items.recommended[0].metadata.count === 1 ? 'just you' : 'team members'})`}
            />
            <OnboardingItemCard
              item={status.items.recommended[1]}
              priority="recommended"
              description="Connect ELD for real-time HOS tracking"
              whyMatters="Real-time HOS data improves accuracy, prevents manual entry errors, and provides live driver location updates."
              actionLink="/settings/integrations"
              actionLabel="Connect ELD"
              statusText={
                status.items.recommended[1].metadata.connected
                  ? `Connected: ${status.items.recommended[1].metadata.connectedSystem}`
                  : `Not connected (using default HOS values)`
              }
            />
            <OnboardingItemCard
              item={status.items.recommended[2]}
              priority="recommended"
              description="Import load data for realistic route planning"
              whyMatters="Route planning works best with realistic load volume. Better testing and validation with multiple loads."
              actionLink="/settings/fleet"
              actionLabel="View Loads"
              statusText={`${status.items.recommended[2].metadata.count} active loads`}
            />
          </Accordion>
        </CardContent>
      </Card>

      {/* Optional Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Optional - Nice to Have</CardTitle>
            </div>
            <Badge variant="outline">
              {status.optionalComplete ? 'Complete' : `${status.items.optional.filter(i => !i.complete).length} remaining`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            <OnboardingItemCard
              item={status.items.optional[0]}
              priority="optional"
              description="Connect fuel card integration for real-time pricing"
              whyMatters="System has fallback default fuel prices. Fuel optimization still works without integration."
              actionLink="/settings/integrations"
              actionLabel="Connect Fuel"
              statusText={
                status.items.optional[0].metadata.connected
                  ? `Connected: ${status.items.optional[0].metadata.connectedSystem}`
                  : 'Not connected (using default prices)'
              }
            />
            <OnboardingItemCard
              item={status.items.optional[1]}
              priority="optional"
              description="Customize route planning preferences"
              whyMatters="Default preferences work fine for most cases. Users can customize later as needed."
              actionLink="/settings/operations"
              actionLabel="Configure Preferences"
              statusText={
                status.items.optional[1].metadata.usingDefaults
                  ? 'Using defaults'
                  : 'Customized'
              }
            />
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
