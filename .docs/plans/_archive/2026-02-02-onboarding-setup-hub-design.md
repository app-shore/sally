# Setup Hub - Comprehensive Onboarding System Design

**Date:** February 2, 2026
**Status:** Design Approved
**Target:** SALLY v1.1 - Onboarding Enhancement

---

## Executive Summary

SALLY needs a comprehensive onboarding system that guides new tenants through critical setup steps before they can effectively use route planning. The current 2-step wizard is informational but doesn't track completion or verify that users have the minimum data (drivers, vehicles, loads) required for route planning.

**Solution:** "Setup Hub" - A priority-based onboarding checklist system with three-tier visibility (banner + dashboard widget + dedicated page) and contextual blocking that prevents frustration while maintaining flexibility.

**Key Design Decisions:**
- **Contextual blocking with soft warnings:** Critical items block route planning, recommended items show warnings, optional items are just tracked
- **Combination approach visibility:** Banner (dismissible) + Dashboard widget + Persistent "Setup Hub" page in navigation
- **Priority-based organization:** Critical (blocks features) / Recommended (warnings) / Optional (reference)
- **Always accessible:** Setup Hub never disappears from navigation, becomes reference guide after completion

---

## Problem Statement

### Current Issues

1. **No completion tracking:** Users can skip onboarding wizard, never knowing what setup is incomplete
2. **Dead-ends:** Users try to plan routes without drivers/vehicles/integrations → confusion and frustration
3. **No guidance:** After initial wizard, users don't know what steps remain or why they matter
4. **No prioritization:** All setup tasks seem equally important, users don't know what's blocking vs optional

### User Pain Points

- **New OWNER users:** "I registered but can't figure out why route planning doesn't work"
- **Admins joining later:** "Where do I see what setup is done vs needed?"
- **Support team:** "We spend time on calls explaining minimum setup requirements"

---

## Design Goals

1. **Prevent frustration:** Block features that require data, with clear explanation of what's missing
2. **Maintain flexibility:** Don't force linear progression, let users complete tasks in any order
3. **Always accessible:** Setup Hub visible to all OWNER/ADMIN users, becomes reference guide after completion
4. **Real-time feedback:** Progress updates immediately when users complete setup tasks
5. **Minimal friction:** Don't interrupt workflow with excessive modals/prompts

---

## System Architecture

### Components Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SALLY Application                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐      ┌─────────────────────┐         │
│  │ OnboardingBanner │      │ OnboardingWidget    │         │
│  │ (Top of pages)   │      │ (Admin Dashboard)   │         │
│  └────────┬─────────┘      └──────────┬──────────┘         │
│           │                           │                     │
│           └───────────┬───────────────┘                     │
│                       │                                     │
│              ┌────────▼─────────┐                           │
│              │ OnboardingStore  │◄─────────┐               │
│              │    (Zustand)     │          │               │
│              └────────┬─────────┘          │               │
│                       │                    │               │
│              ┌────────▼─────────┐    ┌─────┴──────┐        │
│              │  Setup Hub Page  │    │ API Client │        │
│              │  (/setup-hub)    │    └─────┬──────┘        │
│              └──────────────────┘          │               │
│                                            │               │
└────────────────────────────────────────────┼───────────────┘
                                             │
                                    ┌────────▼──────────┐
                                    │ Backend API       │
                                    │ /onboarding/status│
                                    │ (with Redis cache)│
                                    └───────────────────┘
```

### State Management

**Zustand Store (`onboardingStore.ts`):**
- Fetches onboarding status from backend on app load (OWNER/ADMIN only)
- Caches status in memory
- Provides computed properties: `criticalItemsComplete`, `recommendedItemsComplete`, etc.
- Exposes `refetchStatus()` for real-time updates after mutations
- Handles banner/widget dismissal state (sessionStorage/localStorage)

**Data Flow:**
1. User logs in → `layout-client.tsx` initializes store
2. Store fetches `/api/v1/onboarding/status`
3. Components subscribe to store for reactive updates
4. User completes task (e.g., activates driver) → mutation `onSuccess` calls `refetchStatus()`
5. Store fetches latest status → all components update automatically

---

## Checklist Items

### Critical Items (Block Route Planning)

These items are **required** before users can create routes. Missing any critical item shows a blocking screen on route planning pages.

#### 1. Connect TMS Integration ⚠️

**What it checks:**
- Any TMS integration connection active (Truckbase, McLeod, etc.)
- Query: `SELECT COUNT(*) FROM integrations WHERE type='TMS' AND status='connected'`

**Why critical:**
- Route planning needs load data (pickup/delivery locations, time windows)
- Without TMS, users have no loads to plan routes for

**Action:**
- Link: `/settings/integrations`
- CTA: "Connect TMS"

**Blocking message:**
> "Connect your TMS to import loads and start planning routes"

---

#### 2. Minimum 1 Active Driver ⚠️

**What it checks:**
- At least 1 driver with `isActive=true` AND `status='ACTIVE'`
- Query: `SELECT COUNT(*) FROM drivers WHERE isActive=true AND status='ACTIVE'`

**Why critical:**
- Routes must be assigned to drivers
- HOS compliance calculations require driver data

**Action:**
- Link: `/drivers`
- CTA: "Activate Drivers"

**Current status display:**
- "0 drivers active, 5 pending activation"

**Blocking message:**
> "Activate at least one driver to start route planning"

---

#### 3. Minimum 1 Vehicle ⚠️

**What it checks:**
- At least 1 vehicle record exists
- Query: `SELECT COUNT(*) FROM vehicles`

**Why critical:**
- Route planning needs vehicle capacity and fuel data
- Fuel stop insertion requires vehicle MPG and tank capacity

**Action:**
- Link: `/settings/fleet` (Vehicles tab)
- CTA: "Add Vehicle"

**Current status display:**
- "3 vehicles configured"

**Blocking message:**
> "Add at least one vehicle to enable route planning"

---

### Recommended Items (Soft Warning)

These items are **highly recommended** but don't block features. Show warning banner on non-Setup-Hub pages when incomplete.

#### 4. Invite Team Members ⚡

**What it checks:**
- More than 1 user in tenant (more than just the OWNER)
- Query: `SELECT COUNT(*) FROM users WHERE tenantId=X`

**Why recommended:**
- Most organizations need multiple dispatchers/drivers
- Collaboration features work better with teams

**Action:**
- Link: `/users` (opens Invite dialog)
- CTA: "Invite Team"

**Current status display:**
- "1 user (just you) - invite dispatchers and drivers"

**Warning message:**
> "Your team is small - invite dispatchers and drivers for collaboration"

---

#### 5. Connect ELD Integration ⚡

**What it checks:**
- ELD integration connected (Samsara, KeepTruckin, Motive)
- Query: `SELECT COUNT(*) FROM integrations WHERE type='ELD' AND status='connected'`

**Why recommended:**
- Real-time HOS data improves accuracy
- Prevents manual HOS entry errors
- Live driver location updates

**Action:**
- Link: `/settings/integrations`
- CTA: "Connect ELD"

**Fallback behavior:**
- System uses default HOS values (11 drive, 14 duty, 0 hours used)

**Warning message:**
> "Connect ELD for real-time HOS tracking (using default values for now)"

---

#### 6. Minimum 3 Active Loads ⚡

**What it checks:**
- At least 3 loads in active statuses
- Query: `SELECT COUNT(*) FROM loads WHERE status IN ('pending','planned','active')`

**Why recommended:**
- Route planning works best with realistic load volume
- Better testing and validation with multiple loads

**Action:**
- Link: `/settings/fleet` (Loads tab)
- CTA: "View Loads"

**Note:** This is auto-populated from TMS integration, not manually added

**Current status display:**
- "12 active loads"

**Warning message:**
> "Limited load data - route planning works best with your full load schedule"

---

### Optional Items (No Warning)

These items are **nice-to-have** but completely optional. Tracked in Setup Hub for completeness.

#### 7. Connect Fuel Integration ✓

**What it checks:**
- Fuel card integration connected
- Query: `SELECT COUNT(*) FROM integrations WHERE type='FUEL' AND status='connected'`

**Why optional:**
- System has fallback default fuel prices
- Fuel optimization still works without integration

**Action:**
- Link: `/settings/integrations`
- CTA: "Connect Fuel"

---

#### 8. Configure Preferences ✓

**What it checks:**
- Dispatcher preferences modified from defaults
- Query: `SELECT updated_at != created_at FROM dispatcher_preferences WHERE tenantId=X`

**Why optional:**
- Default preferences work fine for most cases
- Users can customize later as needed

**Action:**
- Link: `/settings/route-planning`
- CTA: "Configure Preferences"

---

## UI Components

### 1. OnboardingBanner Component

**Location:** Top of all authenticated pages (below header, above content)

**Visibility Rules:**
- Shows when: `criticalItemsComplete === false`
- Hides when: Critical items complete OR user dismisses (per session)
- Never shows on: `/setup-hub` page itself

**Appearance:**
```
┌──────────────────────────────────────────────────────────────┐
│ ⚠️ Setup incomplete: 2 of 3 critical steps remaining          │
│                                      [Complete Setup]  [×]    │
└──────────────────────────────────────────────────────────────┘
```

**Styling:**
- Background: `bg-amber-50 dark:bg-amber-950`
- Border: `border-b border-amber-200 dark:border-amber-800`
- Text: `text-amber-900 dark:text-amber-100`
- Sticky position at top

**Behavior:**
- Click "Complete Setup" → Navigate to `/setup-hub`
- Click X → Dismiss (store in `sessionStorage`)
- Dismissal resets on new browser session

**Component Props:**
```typescript
interface OnboardingBannerProps {
  incompleteCount: number;
  onDismiss: () => void;
}
```

---

### 2. OnboardingWidget Component

**Location:** Admin dashboard (`/admin/dashboard`)

**Visibility Rules:**
- Always visible on admin dashboard
- Becomes collapsible after critical items complete
- Shows expanded by default when critical incomplete

**Appearance:**
```
┌───────────────────────────────────────────────────┐
│ Setup Hub - Get SALLY Running                     │
├───────────────────────────────────────────────────┤
│                                                    │
│  Progress: 4/8 items complete (50%)               │
│  ████████░░░░░░░░                                 │
│                                                    │
│  Critical (1 remaining)                           │
│  ☑ Connect TMS Integration                        │
│  ☐ Activate at least 1 driver                     │
│  ☑ Add at least 1 vehicle                         │
│                                                    │
│  Recommended (2 remaining)                        │
│  ☑ Invite team members                            │
│  ☐ Connect ELD integration                        │
│  ☐ Add load data (1/3)                            │
│                                                    │
│  [Continue Setup →]                               │
└───────────────────────────────────────────────────┘
```

**Styling:**
- Standard Card component with header
- Progress bar: `bg-primary` fill, `bg-muted` background
- Checkboxes: Green (complete) / Amber (incomplete)
- Compact, scannable layout

**Behavior:**
- Click any item → Navigate to relevant page
- Click "Continue Setup" → Navigate to `/setup-hub`
- Shows real-time updates as items complete

**Component Props:**
```typescript
interface OnboardingWidgetProps {
  status: OnboardingStatus;
  onItemClick: (itemId: string) => void;
}
```

---

### 3. OnboardingBlocker Component

**Location:** Route planning pages when critical items incomplete

**Visibility Rules:**
- Shows when: `criticalItemsComplete === false` AND user on route planning page
- Replaces entire page content (not a modal overlay)

**Appearance:**
```
┌─────────────────────────────────────────────────────┐
│                                                      │
│                   🚀 Setup Required                  │
│                                                      │
│     Complete these steps to start planning routes   │
│                                                      │
│     ⚠️ Activate at least 1 driver                   │
│     ⚠️ Add at least 1 vehicle                       │
│                                                      │
│            [Go to Setup Hub]                        │
│                                                      │
│     Once complete, you'll be able to:               │
│     • Plan optimized routes                         │
│     • Assign drivers to loads                       │
│     • Monitor HOS compliance                        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Styling:**
- Centered vertically and horizontally
- Card with padding, subtle shadow
- Friendly, helpful tone (not punishing)
- Clear visual hierarchy

**Behavior:**
- Single clear CTA: "Go to Setup Hub"
- Shows specific missing items (not all critical items, just incomplete ones)
- Explains benefits they'll unlock

**Component Props:**
```typescript
interface OnboardingBlockerProps {
  incompleteCriticalItems: OnboardingItem[];
}
```

---

### 4. Setup Hub Page

**Location:** `/setup-hub` (accessible from navigation)

**Layout Structure:**
```
┌────────────────────────────────────────────────────────────┐
│  🚀 Setup Hub                                               │
│  Get your SALLY platform fully operational                 │
│                                                             │
│  [Progress Bar: 50% complete]                              │
│  Critical: 2/3 ✓ | Recommended: 2/3 | Optional: 0/2        │
└────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Critical - Required for Route Planning                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ▼ Connect TMS Integration                             ✓     │
│   Import loads from your TMS for route planning             │
│   Connected: Truckbase TMS (Feb 2, 2026)                    │
│                                                              │
│ ▼ Activate at least 1 driver                          ⚠️    │
│   Routes must be assigned to active drivers                 │
│   Status: 0 active, 5 pending activation                    │
│   [Activate Drivers →]                                      │
│                                                              │
│ ▼ Add at least 1 vehicle                              ✓     │
│   Vehicle data needed for fuel and capacity planning        │
│   Status: 3 vehicles configured                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ⚡ Recommended - Highly Recommended                          │
├─────────────────────────────────────────────────────────────┤
│ (Similar accordion items...)                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ✓ Optional - Nice to Have                                   │
├─────────────────────────────────────────────────────────────┤
│ (Similar accordion items...)                                │
└─────────────────────────────────────────────────────────────┘
```

**Item Card Structure:**
Each item is an accordion (`@/components/ui/accordion`) with:
- **Header:** Title + Status icon (✓ complete / ⚠️ incomplete / ⚡ optional)
- **Collapsed state:** Shows only title and status
- **Expanded state:** Shows:
  - Description (what this is)
  - "Why this matters" explanation
  - Current status (e.g., "2 drivers active, 5 pending")
  - Action button (links to relevant page)

**Behavior:**
- Items expand on click
- Can expand multiple at once (not exclusive)
- Real-time updates (progress bar and item statuses)
- Always accessible (never hidden from nav)

---

### 5. Navigation Integration

**Location:** Main sidebar navigation (OWNER/ADMIN only)

**Placement:**
```
📊 Dashboard
👥 Team
🚛 Drivers
🚀 Setup Hub  ← NEW (shows badge)
--- Operations ---
📍 Command Center
...
```

**Badge Logic:**
- Critical incomplete: Red badge with count "2"
- Only recommended incomplete: Amber badge with count "3"
- All critical complete: Green checkmark "✓"
- 100% complete: Green checkmark (remains visible)

**Role-based visibility:**
- OWNER: Always visible
- ADMIN: Always visible
- DISPATCHER: Hidden
- DRIVER: Hidden
- SUPER_ADMIN: Hidden (they manage tenants, not individual tenant setup)

---

## Contextual Blocking Logic

### Route Planning Pages - Hard Block

**Affected Routes:**
- `/dispatcher/create-plan` (Plan Route)
- `/dispatcher/overview` (Command Center - only blocks route creation actions)

**Implementation:**
```typescript
// In page component
export default function CreatePlanPage() {
  const { criticalItemsComplete, incompleteCriticalItems } = useOnboardingStore();

  if (!criticalItemsComplete) {
    return <OnboardingBlocker items={incompleteCriticalItems} />;
  }

  return (
    // Normal route planning UI
  );
}
```

**User Experience:**
1. User navigates to route planning
2. Page checks critical items complete
3. If incomplete: Shows full-page blocker with clear explanation
4. User clicks "Go to Setup Hub"
5. Completes missing items
6. Returns to route planning → now works

---

### All Other Pages - Soft Warning

**Affected Routes:**
- Dashboard, Team, Drivers, Fleet, Integrations, Settings, Preferences

**Implementation:**
```typescript
// In layout or page wrapper
export default function AppLayout({ children }) {
  const { criticalItemsComplete, recommendedItemsComplete, recommendedIncompleteCount } = useOnboardingStore();
  const showWarning = criticalItemsComplete && !recommendedItemsComplete;

  return (
    <>
      {showWarning && (
        <SoftWarningBanner count={recommendedIncompleteCount} />
      )}
      {children}
    </>
  );
}
```

**Soft Warning Banner UI:**
```
┌──────────────────────────────────────────────────────────┐
│ ℹ️ Your setup is incomplete - 2 recommended items        │
│    remaining. Complete these to get the most from SALLY  │
│                               [View Setup Hub]  [×]      │
└──────────────────────────────────────────────────────────┘
```

**Styling:**
- Background: `bg-blue-50 dark:bg-blue-950`
- Less prominent than critical banner
- Dismissible per session

---

## Backend Implementation

### New API Endpoint

**GET `/api/v1/onboarding/status`**

**Authentication:** Requires JWT, tenant context

**Authorization:** OWNER and ADMIN roles only

**Response Schema:**
```typescript
interface OnboardingStatusResponse {
  overallProgress: number;        // 0-100 percentage
  criticalComplete: boolean;
  recommendedComplete: boolean;
  optionalComplete: boolean;
  items: {
    critical: OnboardingItem[];
    recommended: OnboardingItem[];
    optional: OnboardingItem[];
  };
}

interface OnboardingItem {
  id: string;                    // e.g., "tms_integration"
  title: string;                 // e.g., "Connect TMS Integration"
  complete: boolean;
  metadata: Record<string, any>; // Context-specific data
}
```

**Example Response:**
```json
{
  "overallProgress": 62,
  "criticalComplete": false,
  "recommendedComplete": false,
  "optionalComplete": false,
  "items": {
    "critical": [
      {
        "id": "tms_integration",
        "title": "Connect TMS Integration",
        "complete": true,
        "metadata": {
          "connectedSystem": "truckbase_tms",
          "connectedAt": "2026-02-02T10:30:00Z"
        }
      },
      {
        "id": "min_drivers",
        "title": "Activate at least 1 driver",
        "complete": false,
        "metadata": {
          "activeCount": 0,
          "pendingCount": 5,
          "target": 1
        }
      },
      {
        "id": "min_vehicles",
        "title": "Add at least 1 vehicle",
        "complete": true,
        "metadata": {
          "vehicleCount": 3
        }
      }
    ],
    "recommended": [
      {
        "id": "team_invites",
        "title": "Invite team members",
        "complete": true,
        "metadata": {
          "userCount": 4,
          "roles": {
            "OWNER": 1,
            "ADMIN": 0,
            "DISPATCHER": 2,
            "DRIVER": 1
          }
        }
      },
      {
        "id": "eld_integration",
        "title": "Connect ELD integration",
        "complete": false,
        "metadata": {
          "availableProviders": ["samsara", "keeptruckin", "motive"]
        }
      },
      {
        "id": "min_loads",
        "title": "Minimum 3 active loads",
        "complete": false,
        "metadata": {
          "activeLoadCount": 1,
          "target": 3,
          "statuses": {
            "pending": 1,
            "planned": 0,
            "active": 0
          }
        }
      }
    ],
    "optional": [
      {
        "id": "fuel_integration",
        "title": "Connect fuel integration",
        "complete": false,
        "metadata": {
          "availableProviders": ["wex", "comdata"]
        }
      },
      {
        "id": "preferences_configured",
        "title": "Configure route planning preferences",
        "complete": false,
        "metadata": {
          "usingDefaults": true
        }
      }
    ]
  }
}
```

---

### Backend Service Logic

**File:** `apps/backend/src/api/onboarding/onboarding.service.ts`

**Check Methods:**

```typescript
@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async getOnboardingStatus(tenantId: number): Promise<OnboardingStatusResponse> {
    const [
      tmsIntegration,
      activeDriverCount,
      vehicleCount,
      userCount,
      activeLoadCount,
      eldIntegration,
      fuelIntegration,
      preferencesModified
    ] = await Promise.all([
      this.checkTmsIntegration(tenantId),
      this.checkActiveDrivers(tenantId),
      this.checkVehicles(tenantId),
      this.checkUsers(tenantId),
      this.checkActiveLoads(tenantId),
      this.checkEldIntegration(tenantId),
      this.checkFuelIntegration(tenantId),
      this.checkPreferences(tenantId),
    ]);

    // Build response with all items
    const critical = [
      {
        id: 'tms_integration',
        title: 'Connect TMS Integration',
        complete: tmsIntegration.connected,
        metadata: tmsIntegration,
      },
      {
        id: 'min_drivers',
        title: 'Activate at least 1 driver',
        complete: activeDriverCount.count >= 1,
        metadata: activeDriverCount,
      },
      {
        id: 'min_vehicles',
        title: 'Add at least 1 vehicle',
        complete: vehicleCount.count >= 1,
        metadata: vehicleCount,
      },
    ];

    const recommended = [
      {
        id: 'team_invites',
        title: 'Invite team members',
        complete: userCount.count > 1,
        metadata: userCount,
      },
      {
        id: 'eld_integration',
        title: 'Connect ELD integration',
        complete: eldIntegration.connected,
        metadata: eldIntegration,
      },
      {
        id: 'min_loads',
        title: 'Minimum 3 active loads',
        complete: activeLoadCount.count >= 3,
        metadata: activeLoadCount,
      },
    ];

    const optional = [
      {
        id: 'fuel_integration',
        title: 'Connect fuel integration',
        complete: fuelIntegration.connected,
        metadata: fuelIntegration,
      },
      {
        id: 'preferences_configured',
        title: 'Configure route planning preferences',
        complete: preferencesModified.modified,
        metadata: preferencesModified,
      },
    ];

    const criticalComplete = critical.every(item => item.complete);
    const recommendedComplete = recommended.every(item => item.complete);
    const optionalComplete = optional.every(item => item.complete);

    const totalItems = critical.length + recommended.length + optional.length;
    const completedItems =
      critical.filter(i => i.complete).length +
      recommended.filter(i => i.complete).length +
      optional.filter(i => i.complete).length;
    const overallProgress = Math.round((completedItems / totalItems) * 100);

    return {
      overallProgress,
      criticalComplete,
      recommendedComplete,
      optionalComplete,
      items: {
        critical,
        recommended,
        optional,
      },
    };
  }

  private async checkTmsIntegration(tenantId: number) {
    const integration = await this.prisma.integration.findFirst({
      where: {
        tenantId,
        type: 'TMS',
        status: 'connected',
      },
    });

    return {
      connected: !!integration,
      connectedSystem: integration?.provider || null,
      connectedAt: integration?.connectedAt?.toISOString() || null,
    };
  }

  private async checkActiveDrivers(tenantId: number) {
    const count = await this.prisma.driver.count({
      where: {
        tenantId,
        isActive: true,
        status: 'ACTIVE',
      },
    });

    const pendingCount = await this.prisma.driver.count({
      where: {
        tenantId,
        status: 'PENDING_ACTIVATION',
      },
    });

    return {
      count,
      pendingCount,
      target: 1,
    };
  }

  private async checkVehicles(tenantId: number) {
    const count = await this.prisma.vehicle.count({
      where: { tenantId },
    });

    return {
      count,
      target: 1,
    };
  }

  private async checkUsers(tenantId: number) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: { role: true },
    });

    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      count: users.length,
      roles: roleCounts,
    };
  }

  private async checkActiveLoads(tenantId: number) {
    const statuses = ['pending', 'planned', 'active'];
    const count = await this.prisma.load.count({
      where: {
        tenantId,
        status: { in: statuses },
      },
    });

    const statusCounts = await this.prisma.load.groupBy({
      by: ['status'],
      where: {
        tenantId,
        status: { in: statuses },
      },
      _count: true,
    });

    return {
      count,
      target: 3,
      statuses: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  private async checkEldIntegration(tenantId: number) {
    const integration = await this.prisma.integration.findFirst({
      where: {
        tenantId,
        type: 'ELD',
        status: 'connected',
      },
    });

    return {
      connected: !!integration,
      connectedSystem: integration?.provider || null,
      availableProviders: ['samsara', 'keeptruckin', 'motive'],
    };
  }

  private async checkFuelIntegration(tenantId: number) {
    const integration = await this.prisma.integration.findFirst({
      where: {
        tenantId,
        type: 'FUEL',
        status: 'connected',
      },
    });

    return {
      connected: !!integration,
      connectedSystem: integration?.provider || null,
      availableProviders: ['wex', 'comdata'],
    };
  }

  private async checkPreferences(tenantId: number) {
    const prefs = await this.prisma.dispatcherPreferences.findUnique({
      where: { tenantId },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      modified: prefs ? prefs.updatedAt.getTime() !== prefs.createdAt.getTime() : false,
      usingDefaults: !prefs || prefs.updatedAt.getTime() === prefs.createdAt.getTime(),
    };
  }
}
```

---

### Caching Strategy

**Cache Key:** `onboarding:status:tenant:${tenantId}`

**Cache Duration:** 30 seconds

**Invalidation Triggers:**
- Manual refetch from frontend (user completes task)
- Webhook from integration service (new integration connected)
- Database triggers on relevant tables (optional, Phase 2)

**Implementation:**
```typescript
async getOnboardingStatus(tenantId: number): Promise<OnboardingStatusResponse> {
  const cacheKey = `onboarding:status:tenant:${tenantId}`;

  // Check cache
  const cached = await this.redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Compute status
  const status = await this.computeOnboardingStatus(tenantId);

  // Cache for 30 seconds
  await this.redis.setex(cacheKey, 30, JSON.stringify(status));

  return status;
}
```

---

## Frontend Implementation

### Onboarding Store (Zustand)

**File:** `apps/web/src/lib/store/onboardingStore.ts`

```typescript
import { create } from 'zustand';
import { getOnboardingStatus } from '@/lib/api/onboarding';

interface OnboardingItem {
  id: string;
  title: string;
  complete: boolean;
  metadata: Record<string, any>;
}

interface OnboardingStatus {
  overallProgress: number;
  criticalComplete: boolean;
  recommendedComplete: boolean;
  optionalComplete: boolean;
  items: {
    critical: OnboardingItem[];
    recommended: OnboardingItem[];
    optional: OnboardingItem[];
  };
}

interface OnboardingStore {
  status: OnboardingStatus | null;
  loading: boolean;
  error: string | null;

  // Computed properties
  criticalItemsComplete: boolean;
  recommendedItemsComplete: boolean;
  optionalItemsComplete: boolean;
  incompleteCriticalItems: OnboardingItem[];
  incompleteRecommendedItems: OnboardingItem[];
  criticalIncompleteCount: number;
  recommendedIncompleteCount: number;

  // Actions
  fetchStatus: () => Promise<void>;
  refetchStatus: () => Promise<void>;
  dismissBanner: () => void;
  dismissSoftWarning: () => void;
  isBannerDismissed: () => boolean;
  isSoftWarningDismissed: () => boolean;
}

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  status: null,
  loading: false,
  error: null,

  // Computed properties
  get criticalItemsComplete() {
    return get().status?.criticalComplete ?? true;
  },

  get recommendedItemsComplete() {
    return get().status?.recommendedComplete ?? true;
  },

  get optionalItemsComplete() {
    return get().status?.optionalComplete ?? true;
  },

  get incompleteCriticalItems() {
    return get().status?.items.critical.filter(item => !item.complete) ?? [];
  },

  get incompleteRecommendedItems() {
    return get().status?.items.recommended.filter(item => !item.complete) ?? [];
  },

  get criticalIncompleteCount() {
    return get().incompleteCriticalItems.length;
  },

  get recommendedIncompleteCount() {
    return get().incompleteRecommendedItems.length;
  },

  // Actions
  fetchStatus: async () => {
    set({ loading: true, error: null });
    try {
      const status = await getOnboardingStatus();
      set({ status, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  refetchStatus: async () => {
    // Silent refetch (no loading state)
    try {
      const status = await getOnboardingStatus();
      set({ status });
    } catch (error: any) {
      console.error('Failed to refetch onboarding status:', error);
    }
  },

  dismissBanner: () => {
    sessionStorage.setItem('onboarding-banner-dismissed', 'true');
  },

  dismissSoftWarning: () => {
    sessionStorage.setItem('onboarding-soft-warning-dismissed', 'true');
  },

  isBannerDismissed: () => {
    return sessionStorage.getItem('onboarding-banner-dismissed') === 'true';
  },

  isSoftWarningDismissed: () => {
    return sessionStorage.getItem('onboarding-soft-warning-dismissed') === 'true';
  },
}));
```

---

### API Client

**File:** `apps/web/src/lib/api/onboarding.ts`

```typescript
import { apiClient } from './client';

export interface OnboardingItem {
  id: string;
  title: string;
  complete: boolean;
  metadata: Record<string, any>;
}

export interface OnboardingStatusResponse {
  overallProgress: number;
  criticalComplete: boolean;
  recommendedComplete: boolean;
  optionalComplete: boolean;
  items: {
    critical: OnboardingItem[];
    recommended: OnboardingItem[];
    optional: OnboardingItem[];
  };
}

export async function getOnboardingStatus(): Promise<OnboardingStatusResponse> {
  return apiClient<OnboardingStatusResponse>('/onboarding/status');
}
```

---

### Integration with App Layout

**File:** `apps/web/src/app/layout-client.tsx`

```typescript
export function LayoutClient({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const { fetchStatus } = useOnboardingStore();

  useEffect(() => {
    // Only fetch onboarding status for OWNER/ADMIN
    if (isAuthenticated && (user?.role === 'OWNER' || user?.role === 'ADMIN')) {
      fetchStatus();
    }
  }, [isAuthenticated, user?.role, fetchStatus]);

  // ... rest of layout logic
}
```

---

### Mutation Integration

**Example:** After activating a driver

```typescript
const activateDriverMutation = useMutation({
  mutationFn: async (driverId: string) => {
    return apiClient(`/drivers/${driverId}/activate`, { method: 'POST' });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['drivers'] });

    // Refetch onboarding status
    onboardingStore.refetchStatus();
  },
});
```

**Apply same pattern to:**
- Driver activation/deactivation
- Vehicle creation
- Integration connection
- User invitation
- Load import

---

## Implementation Plan

### Phase 1: Backend Foundation (1-2 hours)

**Task 1.1:** Create onboarding module structure
```bash
apps/backend/src/api/onboarding/
├── onboarding.controller.ts
├── onboarding.service.ts
└── onboarding.module.ts
```

**Task 1.2:** Implement OnboardingService
- Write all check methods (TMS, drivers, vehicles, etc.)
- Implement status aggregation logic
- Add unit tests for each check method

**Task 1.3:** Create GET /onboarding/status endpoint
- Add controller with auth guards
- Add role check (OWNER/ADMIN only)
- Wire up to service

**Task 1.4:** Add Redis caching
- 30-second cache per tenant
- Cache key: `onboarding:status:tenant:${tenantId}`

**Verification:**
- `curl /api/v1/onboarding/status` returns correct structure
- All check methods return accurate counts
- Cache works (second request faster)

---

### Phase 2: State Management (30 min)

**Task 2.1:** Create onboardingStore.ts
- Zustand store with all properties
- Computed getters for convenience
- Fetch and refetch methods

**Task 2.2:** Create API client functions
- `getOnboardingStatus()` wrapper
- Type definitions

**Task 2.3:** Test store in isolation
- Fetch status
- Computed properties work
- Dismissal persistence works

**Verification:**
- Store fetches from backend successfully
- Computed properties calculate correctly
- Dismissal state persists in sessionStorage

---

### Phase 3: UI Components (2-3 hours)

**Task 3.1:** Build OnboardingBanner
- Sticky banner at top
- Dismissible with X button
- Links to Setup Hub
- Shows only when critical incomplete

**Task 3.2:** Build OnboardingWidget
- Dashboard card with progress
- List of incomplete items
- "Continue Setup" button
- Real-time updates

**Task 3.3:** Build OnboardingBlocker
- Full-page blocking screen
- Shows missing critical items
- "Go to Setup Hub" CTA
- Friendly, helpful messaging

**Task 3.4:** Build OnboardingItemCard
- Reusable accordion item
- Shows title, status, description
- "Why this matters" section
- Action button

**Task 3.5:** Build Setup Hub page
- Hero with progress
- Three sections (Critical/Recommended/Optional)
- Uses OnboardingItemCard components
- Real-time status updates

**Verification:**
- All components render correctly
- Dark mode works
- Responsive on mobile
- Real-time updates work

---

### Phase 4: Integration (1 hour)

**Task 4.1:** Add Setup Hub to navigation
- Add nav item for OWNER/ADMIN
- Add badge logic (red/amber/green)
- Icon: 🚀

**Task 4.2:** Add banner to layout
- Integrate OnboardingBanner in layout-client
- Conditional rendering logic
- Dismissal handling

**Task 4.3:** Add widget to admin dashboard
- Place prominently (top row or sidebar)
- Wire up to store
- Test real-time updates

**Task 4.4:** Add blocking to route planning
- Add check in create-plan page
- Add check in overview page (only for route creation)
- Show OnboardingBlocker when incomplete

**Task 4.5:** Add refetch triggers
- Driver mutations
- Vehicle mutations
- Integration mutations
- User invitation mutations

**Verification:**
- Navigation badge shows correct count
- Banner appears/dismisses correctly
- Widget updates in real-time
- Blocking prevents route planning
- Completing items updates all UI

---

### Phase 5: Testing & Polish (1 hour)

**Task 5.1:** Test all blocking scenarios
- Try to plan route with 0 drivers → blocked
- Activate driver → blocking clears
- Try to plan route with 0 vehicles → blocked
- Add vehicle → blocking clears

**Task 5.2:** Test progress updates
- Complete critical item → banner disappears
- Complete recommended item → soft warning appears
- Complete all items → widget collapses

**Task 5.3:** Test dismissal persistence
- Dismiss banner → stays dismissed in session
- Refresh page → banner reappears (new session)
- Dismiss soft warning → stays dismissed

**Task 5.4:** Visual polish
- Check responsive design (mobile, tablet, desktop)
- Verify dark mode compatibility
- Check all color contrasts (accessibility)
- Smooth animations/transitions

**Task 5.5:** Edge case testing
- Multi-user scenario (User A completes, User B logs in)
- Data regression (had 3 drivers, now 1)
- Integration disconnect
- Role-based visibility

**Verification:**
- All scenarios work as expected
- No console errors
- Responsive on all screen sizes
- Dark mode looks good
- Edge cases handled gracefully

---

### Total Estimated Time: 5-7 hours

**Breakdown:**
- Backend: 1.5-2 hours
- State: 0.5 hours
- UI: 2.5-3 hours
- Integration: 1 hour
- Testing: 1 hour

---

## Edge Cases & Considerations

### 1. Multi-User Scenario

**Scenario:** User A (OWNER) completes all setup. User B (new ADMIN) logs in.

**Behavior:**
- User B sees Setup Hub with all items checked ✓
- Banner doesn't show (critical complete)
- Widget shows "Setup complete" state (collapsible)
- Setup Hub remains accessible as reference guide

**Rationale:** New admins should see what was done, even if they didn't do it

---

### 2. Data Regression

**Scenario:** Tenant had 3 active drivers. 2 drivers quit, only 1 remains active (still meets minimum).

**Behavior:**
- Critical status stays complete (still have 1 driver)
- Metadata shows: `activeCount: 1, pendingCount: 0, target: 1`
- No alerts or warnings

**Alternate scenario:** All 3 drivers quit, now 0 active.

**Behavior:**
- Critical status becomes incomplete
- Banner reappears (if not dismissed this session)
- Route planning blocked again
- Widget updates to show incomplete

**Rationale:** Status reflects current reality, not past achievements

---

### 3. Integration Disconnect

**Scenario:** TMS integration was connected, but API key expired or connection lost.

**Behavior:**
- Backend detects `status !== 'connected'`
- Critical item becomes incomplete
- Banner reappears
- Route planning blocked (no load data)

**Notification:**
- Should also show integration error in Integrations page
- Error message: "TMS connection lost - reconnect to restore route planning"

**Rationale:** System must reflect actual data availability

---

### 4. Role-Based Visibility

**OWNER:**
- Sees Setup Hub in nav
- Sees banner (if critical incomplete)
- Sees widget on dashboard
- Can complete all checklist items

**ADMIN:**
- Sees Setup Hub in nav
- Sees banner (if critical incomplete)
- Sees widget on dashboard
- Can complete all checklist items (same as OWNER)

**DISPATCHER:**
- Does NOT see Setup Hub in nav
- Does NOT see banner
- Does NOT see widget
- Blocked from route planning (with OnboardingBlocker) if critical incomplete
- Sees message: "Your admin needs to complete setup - contact them for access"

**DRIVER:**
- Does NOT see Setup Hub in nav
- Does NOT see banner
- Does NOT see widget
- Does NOT access route planning (not their role anyway)

**SUPER_ADMIN:**
- Does NOT see Setup Hub (they manage tenants, not tenant setup)
- Not relevant to their workflow

**Rationale:** Only tenant admins can complete setup, so only show them the checklist

---

### 5. Partial Integration Data

**Scenario:** TMS integration connected but no loads synced yet.

**Behavior:**
- "Connect TMS Integration" shows complete ✓
- "Minimum 3 active loads" shows incomplete (recommended)
- Critical items complete → route planning allowed
- Soft warning shows: "Limited load data"

**User can:**
- Manually create test route
- Try route planning with mock data
- Wait for TMS sync to complete

**Rationale:** Don't block features unnecessarily - TMS connected is the critical part

---

### 6. Setup Hub After 100% Complete

**Scenario:** All critical, recommended, AND optional items complete.

**Behavior:**
- Setup Hub stays in navigation with green checkmark ✓
- Banner doesn't show
- Widget shows "Setup complete! 🎉" (collapsible or hidden)
- Setup Hub page shows all items checked, no CTAs
- Becomes reference guide: "Your SALLY platform is fully configured"

**Rationale:** Always keep it accessible for:
- New admins joining later
- Troubleshooting ("Is our ELD still connected?")
- Revisiting configuration
- Reference documentation

---

## Success Metrics

### Quantitative Metrics

1. **Setup Completion Rate**
   - Target: 80% of tenants complete critical items within 7 days
   - Measure: `COUNT(tenants WHERE criticalComplete=true) / COUNT(tenants)`

2. **Time to First Route**
   - Target: Reduce from ~5 days to ~2 days
   - Measure: Time between tenant approval and first route creation

3. **Support Ticket Reduction**
   - Target: 40% reduction in setup-related support tickets
   - Measure: Tickets tagged "onboarding" or "setup"

4. **Feature Adoption**
   - Target: 90% of tenants activate at least 3 drivers (vs 1 minimum)
   - Measure: `AVG(activeDriverCount) FROM tenants`

### Qualitative Metrics

1. **User Feedback**
   - Survey after 30 days: "Was setup clear and helpful?"
   - Net Promoter Score (NPS) improvement

2. **Setup Hub Usage**
   - Track page views and time spent
   - Track which items users click most

3. **Blocking Effectiveness**
   - Track how many users hit OnboardingBlocker
   - Measure time between block and completion

---

## Future Enhancements

### Phase 2 (Post-MVP)

1. **Smart Recommendations**
   - "Your competitors average 8 drivers - consider adding more"
   - "Connect weather data for better ETA predictions"

2. **Onboarding Tours**
   - Interactive product tour after critical complete
   - Tooltips on first visit to each page

3. **Progress Emails**
   - "You're 75% done with setup - finish today!"
   - Weekly digest of incomplete items

4. **Admin Insights**
   - Dashboard for SUPER_ADMIN showing tenant setup completion rates
   - Identify tenants stuck on specific items

5. **Contextual Help**
   - "Need help activating drivers? Watch this 2-min video"
   - Link to documentation for each checklist item

---

## Appendix: Component API Reference

### OnboardingBanner

```typescript
interface OnboardingBannerProps {
  incompleteCount: number;
  onDismiss: () => void;
}
```

### OnboardingWidget

```typescript
interface OnboardingWidgetProps {
  status: OnboardingStatus;
  onItemClick: (itemId: string) => void;
}
```

### OnboardingBlocker

```typescript
interface OnboardingBlockerProps {
  incompleteCriticalItems: OnboardingItem[];
}
```

### OnboardingItemCard

```typescript
interface OnboardingItemCardProps {
  item: OnboardingItem;
  priority: 'critical' | 'recommended' | 'optional';
  onActionClick: () => void;
}
```

---

## Documentation & Knowledge Transfer

### For Developers

- Design doc: `.docs/plans/2026-02-02-onboarding-setup-hub-design.md`
- Implementation plan: `.docs/plans/2026-02-02-onboarding-setup-hub-implementation.md`
- API docs: Auto-generated from OpenAPI spec

### For Product/Support

- Setup Hub user guide (for internal training)
- FAQ: "What if users skip onboarding?"
- Troubleshooting guide: "User says route planning is blocked"

### For Users

- In-app help text on Setup Hub page
- "Why this matters" explanations for each item
- Link to knowledge base articles

---

## Conclusion

The Setup Hub system provides a comprehensive, flexible onboarding experience that guides users through critical setup while maintaining operational flexibility. By using priority-based organization, contextual blocking, and three-tier visibility, we prevent user frustration while encouraging best practices.

**Key Benefits:**
- ✅ Prevents dead-ends (users know what's missing before they hit errors)
- ✅ Maintains flexibility (users can complete tasks in any order)
- ✅ Always accessible (becomes reference guide after completion)
- ✅ Real-time feedback (progress updates immediately)
- ✅ Role-appropriate (only shows to users who can act)

**Next Steps:**
1. Review and approve this design
2. Create detailed implementation plan
3. Set up git worktree for isolated development
4. Implement in phases (backend → state → UI → integration → testing)
5. Deploy and monitor adoption metrics
