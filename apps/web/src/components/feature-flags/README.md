# Feature Flags System

Gradual feature rollout system with database-backed feature flags and Coming Soon banners.

## Overview

This system allows controlled feature rollout by:
1. **Backend**: PostgreSQL-stored feature flags with API endpoints
2. **Frontend**: Zustand store with localStorage caching + React hooks
3. **UI**: Coming Soon banners with marketing content when features are disabled

## Quick Start

### Check if a Feature is Enabled

```tsx
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlags';

function MyComponent() {
  const isEnabled = useFeatureFlag('route_planning_enabled');

  if (!isEnabled) {
    return <div>Coming soon!</div>;
  }

  return <div>Feature content</div>;
}
```

### Wrap a Page with Feature Guard

```tsx
import { FeatureGuard } from '@/components/feature-flags/FeatureGuard';

export default function MyPage() {
  return (
    <FeatureGuard featureKey="route_planning_enabled">
      <MyPageContent />
    </FeatureGuard>
  );
}
```

## Components

### `<FeatureGuard>`

Wraps page content and shows Coming Soon banner when feature is disabled.

**Props:**
- `featureKey: string` - The feature flag key to check
- `children: ReactNode` - Content to show when enabled
- `loadingFallback?: ReactNode` - Optional loading state

**Features:**
- Automatic loading states
- Fail-open pattern (shows content if API fails)
- Pulls marketing content from config

### `<ComingSoonBanner>`

Full-page banner with marketing content for disabled features.

**Props:**
- `title: string` - Feature title
- `description: string` - Feature description
- `features?: string[]` - List of feature highlights
- `category?: string` - Feature category (dispatcher, driver, admin)

## Hooks

### `useFeatureFlags()`

Fetches all feature flags (auto-fetches on mount if cache stale).

```tsx
const { flags, isLoading, error, refetch } = useFeatureFlags();
```

### `useFeatureFlag(key)`

Check if a specific feature is enabled.

```tsx
const isEnabled = useFeatureFlag('route_planning_enabled');
```

### `useFeatureGuard(key)`

Get enable status + loading/error states.

```tsx
const { isEnabled, isLoading, error } = useFeatureGuard('route_planning_enabled');
```

### `useFeatureFlagsByCategory(category)`

Get all flags in a category.

```tsx
const dispatcherFlags = useFeatureFlagsByCategory('dispatcher');
```

## Store

### Zustand Store: `useFeatureFlagsStore`

**State:**
- `flags: FeatureFlag[]` - All feature flags
- `isLoading: boolean` - Loading state
- `error: string | null` - Error state
- `lastFetched: number | null` - Cache timestamp

**Actions:**
- `setFlags(flags)` - Update flags
- `isEnabled(key)` - Check if enabled
- `getFlag(key)` - Get flag details
- `getFlagsByCategory(category)` - Filter by category
- `clearCache()` - Clear localStorage cache

**Caching:**
- 5-minute cache (localStorage)
- Auto-refresh when stale

## API

### Backend Endpoints

**GET /api/v1/feature-flags**
- Returns all feature flags
- Response: `{ flags: FeatureFlag[] }`

**GET /api/v1/feature-flags/:key**
- Returns specific flag
- Response: `FeatureFlag`

**GET /api/v1/feature-flags/:key/enabled**
- Returns enabled status only
- Response: `{ key: string, enabled: boolean }`

### API Client

```tsx
import { fetchAllFeatureFlags, checkFeatureEnabled } from '@/lib/api/featureFlags';

// Fetch all flags
const flags = await fetchAllFeatureFlags();

// Check if enabled
const isEnabled = await checkFeatureEnabled('route_planning_enabled');
```

## Adding New Features

### 1. Add Database Entry

```sql
INSERT INTO feature_flags (key, name, description, enabled, category)
VALUES (
  'my_feature_enabled',
  'My Feature',
  'Description of what this feature does',
  false,
  'dispatcher'
);
```

### 2. Add Marketing Content

Edit `/lib/config/comingSoonContent.ts`:

```typescript
export const comingSoonContent = {
  // ... existing content

  my_feature_enabled: {
    title: 'My Amazing Feature',
    description: 'Brief overview of what this feature provides',
    features: [
      'Benefit 1: What users will get',
      'Benefit 2: How it helps them',
      'Benefit 3: Why it matters',
    ],
  },
};
```

### 3. Wrap Your Page

```tsx
import { FeatureGuard } from '@/components/feature-flags/FeatureGuard';

export default function MyPage() {
  return (
    <FeatureGuard featureKey="my_feature_enabled">
      <MyPageContent />
    </FeatureGuard>
  );
}
```

### 4. Enable the Feature

Update the database when ready to launch:

```sql
UPDATE feature_flags
SET enabled = true
WHERE key = 'my_feature_enabled';
```

## Current Features

All features default to **disabled** in production:

### Dispatcher Features
- `route_planning_enabled` - Intelligent route planning
- `live_tracking_enabled` - Real-time route monitoring
- `command_center_enabled` - Mission control dashboard
- `alerts_system_enabled` - Automated dispatcher alerts
- `continuous_monitoring_enabled` - Background route monitoring

### Driver Features
- `driver_dashboard_enabled` - Driver portal
- `driver_current_route_enabled` - Route timeline view
- `driver_messages_enabled` - Driver-dispatcher messaging

### Admin Features
- `external_integrations_enabled` - TMS, ELD, fuel, weather APIs
- `fleet_management_enabled` - Driver/vehicle CRUD interface

## Architecture

```
┌─────────────┐
│  Database   │ ← Single source of truth
│ (PostgreSQL)│
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Backend   │ ← NestJS API endpoints
│  (NestJS)   │ ← Cached with Redis (30s)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Frontend   │ ← Zustand store
│   (Next.js) │ ← localStorage (5min cache)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│     UI      │ ← FeatureGuard wrapper
│ (Components)│ ← Coming Soon banners
└─────────────┘
```

## Best Practices

1. **Always use FeatureGuard for new features** - Don't add raw conditional checks
2. **Write compelling marketing content** - Users should understand what's coming
3. **Fail open, not closed** - If flag check fails, show content (don't block users)
4. **Cache aggressively** - Reduce API calls with localStorage + Redis
5. **Test both states** - Verify UI works with feature enabled AND disabled

## Troubleshooting

**Feature flag not updating?**
- Clear localStorage: `localStorage.removeItem('feature-flags-storage')`
- Check backend cache: Flags cached for 30s in Redis
- Force refetch: `useFeatureFlagsStore.getState().clearCache()`

**Coming Soon content not showing?**
- Verify feature key exists in `comingSoonContent.ts`
- Check console for warnings about missing content
- Fallback: Shows generic "Coming Soon" if no content found

**API errors?**
- Feature guard fails open (shows content on error)
- Check `NEXT_PUBLIC_API_URL` environment variable
- Verify backend is running on port 8000
