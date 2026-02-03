# Feature Flags & Coming Soon Banners Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement database-backed feature flags with Coming Soon marketing banners for gradual feature rollout

**Architecture:** Three-layer system - (1) Prisma schema + NestJS backend API for flag management, (2) Zustand store + React hooks for frontend flag checking, (3) Full-page Coming Soon banner components that replace disabled features with marketing content explaining upcoming capabilities

**Tech Stack:** PostgreSQL, Prisma, NestJS, React, TypeScript, Zustand, Shadcn UI, Tailwind CSS

---

## Overview

This plan implements a feature flag system to control visibility of incomplete features while showing users compelling "Coming Soon" marketing content. The system will:

1. Store feature flags in PostgreSQL via Prisma
2. Expose backend API to query flags (GET /api/v1/feature-flags)
3. Create Zustand store + React hooks for frontend flag checking
4. Build reusable Coming Soon banner components with marketing copy
5. Integrate flags into dispatcher/driver pages (route planning, live tracking, command center, etc.)

---

## Task 1: Add FeatureFlag Model to Prisma Schema

**Files:**
- Modify: `apps/backend/prisma/schema.prisma` (append to end of file, after line 774)

**Step 1: Add FeatureFlag model to schema**

Add this model to the end of the Prisma schema file:

```prisma
// ============================================================================
// FEATURE FLAGS MODEL
// ============================================================================

model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique @db.VarChar(100)
  name        String   @db.VarChar(200)
  description String?  @db.Text
  enabled     Boolean  @default(false)
  category    String   @default("general") @db.VarChar(50)  // general | dispatcher | driver | admin
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@index([key])
  @@index([category])
  @@index([enabled])
  @@map("feature_flags")
}
```

**Step 2: Generate Prisma client**

Run: `cd apps/backend && npm run prisma:generate`
Expected: "✔ Generated Prisma Client"

**Step 3: Push schema to database**

Run: `cd apps/backend && npm run db:push`
Expected: "Your database is now in sync with your Prisma schema."

**Step 4: Commit**

```bash
git add apps/backend/prisma/schema.prisma
git commit -m "feat(db): add feature_flags table schema"
```

---

## Task 2: Create Feature Flags Seed Data

**Files:**
- Create: `apps/backend/prisma/seeds/feature-flags.seed.ts`

**Step 1: Create seed file with initial flags**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedFeatureFlags() {
  console.log('🚩 Seeding feature flags...');

  const flags = [
    // Dispatcher features
    {
      key: 'route_planning_enabled',
      name: 'Route Planning',
      description: 'Intelligent route planning with HOS compliance and automatic rest/fuel stop insertion',
      enabled: false,
      category: 'dispatcher',
    },
    {
      key: 'live_tracking_enabled',
      name: 'Live Route Tracking',
      description: 'Real-time monitoring of active routes with progress tracking and status updates',
      enabled: false,
      category: 'dispatcher',
    },
    {
      key: 'command_center_enabled',
      name: 'Dispatcher Command Center',
      description: 'Mission control dashboard with fleet overview, quick actions, and activity feed',
      enabled: false,
      category: 'dispatcher',
    },

    // Driver features
    {
      key: 'driver_dashboard_enabled',
      name: 'Driver Dashboard',
      description: 'Driver portal with route overview and HOS compliance tracking',
      enabled: false,
      category: 'driver',
    },
    {
      key: 'driver_current_route_enabled',
      name: 'Driver Current Route View',
      description: 'Real-time route timeline with stop-by-stop guidance and HOS status',
      enabled: false,
      category: 'driver',
    },
    {
      key: 'driver_messages_enabled',
      name: 'Driver Messages',
      description: 'Communication channel for dispatch messages and route updates',
      enabled: false,
      category: 'driver',
    },

    // System features
    {
      key: 'alerts_system_enabled',
      name: 'Automated Alert System',
      description: 'Proactive dispatcher notifications for HOS, delays, and critical events',
      enabled: false,
      category: 'dispatcher',
    },
    {
      key: 'continuous_monitoring_enabled',
      name: 'Continuous Monitoring',
      description: 'Background service monitoring 14 trigger types every 60 seconds',
      enabled: false,
      category: 'dispatcher',
    },

    // Integration features
    {
      key: 'external_integrations_enabled',
      name: 'External Integrations',
      description: 'Connect to Samsara ELD, TMS, fuel price APIs, and weather services',
      enabled: false,
      category: 'admin',
    },

    // Fleet management
    {
      key: 'fleet_management_enabled',
      name: 'Fleet Management',
      description: 'CRUD interface for managing drivers, vehicles, and fleet settings',
      enabled: false,
      category: 'admin',
    },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: flag,
    });
  }

  console.log(`✅ Created/updated ${flags.length} feature flags`);
}

// Run if called directly
if (require.main === module) {
  seedFeatureFlags()
    .then(() => {
      console.log('✅ Feature flags seed complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Feature flags seed failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
```

**Step 2: Update main seed file to call feature flags seed**

Modify: `apps/backend/prisma/seed.ts`

Find the main function and add the feature flags seed call:

```typescript
import { seedFeatureFlags } from './seeds/feature-flags.seed';

async function main() {
  // ... existing seed calls ...

  await seedFeatureFlags();

  // ... rest of main function ...
}
```

**Step 3: Run seed to populate flags**

Run: `cd apps/backend && npm run db:seed`
Expected: "✅ Created/updated 10 feature flags"

**Step 4: Verify flags in database**

Run: `cd apps/backend && npm run prisma:studio`
Expected: Prisma Studio opens, feature_flags table shows 10 records with enabled=false

**Step 5: Commit**

```bash
git add apps/backend/prisma/seeds/feature-flags.seed.ts apps/backend/prisma/seed.ts
git commit -m "feat(db): add feature flags seed data"
```

---

## Task 3: Create Backend Feature Flags Service

**Files:**
- Create: `apps/backend/src/api/feature-flags/feature-flags.service.ts`
- Create: `apps/backend/src/api/feature-flags/feature-flags.controller.ts`
- Create: `apps/backend/src/api/feature-flags/feature-flags.module.ts`
- Create: `apps/backend/src/api/feature-flags/dto/feature-flag.dto.ts`

**Step 1: Create DTO**

```typescript
// apps/backend/src/api/feature-flags/dto/feature-flag.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class FeatureFlagDto {
  @ApiProperty({ example: 'route_planning_enabled' })
  key: string;

  @ApiProperty({ example: 'Route Planning' })
  name: string;

  @ApiProperty({ example: 'Intelligent route planning with HOS compliance', required: false })
  description?: string;

  @ApiProperty({ example: false })
  enabled: boolean;

  @ApiProperty({ example: 'dispatcher' })
  category: string;
}

export class FeatureFlagsResponse {
  @ApiProperty({ type: [FeatureFlagDto] })
  flags: FeatureFlagDto[];
}
```

**Step 2: Create service**

```typescript
// apps/backend/src/api/feature-flags/feature-flags.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma/prisma.service';
import { FeatureFlagDto } from './dto/feature-flag.dto';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlagDto[]> {
    const flags = await this.prisma.featureFlag.findMany({
      orderBy: { category: 'asc' },
    });

    return flags.map(flag => ({
      key: flag.key,
      name: flag.name,
      description: flag.description || undefined,
      enabled: flag.enabled,
      category: flag.category,
    }));
  }

  /**
   * Get specific flag by key
   */
  async getFlagByKey(key: string): Promise<FeatureFlagDto | null> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
    });

    if (!flag) return null;

    return {
      key: flag.key,
      name: flag.name,
      description: flag.description || undefined,
      enabled: flag.enabled,
      category: flag.category,
    };
  }

  /**
   * Check if a feature is enabled
   */
  async isEnabled(key: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
      select: { enabled: true },
    });

    return flag?.enabled ?? false;
  }

  /**
   * Toggle feature flag (for admin use)
   */
  async toggleFlag(key: string, enabled: boolean): Promise<FeatureFlagDto> {
    const flag = await this.prisma.featureFlag.update({
      where: { key },
      data: { enabled },
    });

    this.logger.log(`Feature flag '${key}' ${enabled ? 'enabled' : 'disabled'}`);

    return {
      key: flag.key,
      name: flag.name,
      description: flag.description || undefined,
      enabled: flag.enabled,
      category: flag.category,
    };
  }
}
```

**Step 3: Create controller**

```typescript
// apps/backend/src/api/feature-flags/feature-flags.controller.ts
import { Controller, Get, Param, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagDto, FeatureFlagsResponse } from './dto/feature-flag.dto';

@ApiTags('Feature Flags')
@Controller('feature-flags')
export class FeatureFlagsController {
  private readonly logger = new Logger(FeatureFlagsController.name);

  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all feature flags' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feature flags retrieved successfully',
    type: FeatureFlagsResponse,
  })
  async getAllFlags(): Promise<FeatureFlagsResponse> {
    const flags = await this.featureFlagsService.getAllFlags();
    return { flags };
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get specific feature flag by key' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feature flag retrieved successfully',
    type: FeatureFlagDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feature flag not found',
  })
  async getFlagByKey(@Param('key') key: string): Promise<FeatureFlagDto> {
    const flag = await this.featureFlagsService.getFlagByKey(key);

    if (!flag) {
      throw new Error(`Feature flag '${key}' not found`);
    }

    return flag;
  }

  @Get(':key/enabled')
  @ApiOperation({ summary: 'Check if feature is enabled' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feature enabled status',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        enabled: { type: 'boolean' },
      },
    },
  })
  async isEnabled(@Param('key') key: string): Promise<{ key: string; enabled: boolean }> {
    const enabled = await this.featureFlagsService.isEnabled(key);
    return { key, enabled };
  }
}
```

**Step 4: Create module**

```typescript
// apps/backend/src/api/feature-flags/feature-flags.module.ts
import { Module } from '@nestjs/common';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsService } from './feature-flags.service';
import { PrismaService } from '../../services/prisma/prisma.service';

@Module({
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService, PrismaService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
```

**Step 5: Register module in app.module.ts**

Modify: `apps/backend/src/app.module.ts`

Add to imports array:

```typescript
import { FeatureFlagsModule } from './api/feature-flags/feature-flags.module';

@Module({
  imports: [
    // ... existing imports ...
    FeatureFlagsModule,
  ],
  // ...
})
```

**Step 6: Test API endpoint**

Run backend: `npm run backend:dev`

Test endpoint: `curl http://localhost:4000/api/v1/feature-flags`
Expected: JSON response with 10 feature flags, all with enabled: false

**Step 7: Commit**

```bash
git add apps/backend/src/api/feature-flags/ apps/backend/src/app.module.ts
git commit -m "feat(api): add feature flags API endpoints"
```

---

## Task 4: Create Frontend Feature Flags Store

**Files:**
- Create: `apps/web/src/lib/store/featureFlagsStore.ts`
- Create: `apps/web/src/lib/hooks/useFeatureFlag.ts`
- Create: `apps/web/src/lib/api/feature-flags.ts`

**Step 1: Create API client**

```typescript
// apps/web/src/lib/api/feature-flags.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  category: string;
}

export interface FeatureFlagsResponse {
  flags: FeatureFlag[];
}

export const featureFlagsApi = {
  /**
   * Fetch all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    const response = await fetch(`${API_BASE_URL}/feature-flags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch feature flags: ${response.statusText}`);
    }

    const data: FeatureFlagsResponse = await response.json();
    return data.flags;
  },

  /**
   * Check if specific feature is enabled
   */
  async isEnabled(key: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/feature-flags/${key}/enabled`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Default to disabled if flag doesn't exist
      console.warn(`Feature flag '${key}' not found, defaulting to disabled`);
      return false;
    }

    const data = await response.json();
    return data.enabled;
  },
};
```

**Step 2: Create Zustand store**

```typescript
// apps/web/src/lib/store/featureFlagsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { featureFlagsApi, FeatureFlag } from '../api/feature-flags';

interface FeatureFlagsState {
  flags: Record<string, boolean>;
  isLoading: boolean;
  lastFetched: number | null;
  error: string | null;
}

interface FeatureFlagsActions {
  fetchFlags: () => Promise<void>;
  isEnabled: (key: string) => boolean;
  reset: () => void;
}

type FeatureFlagsStore = FeatureFlagsState & FeatureFlagsActions;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useFeatureFlagsStore = create<FeatureFlagsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      flags: {},
      isLoading: false,
      lastFetched: null,
      error: null,

      // Fetch all flags from API
      fetchFlags: async () => {
        const { lastFetched } = get();
        const now = Date.now();

        // Use cache if recent
        if (lastFetched && now - lastFetched < CACHE_DURATION) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const flagsList = await featureFlagsApi.getAllFlags();

          // Convert array to map for fast lookup
          const flagsMap = flagsList.reduce((acc, flag) => {
            acc[flag.key] = flag.enabled;
            return acc;
          }, {} as Record<string, boolean>);

          set({
            flags: flagsMap,
            lastFetched: now,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error('Failed to fetch feature flags:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      // Check if feature is enabled
      isEnabled: (key: string) => {
        const { flags } = get();
        return flags[key] ?? false; // Default to disabled
      },

      // Reset state
      reset: () => {
        set({
          flags: {},
          isLoading: false,
          lastFetched: null,
          error: null,
        });
      },
    }),
    {
      name: 'feature-flags-storage',
      partialize: (state) => ({
        flags: state.flags,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
```

**Step 3: Create React hook**

```typescript
// apps/web/src/lib/hooks/useFeatureFlag.ts
import { useEffect } from 'react';
import { useFeatureFlagsStore } from '../store/featureFlagsStore';

/**
 * Hook to check if a feature is enabled
 * Automatically fetches flags on mount if not cached
 */
export function useFeatureFlag(key: string): {
  enabled: boolean;
  isLoading: boolean;
  error: string | null;
} {
  const { flags, isLoading, error, fetchFlags, isEnabled } = useFeatureFlagsStore();

  // Fetch flags on mount if empty
  useEffect(() => {
    if (Object.keys(flags).length === 0 && !isLoading) {
      fetchFlags();
    }
  }, [flags, isLoading, fetchFlags]);

  return {
    enabled: isEnabled(key),
    isLoading,
    error,
  };
}

/**
 * Hook to get all feature flags
 */
export function useFeatureFlags() {
  const { flags, isLoading, error, fetchFlags } = useFeatureFlagsStore();

  // Fetch flags on mount if empty
  useEffect(() => {
    if (Object.keys(flags).length === 0 && !isLoading) {
      fetchFlags();
    }
  }, [flags, isLoading, fetchFlags]);

  return {
    flags,
    isLoading,
    error,
    refresh: fetchFlags,
  };
}
```

**Step 4: Test store and hook**

Create test component in `apps/web/src/app/test-flags/page.tsx`:

```typescript
'use client';

import { useFeatureFlags, useFeatureFlag } from '@/lib/hooks/useFeatureFlag';

export default function TestFlagsPage() {
  const { flags, isLoading, error } = useFeatureFlags();
  const routePlanning = useFeatureFlag('route_planning_enabled');

  if (isLoading) return <div>Loading flags...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Feature Flags Test</h1>

      <div className="mb-6">
        <h2 className="text-xl mb-2">Route Planning Flag:</h2>
        <p>Enabled: {routePlanning.enabled ? 'Yes' : 'No'}</p>
      </div>

      <div>
        <h2 className="text-xl mb-2">All Flags:</h2>
        <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded">
          {JSON.stringify(flags, null, 2)}
        </pre>
      </div>
    </div>
  );
}
```

Run: Visit http://localhost:3000/test-flags
Expected: Shows all flags as disabled

**Step 5: Commit**

```bash
git add apps/web/src/lib/store/featureFlagsStore.ts apps/web/src/lib/hooks/useFeatureFlag.ts apps/web/src/lib/api/feature-flags.ts
git commit -m "feat(web): add feature flags store and hooks"
```

---

## Task 5: Create Coming Soon Banner Component

**Files:**
- Create: `apps/web/src/components/coming-soon/ComingSoonBanner.tsx`
- Create: `apps/web/src/components/coming-soon/FeaturePreview.tsx`

**Step 1: Create base banner component**

```typescript
// apps/web/src/components/coming-soon/ComingSoonBanner.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface ComingSoonBannerProps {
  featureName: string;
  icon?: React.ReactNode;
  tagline: string;
  status: string;
  expectedQuarter: string;
  completionPercent: number;
  whatsComingItems: Array<{
    title: string;
    description: string;
  }>;
  whyItMatters: {
    problem: string;
    solution: string;
  };
  backLink?: string;
  backLabel?: string;
}

export function ComingSoonBanner({
  featureName,
  icon,
  tagline,
  status,
  expectedQuarter,
  completionPercent,
  whatsComingItems,
  whyItMatters,
  backLink = '/dispatcher/overview',
  backLabel = 'Back to Dashboard',
}: ComingSoonBannerProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-6">
        {/* Back button */}
        <Link href={backLink}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backLabel}
          </Button>
        </Link>

        {/* Hero card */}
        <Card className="border-2 border-border">
          <CardHeader className="text-center pb-4">
            {icon && (
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                  {icon}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Badge variant="outline" className="text-sm font-medium">
                🚧 {status}
              </Badge>
              <CardTitle className="text-3xl font-bold">{featureName}</CardTitle>
              <p className="text-lg text-muted-foreground">{tagline}</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Development Progress</span>
                <span className="font-medium">{completionPercent}%</span>
              </div>
              <Progress value={completionPercent} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Expected: {expectedQuarter}
              </p>
            </div>

            {/* What's Coming */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">What's Coming</h3>
              <div className="space-y-3">
                {whatsComingItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-foreground mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Why It Matters */}
            <div className="space-y-4 bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border border-border">
              <h3 className="text-xl font-semibold">Why It Matters</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Current Challenge:</p>
                  <p className="text-sm">{whyItMatters.problem}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">SALLY's Solution:</p>
                  <p className="text-sm">{whyItMatters.solution}</p>
                </div>
              </div>
            </div>

            {/* Call to action */}
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Want to be notified when this feature launches?
              </p>
              <Link href={backLink}>
                <Button size="lg">
                  {backLabel}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Step 2: Create feature-specific preview component**

```typescript
// apps/web/src/components/coming-soon/FeaturePreview.tsx
import { ComingSoonBanner } from './ComingSoonBanner';
import { MapPin, Activity, LayoutDashboard, Navigation, MessageSquare, Bell } from 'lucide-react';

export function RoutePlanningPreview() {
  return (
    <ComingSoonBanner
      featureName="Intelligent Route Planning"
      icon={<MapPin className="h-12 w-12" />}
      tagline="The heart of SALLY - where HOS compliance meets optimization"
      status="Final Testing"
      expectedQuarter="Q2 2026"
      completionPercent={85}
      whatsComingItems={[
        {
          title: 'Smart Stop Sequencing',
          description: 'TSP optimization finds the fastest route through all your stops',
        },
        {
          title: 'Zero HOS Violations',
          description: 'Automatic rest stop insertion when drivers run out of hours',
        },
        {
          title: 'Fuel Cost Optimization',
          description: 'Find cheapest truck stops along your route',
        },
        {
          title: 'Real-time HOS Sync',
          description: 'Live driver hours from Samsara/KeepTruckin',
        },
        {
          title: 'One-Click Plan Generation',
          description: 'Load → Driver → Vehicle → Optimized Route in seconds',
        },
      ]}
      whyItMatters={{
        problem: 'Manual route planning takes 30-45 minutes per load. Dispatchers struggle with HOS calculations.',
        solution: 'SALLY does it in 5 seconds with zero violations guaranteed.',
      }}
    />
  );
}

export function LiveTrackingPreview() {
  return (
    <ComingSoonBanner
      featureName="Live Route Tracking"
      icon={<Activity className="h-12 w-12" />}
      tagline="Real-time visibility into every active route"
      status="Integration in Progress"
      expectedQuarter="Q2 2026"
      completionPercent={60}
      whatsComingItems={[
        {
          title: 'Live Map View',
          description: 'See all trucks on a single map with status indicators',
        },
        {
          title: 'Progress Monitoring',
          description: 'Track progress vs. planned ETA for each segment',
        },
        {
          title: 'Status Updates',
          description: 'Real-time notifications when drivers start/stop, arrive, or deviate',
        },
        {
          title: 'HOS Countdown',
          description: 'See remaining hours for each driver in real-time',
        },
        {
          title: 'Proactive Alerts',
          description: 'Get notified BEFORE problems happen (driver not moving, HOS approaching)',
        },
      ]}
      whyItMatters={{
        problem: 'Dispatchers currently make 10+ phone calls per day asking "Where are you?" and "What\'s your ETA?"',
        solution: 'SALLY shows you instantly with zero phone calls.',
      }}
    />
  );
}

export function CommandCenterPreview() {
  return (
    <ComingSoonBanner
      featureName="Dispatcher Command Center"
      icon={<LayoutDashboard className="h-12 w-12" />}
      tagline="Your mission control for the entire fleet"
      status="Core Features Implemented"
      expectedQuarter="Q2 2026"
      completionPercent={75}
      whatsComingItems={[
        {
          title: 'Fleet Dashboard',
          description: 'See all active routes, drivers, and alerts at a glance',
        },
        {
          title: 'Smart Alerts',
          description: 'Prioritized notifications (Critical → High → Medium → Low)',
        },
        {
          title: 'Quick Actions',
          description: 'Create plans, view routes, manage fleet from one screen',
        },
        {
          title: 'Real-time Stats',
          description: 'Active routes, pending plans, available drivers, critical alerts',
        },
        {
          title: 'Performance Analytics',
          description: 'Hours recovered, on-time %, fuel savings',
        },
      ]}
      whyItMatters={{
        problem: 'Dispatchers juggle TMS, ELD, spreadsheets, and phone calls across 5+ tools.',
        solution: 'SALLY brings it all into one screen with proactive alerts, not reactive fire-fighting.',
      }}
    />
  );
}

export function DriverCurrentRoutePreview() {
  return (
    <ComingSoonBanner
      featureName="Driver Route View"
      icon={<Navigation className="h-12 w-12" />}
      tagline="Clear guidance for drivers - no more guessing"
      status="UI Design Complete"
      expectedQuarter="Q2 2026"
      completionPercent={65}
      whatsComingItems={[
        {
          title: 'Today\'s Route',
          description: 'See your entire route in one vertical timeline',
        },
        {
          title: 'Next Stop Guidance',
          description: '"What do I do next?" answered instantly',
        },
        {
          title: 'HOS Status',
          description: 'Real-time compliance bars (Drive, Duty, Break requirements)',
        },
        {
          title: 'Rest Recommendations',
          description: 'See where and when to rest (with reasoning)',
        },
        {
          title: 'One-Tap Actions',
          description: '"I\'m here", "Dock taking longer", "I want to rest here"',
        },
      ]}
      whyItMatters={{
        problem: 'Drivers currently plan routes in their heads, manually calculate HOS, and call dispatch 3+ times per route.',
        solution: 'SALLY gives clear guidance with automatic updates as conditions change.',
      }}
      backLink="/driver/dashboard"
      backLabel="Back to Driver Dashboard"
    />
  );
}

export function DriverMessagesPreview() {
  return (
    <ComingSoonBanner
      featureName="Driver Messages"
      icon={<MessageSquare className="h-12 w-12" />}
      tagline="Direct communication channel with dispatch"
      status="Planning"
      expectedQuarter="Q3 2026"
      completionPercent={30}
      whatsComingItems={[
        {
          title: 'Instant Notifications',
          description: 'Receive route updates and dispatch messages in real-time',
        },
        {
          title: 'Two-Way Communication',
          description: 'Reply to dispatch without phone calls',
        },
        {
          title: 'Message History',
          description: 'Access all previous communications per route',
        },
        {
          title: 'Quick Replies',
          description: 'Pre-written responses for common situations',
        },
      ]}
      whyItMatters={{
        problem: 'Drivers miss calls while driving, dispatch leaves voicemails, communication delays cause missed appointments.',
        solution: 'SALLY enables asynchronous, documented communication that drivers can access anytime.',
      }}
      backLink="/driver/dashboard"
      backLabel="Back to Driver Dashboard"
    />
  );
}

export function AlertsSystemPreview() {
  return (
    <ComingSoonBanner
      featureName="Automated Alert System"
      icon={<Bell className="h-12 w-12" />}
      tagline="Proactive notifications that prevent problems before they happen"
      status="Backend Complete"
      expectedQuarter="Q2 2026"
      completionPercent={55}
      whatsComingItems={[
        {
          title: '8 Alert Types',
          description: 'Driver not moving, HOS approaching, dock delays, fuel low, missed appointment',
        },
        {
          title: 'Priority-Based Triage',
          description: 'Critical alerts in red, high in orange, medium in yellow',
        },
        {
          title: 'Recommended Actions',
          description: '"Call driver to check status" vs "Monitor, rest stop upcoming"',
        },
        {
          title: 'Auto-Generation',
          description: 'Monitoring service evaluates conditions every 60 seconds',
        },
      ]}
      whyItMatters={{
        problem: 'Dispatchers find out about problems AFTER they happen (missed appointment, HOS violation, truck breakdown).',
        solution: 'SALLY alerts you BEFORE they happen so you can intervene early.',
      }}
    />
  );
}
```

**Step 3: Test coming soon banner**

Create test page in `apps/web/src/app/test-banner/page.tsx`:

```typescript
'use client';

import { RoutePlanningPreview } from '@/components/coming-soon/FeaturePreview';

export default function TestBannerPage() {
  return <RoutePlanningPreview />;
}
```

Run: Visit http://localhost:3000/test-banner
Expected: Full-page coming soon banner with route planning details

**Step 4: Commit**

```bash
git add apps/web/src/components/coming-soon/
git commit -m "feat(web): add coming soon banner components"
```

---

## Task 6: Integrate Feature Flags into Route Planning Page

**Files:**
- Modify: `apps/web/src/app/dispatcher/create-plan/page.tsx`

**Step 1: Add feature flag check to page**

Replace the entire page content with:

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useRoutePlanStore } from '@/lib/store/routePlanStore';
import { useRoutePlanning } from '@/lib/hooks/useRoutePlanning';
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadSelector } from '@/components/route-planner/shared/LoadSelector';
import { DriverSelector } from '@/components/route-planner/shared/DriverSelector';
import { VehicleSelector } from '@/components/route-planner/shared/VehicleSelector';
import RoutePlanningCockpit from '@/components/route-planner/core/RoutePlanningCockpit';
import RoutePlanningCockpitSkeleton from '@/components/route-planner/core/RoutePlanningCockpitSkeleton';
import { RoutePlanningPreview } from '@/components/coming-soon/FeaturePreview';

export default function CreatePlanPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSessionStore();
  const { enabled: isRoutePlanningEnabled, isLoading: isFlagLoading } = useFeatureFlag('route_planning_enabled');

  const {
    currentPlan,
    stops,
    driverId,
    vehicleId,
    driverState,
    vehicleState,
    optimizationPriority,
    selectedLoadId,
  } = useRoutePlanStore();

  const { optimizeRoute, isOptimizing } = useRoutePlanning();

  // Show coming soon banner if feature is disabled
  if (isFlagLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isRoutePlanningEnabled) {
    return <RoutePlanningPreview />;
  }

  // Auth check
  if (!isAuthenticated || (user?.role !== 'DISPATCHER' && user?.role !== 'ADMIN' && user?.role !== 'OWNER')) {
    return null;
  }

  // Compute form validity
  const isFormValid = !!(
    selectedLoadId &&
    driverId &&
    vehicleId &&
    driverState &&
    vehicleState &&
    stops &&
    stops.length >= 2
  );

  const handleGeneratePlan = () => {
    if (!isFormValid) {
      return;
    }

    optimizeRoute({
      driver_id: driverId!,
      vehicle_id: vehicleId!,
      driver_state: driverState!,
      vehicle_state: vehicleState!,
      stops,
      optimization_priority: optimizationPriority,
    });
  };

  const handleStartOver = () => {
    useRoutePlanStore.getState().reset();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Route Plan</h1>
          <p className="text-muted-foreground mt-1">
            Plan optimized routes with zero HOS violations and automatic rest stop insertion
          </p>
        </div>

        {/* Input Section */}
        <Card className="p-6">
          <div className="space-y-6">
            <div className="text-center py-4">
              <div className="text-sm font-medium text-muted-foreground">
                🗺️ Map-first visualization • 🚫 Zero HOS violations
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <LoadSelector />
              <DriverSelector />
              <VehicleSelector />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border">
              {currentPlan && (
                <Button variant="outline" onClick={handleStartOver}>
                  Start Over
                </Button>
              )}
              <Button
                onClick={handleGeneratePlan}
                disabled={!isFormValid || isOptimizing}
                className="ml-auto"
                size="lg"
              >
                {isOptimizing ? 'Generating Plan...' : 'Generate Plan'}
              </Button>
            </div>

            {!isFormValid && !currentPlan && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
                <div className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Complete the following to generate your route:
                </div>
                <ul className="space-y-1 text-blue-700 dark:text-blue-300 text-xs">
                  {!selectedLoadId && <li>• Select a load</li>}
                  {!driverId && <li>• Select a driver (auto-suggested after load selection)</li>}
                  {!vehicleId && <li>• Select a vehicle (auto-suggested after driver selection)</li>}
                  {stops.length < 2 && selectedLoadId && <li>• Load must have at least 2 stops</li>}
                </ul>
              </div>
            )}
          </div>
        </Card>

        {/* Loading State */}
        {isOptimizing && !currentPlan && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="text-2xl">⏳</div>
                <div>
                  <div className="font-semibold text-blue-800 dark:text-blue-200">
                    Generating Route Plan...
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    Optimizing route sequence, inserting rest stops, and validating HOS compliance
                  </div>
                </div>
              </div>
            </div>
            <RoutePlanningCockpitSkeleton />
          </div>
        )}

        {/* Results Section */}
        {currentPlan && !isOptimizing && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="text-2xl">✓</div>
                <div>
                  <div className="font-semibold text-green-800 dark:text-green-200">
                    Route Plan Generated Successfully
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    HOS-compliant route with automatic rest stop insertion
                  </div>
                </div>
              </div>
            </div>

            <RoutePlanningCockpit />
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Test with flag disabled**

1. Ensure route_planning_enabled flag is false in database
2. Visit http://localhost:3000/dispatcher/create-plan
3. Expected: Coming soon banner displays instead of wizard

**Step 3: Test with flag enabled**

1. In Prisma Studio, set route_planning_enabled to true
2. Refresh page
3. Expected: Route planning wizard shows normally

**Step 4: Commit**

```bash
git add apps/web/src/app/dispatcher/create-plan/page.tsx
git commit -m "feat(web): integrate feature flag into route planning page"
```

---

## Task 7: Integrate Feature Flags into Live Tracking Page

**Files:**
- Modify: `apps/web/src/app/dispatcher/active-routes/page.tsx`

**Step 1: Add feature flag check**

Update the page to check the `live_tracking_enabled` flag:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LiveTrackingPreview } from '@/components/coming-soon/FeaturePreview';

export default function ActiveRoutesPage() {
  const { isAuthenticated, user } = useSessionStore();
  const { enabled: isLiveTrackingEnabled, isLoading: isFlagLoading } = useFeatureFlag('live_tracking_enabled');

  // Show coming soon banner if feature is disabled
  if (isFlagLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isLiveTrackingEnabled) {
    return <LiveTrackingPreview />;
  }

  // Auth check
  if (!isAuthenticated || (user?.role !== 'DISPATCHER' && user?.role !== 'ADMIN' && user?.role !== 'OWNER')) {
    return null;
  }

  // Mock data
  const mockRoutes = [
    {
      id: 'RT-1234',
      driver: 'Driver #45',
      origin: 'Los Angeles, CA',
      destination: 'Phoenix, AZ',
      status: 'in_transit',
      progress: 65,
      eta: '4:30 PM',
    },
    {
      id: 'RT-1235',
      driver: 'Driver #12',
      origin: 'Seattle, WA',
      destination: 'Portland, OR',
      status: 'in_transit',
      progress: 85,
      eta: '2:15 PM',
    },
    {
      id: 'RT-1236',
      driver: 'Driver #78',
      origin: 'Denver, CO',
      destination: 'Salt Lake City, UT',
      status: 'rest_stop',
      progress: 45,
      eta: '11:00 PM',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_transit':
        return <Badge variant="default">In Transit</Badge>;
      case 'rest_stop':
        return <Badge variant="muted">Rest Stop</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Active Routes</h1>
        <p className="text-muted-foreground mt-1">Monitor ongoing routes and driver progress in real-time</p>
      </div>

      <div className="space-y-4">
        {mockRoutes.map((route) => (
          <Card key={route.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Route {route.id}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{route.driver}</p>
                </div>
                {getStatusBadge(route.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-muted-foreground">Origin</p>
                    <p className="font-medium">{route.origin}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Destination</p>
                    <p className="font-medium">{route.destination}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{route.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${route.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">ETA: </span>
                    <span className="font-medium">{route.eta}</span>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mockRoutes.length === 0 && (
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            <p className="text-lg font-medium">No Active Routes</p>
            <p className="text-sm mt-2">Create a new route plan to get started</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Step 2: Test flag behavior**

1. Set live_tracking_enabled to false
2. Visit /dispatcher/active-routes
3. Expected: Coming soon banner
4. Set flag to true
5. Expected: Active routes list

**Step 3: Commit**

```bash
git add apps/web/src/app/dispatcher/active-routes/page.tsx
git commit -m "feat(web): integrate feature flag into live tracking page"
```

---

## Task 8: Integrate Feature Flags into Command Center Page

**Files:**
- Modify: `apps/web/src/app/dispatcher/overview/page.tsx`

**Step 1: Add feature flag check**

Update the page to check the `command_center_enabled` flag:

```typescript
'use client';

import { useState } from 'react';
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { CommandCenterPreview } from '@/components/coming-soon/FeaturePreview';

export default function DispatcherOverviewPage() {
  const { enabled: isCommandCenterEnabled, isLoading: isFlagLoading } = useFeatureFlag('command_center_enabled');

  // Show coming soon banner if feature is disabled
  if (isFlagLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isCommandCenterEnabled) {
    return <CommandCenterPreview />;
  }

  // Auth is handled by layout-client.tsx
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">Monitor your fleet operations at a glance</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">+2 from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Plans</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting execution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-1">8 available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-orange-600 mt-1">2 critical</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dispatcher/create-plan">
              <Button className="w-full justify-between" variant="outline">
                Create New Route Plan
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dispatcher/active-routes">
              <Button className="w-full justify-between" variant="outline">
                View Active Routes
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/settings">
              <Button className="w-full justify-between" variant="outline">
                Manage Fleet Settings
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                <div className="flex-1">
                  <p className="font-medium">Route #RT-1234 completed</p>
                  <p className="text-muted-foreground text-xs">Driver #45 • 2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                <div className="flex-1">
                  <p className="font-medium">New plan created</p>
                  <p className="text-muted-foreground text-xs">Route #RT-1235 • 3 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
                <div className="flex-1">
                  <p className="font-medium">Alert: HOS approaching limit</p>
                  <p className="text-muted-foreground text-xs">Driver #12 • 4 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Active Routes Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center border border-border">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">Map Visualization</p>
              <p className="text-sm mt-1">Real-time fleet tracking coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Test flag behavior**

1. Set command_center_enabled to false
2. Visit /dispatcher/overview
3. Expected: Coming soon banner
4. Set flag to true
5. Expected: Command center dashboard

**Step 3: Commit**

```bash
git add apps/web/src/app/dispatcher/overview/page.tsx
git commit -m "feat(web): integrate feature flag into command center page"
```

---

## Task 9: Integrate Feature Flags into Driver Pages

**Files:**
- Modify: `apps/web/src/app/driver/current-route/page.tsx`
- Modify: `apps/web/src/app/driver/messages/page.tsx`

**Step 1: Update current route page**

```typescript
'use client';

import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Fuel, Moon } from 'lucide-react';
import { DriverCurrentRoutePreview } from '@/components/coming-soon/FeaturePreview';

export default function DriverCurrentRoutePage() {
  const { enabled: isDriverRouteEnabled, isLoading: isFlagLoading } = useFeatureFlag('driver_current_route_enabled');

  if (isFlagLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isDriverRouteEnabled) {
    return <DriverCurrentRoutePreview />;
  }

  // Mock route data
  const route = {
    id: 'RT-1234',
    status: 'in_progress',
    origin: 'Los Angeles, CA',
    destination: 'Phoenix, AZ',
    progress: 65,
    completedStops: 2,
    totalStops: 5,
    stops: [
      {
        id: '1',
        type: 'pickup',
        location: 'Los Angeles, CA',
        time: '8:00 AM',
        status: 'completed',
      },
      {
        id: '2',
        type: 'delivery',
        location: 'San Bernardino, CA',
        time: '10:30 AM',
        status: 'completed',
      },
      {
        id: '3',
        type: 'fuel',
        location: 'Pilot Travel Center - Exit 45',
        time: '12:00 PM',
        status: 'current',
      },
      {
        id: '4',
        type: 'rest',
        location: 'Truck Stop - Exit 78',
        time: '6:00 PM',
        status: 'upcoming',
      },
      {
        id: '5',
        type: 'delivery',
        location: 'Phoenix, AZ',
        time: '9:00 AM (next day)',
        status: 'upcoming',
      },
    ],
  };

  const getStopIcon = (type: string) => {
    switch (type) {
      case 'fuel':
        return <Fuel className="h-5 w-5" />;
      case 'rest':
        return <Moon className="h-5 w-5" />;
      default:
        return <MapPin className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'current':
        return <Badge variant="outline" className="border-primary text-primary">Current</Badge>;
      case 'upcoming':
        return <Badge variant="muted">Upcoming</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Current Route</h1>
        <p className="text-muted-foreground mt-1">Your route for today</p>
      </div>

      {/* Route overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Route {route.id}</CardTitle>
            <Badge variant="default">{route.status.replace('_', ' ')}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-muted-foreground">Origin</p>
                <p className="font-medium">{route.origin}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Destination</p>
                <p className="font-medium">{route.destination}</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{route.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${route.progress}%` }}
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Stops: {route.completedStops} of {route.totalStops} completed
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Route Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {route.stops.map((stop, index) => (
              <div key={stop.id} className="flex items-start gap-4">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0
                  ${stop.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : ''}
                  ${stop.status === 'current' ? 'bg-primary text-primary-foreground' : ''}
                  ${stop.status === 'upcoming' ? 'bg-gray-100 dark:bg-gray-800 text-muted-foreground' : ''}
                `}>
                  {getStopIcon(stop.type)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium">{stop.location}</p>
                    {getStatusBadge(stop.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {stop.type.charAt(0).toUpperCase() + stop.type.slice(1)} • {stop.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Map placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Route Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center border border-border">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">Map View</p>
              <p className="text-sm mt-1">Live tracking coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Update driver messages page**

```typescript
'use client';

import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag';
import { DriverMessagesPreview } from '@/components/coming-soon/FeaturePreview';

export default function DriverMessagesPage() {
  const { enabled: isMessagesEnabled, isLoading: isFlagLoading } = useFeatureFlag('driver_messages_enabled');

  if (isFlagLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isMessagesEnabled) {
    return <DriverMessagesPreview />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground mt-1">Communication with dispatch</p>
      </div>

      {/* Messages implementation will go here */}
      <div className="text-muted-foreground">Messages feature coming soon...</div>
    </div>
  );
}
```

**Step 3: Test flag behavior**

1. Set flags to false
2. Visit driver pages
3. Expected: Coming soon banners
4. Set flags to true
5. Expected: Page content shows

**Step 4: Commit**

```bash
git add apps/web/src/app/driver/
git commit -m "feat(web): integrate feature flags into driver pages"
```

---

## Task 10: Clean Up Test Pages and Documentation

**Files:**
- Delete: `apps/web/src/app/test-flags/page.tsx`
- Delete: `apps/web/src/app/test-banner/page.tsx`
- Create: `docs/FEATURE_FLAGS.md`

**Step 1: Remove test pages**

```bash
rm -rf apps/web/src/app/test-flags
rm -rf apps/web/src/app/test-banner
```

**Step 2: Create documentation**

```markdown
# Feature Flags System

## Overview

SALLY uses a database-backed feature flag system to control visibility of incomplete features while showing users compelling "Coming Soon" marketing content.

## Architecture

**Backend:**
- PostgreSQL storage via Prisma
- NestJS API at `/api/v1/feature-flags`
- Global flags (not per-tenant for POC)

**Frontend:**
- Zustand store with localStorage persistence
- React hooks (`useFeatureFlag`, `useFeatureFlags`)
- Full-page Coming Soon banner components

## Available Flags

| Key | Name | Category | Status |
|-----|------|----------|--------|
| `route_planning_enabled` | Route Planning | dispatcher | 85% complete |
| `live_tracking_enabled` | Live Route Tracking | dispatcher | 60% complete |
| `command_center_enabled` | Command Center | dispatcher | 75% complete |
| `driver_current_route_enabled` | Driver Current Route | driver | 65% complete |
| `driver_messages_enabled` | Driver Messages | driver | 30% complete |
| `alerts_system_enabled` | Automated Alerts | dispatcher | 55% complete |
| `continuous_monitoring_enabled` | Continuous Monitoring | dispatcher | 40% complete |
| `external_integrations_enabled` | External Integrations | admin | 50% complete |
| `fleet_management_enabled` | Fleet Management | admin | 45% complete |

## Usage

### Backend - Check if feature is enabled

```typescript
import { FeatureFlagsService } from './api/feature-flags/feature-flags.service';

constructor(private featureFlags: FeatureFlagsService) {}

async someMethod() {
  const isEnabled = await this.featureFlags.isEnabled('route_planning_enabled');

  if (!isEnabled) {
    throw new HttpException('Feature not available', HttpStatus.FORBIDDEN);
  }

  // ... proceed with feature logic
}
```

### Frontend - Check if feature is enabled

```typescript
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag';
import { RoutePlanningPreview } from '@/components/coming-soon/FeaturePreview';

export default function MyPage() {
  const { enabled, isLoading } = useFeatureFlag('route_planning_enabled');

  if (isLoading) return <div>Loading...</div>;
  if (!enabled) return <RoutePlanningPreview />;

  return <div>Feature content here</div>;
}
```

### Frontend - Get all flags

```typescript
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlag';

export default function AdminPage() {
  const { flags, isLoading, refresh } = useFeatureFlags();

  return (
    <div>
      {Object.entries(flags).map(([key, enabled]) => (
        <div key={key}>
          {key}: {enabled ? 'Enabled' : 'Disabled'}
        </div>
      ))}
      <button onClick={refresh}>Refresh Flags</button>
    </div>
  );
}
```

## Toggling Flags

### Via Prisma Studio (Development)

1. Run `npm run backend:prisma:studio`
2. Open `feature_flags` table
3. Toggle `enabled` field
4. Frontend will pick up changes on next page load (5min cache)

### Via API (Production - Future)

```bash
# Enable feature
curl -X PATCH http://localhost:4000/api/v1/feature-flags/route_planning_enabled \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# Disable feature
curl -X PATCH http://localhost:4000/api/v1/feature-flags/route_planning_enabled \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

## Coming Soon Banners

Reusable components in `apps/web/src/components/coming-soon/`:

- `ComingSoonBanner.tsx` - Base banner component
- `FeaturePreview.tsx` - Pre-configured banners for each feature

Each banner includes:
- Feature name and icon
- Status badge (e.g., "Final Testing")
- Progress bar with completion %
- Expected quarter (e.g., "Q2 2026")
- "What's Coming" - 4-5 bullet points of capabilities
- "Why It Matters" - Problem statement + SALLY's solution
- Back to dashboard button

## Adding New Flags

1. **Add to seed data** (`apps/backend/prisma/seeds/feature-flags.seed.ts`):
```typescript
{
  key: 'new_feature_enabled',
  name: 'New Feature',
  description: 'Description of new feature',
  enabled: false,
  category: 'dispatcher', // or 'driver', 'admin'
}
```

2. **Run seed**: `npm run backend:seed`

3. **Create Coming Soon banner** (`apps/web/src/components/coming-soon/FeaturePreview.tsx`):
```typescript
export function NewFeaturePreview() {
  return (
    <ComingSoonBanner
      featureName="New Feature"
      icon={<Icon className="h-12 w-12" />}
      tagline="One-line value proposition"
      status="In Development"
      expectedQuarter="Q3 2026"
      completionPercent={40}
      whatsComingItems={[...]}
      whyItMatters={{...}}
    />
  );
}
```

4. **Add flag check to page**:
```typescript
const { enabled } = useFeatureFlag('new_feature_enabled');
if (!enabled) return <NewFeaturePreview />;
```

## Caching

- Backend: No caching (always fresh from DB)
- Frontend: 5-minute localStorage cache
- Cache cleared on explicit refresh via `refresh()` method

## Future Enhancements

- [ ] Admin UI for toggling flags
- [ ] Per-tenant flags (beta testing)
- [ ] Percentage rollouts (gradual launch)
- [ ] A/B testing support
- [ ] Flag scheduling (auto-enable on date)
- [ ] Audit log (who toggled what when)

## Migration to Firebase Remote Config (Optional)

If moving to Firebase Remote Config later:

1. Keep same flag keys
2. Update `featureFlagsApi.ts` to use Firebase SDK
3. Remove Prisma model and backend API
4. Keep Zustand store and React hooks unchanged

This maintains backward compatibility with existing code.
```

**Step 3: Commit**

```bash
git add docs/FEATURE_FLAGS.md
git commit -m "docs: add feature flags documentation"
```

---

## Task 11: Final Testing and Verification

**Step 1: Test all flagged pages**

Create checklist and test:

```bash
# Backend running: npm run backend:dev
# Frontend running: npm run frontend:dev
```

**Checklist:**
- [ ] `/api/v1/feature-flags` returns all flags
- [ ] `/api/v1/feature-flags/route_planning_enabled` returns single flag
- [ ] Frontend store loads flags on page load
- [ ] `/dispatcher/create-plan` shows coming soon when disabled
- [ ] `/dispatcher/active-routes` shows coming soon when disabled
- [ ] `/dispatcher/overview` shows coming soon when disabled
- [ ] `/driver/current-route` shows coming soon when disabled
- [ ] `/driver/messages` shows coming soon when disabled
- [ ] Toggling flags in Prisma Studio updates frontend (after 5min or refresh)
- [ ] All coming soon banners render correctly
- [ ] Dark mode works on all banners
- [ ] Responsive design works (mobile, tablet, desktop)
- [ ] Back buttons navigate correctly

**Step 2: Test flag toggle cycle**

1. In Prisma Studio, set all flags to false
2. Visit each page, verify coming soon banner
3. Set all flags to true
4. Clear localStorage: `localStorage.clear()`
5. Refresh pages, verify content shows
6. Repeat for individual flags

**Step 3: Load test API**

```bash
# Test concurrent requests
for i in {1..100}; do
  curl http://localhost:4000/api/v1/feature-flags &
done
wait
```

Expected: All requests succeed, no errors in backend logs

**Step 4: Verify database performance**

```sql
-- In Prisma Studio or psql
EXPLAIN ANALYZE SELECT * FROM feature_flags WHERE key = 'route_planning_enabled';
```

Expected: Index scan on `key` column, < 1ms execution time

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete feature flags system with coming soon banners"
```

---

## Success Criteria

After completing this plan, verify:

✅ **Backend:**
- [ ] `feature_flags` table exists in PostgreSQL
- [ ] 10 feature flags seeded with `enabled=false`
- [ ] GET `/api/v1/feature-flags` returns all flags
- [ ] GET `/api/v1/feature-flags/:key` returns single flag
- [ ] API documented in Swagger at `/api/docs`

✅ **Frontend:**
- [ ] `useFeatureFlag` hook works for single flag
- [ ] `useFeatureFlags` hook works for all flags
- [ ] Zustand store caches flags for 5 minutes
- [ ] Coming soon banners render correctly
- [ ] All 5 pages check feature flags before rendering

✅ **Integration:**
- [ ] Route planning page shows banner when disabled
- [ ] Live tracking page shows banner when disabled
- [ ] Command center page shows banner when disabled
- [ ] Driver route page shows banner when disabled
- [ ] Driver messages page shows banner when disabled

✅ **Quality:**
- [ ] Dark mode works on all banners
- [ ] Responsive design works (mobile, tablet, desktop)
- [ ] No console errors in browser
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Documentation complete in `docs/FEATURE_FLAGS.md`

---

## Rollback Plan

If issues occur during implementation:

1. **Database rollback:**
```bash
cd apps/backend
npm run prisma:studio
# Delete all feature_flags records
# Or drop table if needed
```

2. **Code rollback:**
```bash
git log --oneline  # Find commit before feature flags
git revert <commit-hash>  # Revert specific commits
# Or
git reset --hard <commit-hash>  # Hard reset (use with caution)
```

3. **Quick disable all flags:**
```sql
UPDATE feature_flags SET enabled = false;
```

---

## Implementation Time Estimate

- Task 1-2 (Schema & Seed): 30 minutes
- Task 3 (Backend API): 45 minutes
- Task 4 (Frontend Store): 45 minutes
- Task 5 (Coming Soon Components): 60 minutes
- Task 6-9 (Page Integration): 90 minutes (6 pages × 15 min)
- Task 10 (Documentation): 30 minutes
- Task 11 (Testing): 45 minutes

**Total: ~6 hours**

---

## Next Steps After Completion

1. **Enable features gradually:**
   - Start with `command_center_enabled` (most complete)
   - Then `route_planning_enabled`
   - Then `live_tracking_enabled`
   - Finally driver features

2. **Monitor usage:**
   - Add analytics to track page views
   - Track how many users see coming soon banners
   - Measure engagement after enabling features

3. **Add admin UI** (future):
   - Create `/admin/feature-flags` page
   - Toggle switches per flag
   - Show completion % and expected dates
   - Audit log of who toggled what

4. **Consider per-tenant flags** (Phase 2):
   - Add `tenant_id` to `feature_flags` table
   - Enable beta testing with select customers
   - Gradual rollout by tenant size

---

**Plan saved to:** `docs/plans/2026-02-02-feature-flags-coming-soon.md`
