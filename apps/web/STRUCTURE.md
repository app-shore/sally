# Frontend Structure Guide
**Last Updated:** 2026-02-05
**Next.js Version:** 15 (App Router)

---

## 📁 Directory Overview

```
apps/web/src/
├── app/                    # Next.js App Router (pages & layouts)
├── components/             # React components
├── stores/                 # Zustand state management
├── lib/                    # Utilities, hooks, types, API clients
├── hooks/                  # Custom React hooks (shared)
└── styles/                 # Global styles
```

---

## 🗂️ Detailed Structure

### `/app` - Next.js App Router (Routes & Pages)

```
app/
├── layout.tsx              # Root layout (fonts, metadata, providers)
├── layout-client.tsx       # Client-side layout logic (auth routing)
├── providers.tsx           # React Query + Auth providers
├── page.tsx                # Landing page (/)
│
├── login/                  # Auth routes
│   └── page.tsx
├── register/
│   └── page.tsx
│
├── dispatcher/             # Dispatcher dashboard
│   ├── overview/           # Dashboard home
│   ├── create-plan/        # ⭐ Route planning (heaviest page)
│   └── active-routes/      # Monitor active routes
│
├── driver/                 # Driver mobile view
│   ├── dashboard/
│   ├── current-route/
│   └── messages/
│
├── (dashboard)/            # Route group (shared layout)
│   ├── drivers/            # Driver management
│   └── users/              # User management
│
├── (super-admin)/          # Super admin only
│   └── admin/
│       ├── tenants/        # Multi-tenant management
│       └── feature-flags/  # Feature flag controls
│
└── settings/               # Settings pages
    ├── fleet/
    ├── integrations/
    ├── operations/
    └── preferences/
```

**Critical Files:**
- `layout.tsx` - Root layout, metadata, font loading
- `providers.tsx` - React Query + Auth setup
- `dispatcher/create-plan/page.tsx` - Main route planning UI (lazy loaded)

---

### `/components` - React Components

```
components/
├── ui/                     # Shadcn UI primitives (32 components)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...                 # All Shadcn components
│
├── route-planner/          # ⭐ Route planning components (biggest module)
│   ├── core/               # Main containers
│   │   ├── RoutePlanningCockpit.tsx     # Tab container (lazy loaded)
│   │   ├── RoutePlanningCockpitSkeleton.tsx
│   │   └── RouteHeader.tsx
│   │
│   ├── overview/           # Overview tab
│   │   ├── OverviewTab.tsx
│   │   ├── RouteKPICards.tsx
│   │   ├── HorizontalRouteTimeline.tsx  # Memoized
│   │   └── VerticalCompactTimeline.tsx  # Memoized
│   │
│   ├── route/              # Route tab
│   │   └── FullyExpandedRouteTimeline.tsx  # Memoized
│   │
│   ├── costs/              # Costs tab (lazy loaded)
│   │   ├── CostsTab.tsx
│   │   ├── CostBreakdownChart.tsx  # Uses Recharts
│   │   ├── FuelStopDetails.tsx
│   │   └── EfficiencyMetrics.tsx
│   │
│   ├── shared/             # Reusable components
│   │   ├── LoadSelector.tsx
│   │   ├── DriverSelector.tsx
│   │   ├── VehicleSelector.tsx
│   │   ├── ComplianceStatus.tsx
│   │   └── segmentDetails.tsx
│   │
│   └── utils/              # Pure functions
│       └── routeTimelineUtils.ts
│
├── layout/                 # App layout components
│   ├── AppLayout.tsx       # Main app shell
│   ├── AppSidebar.tsx      # Navigation sidebar
│   ├── AppHeader.tsx       # Top header
│   ├── UserProfileMenu.tsx
│   ├── CommandPalette.tsx  # Cmd+K search
│   ├── ThemeToggle.tsx
│   └── AlertsPanel.tsx
│
├── auth/                   # Authentication
│   ├── LoginScreen.tsx
│   ├── login-form.tsx
│   ├── registration-form.tsx
│   └── accept-invitation-form.tsx
│
├── landing/                # Marketing landing page
│   ├── LandingPage.tsx
│   ├── FeatureCard.tsx
│   ├── ROICalculator.tsx
│   └── AnimatedRoute.tsx
│
├── drivers/                # Driver management
│   ├── driver-list.tsx
│   └── driver-activation-dialog.tsx
│
├── users/                  # User management
│   ├── user-list.tsx
│   └── invite-user-dialog.tsx
│
├── settings/               # Settings components
│   ├── IntegrationCard.tsx
│   ├── ConnectionsTab.tsx
│   └── ConfigureIntegrationForm.tsx
│
├── onboarding/             # Onboarding flow
│   ├── OnboardingWidget.tsx
│   ├── OnboardingBlocker.tsx
│   └── OnboardingItemCard.tsx
│
├── feature-flags/          # Feature flag system
│   ├── FeatureGuard.tsx
│   └── ComingSoonBanner.tsx
│
└── chat/                   # Sally AI chat
    ├── GlobalSallyChat.tsx
    ├── FloatingSallyButton.tsx
    └── SallyChatPanel.tsx
```

**Critical Components:**
- `route-planner/core/RoutePlanningCockpit.tsx` - Main planning interface (lazy loaded)
- `route-planner/costs/CostsTab.tsx` - Cost analysis with charts (lazy loaded)
- `layout/AppLayout.tsx` - Main app shell
- `ui/*` - All UI primitives (use these, not plain HTML)

---

### `/stores` - Zustand State Management

```
stores/
├── auth-store.ts           # ⭐ Authentication state (Firebase + JWT)
├── routePlanStore.ts       # ⭐ Route planning state (biggest store)
├── onboardingStore.ts      # Onboarding progress
├── featureFlagsStore.ts    # Feature flags
├── preferencesStore.ts     # User preferences
├── chatStore.ts            # Sally chat state
└── engineStore.ts          # Route engine state
```

**Critical Stores:**
- `auth-store.ts` - User auth, tokens, session management
- `routePlanStore.ts` - All route planning state (plan, stops, versions)

**Key Pattern:**
```typescript
// Stores own their mutations
export const useRoutePlanStore = create<Store>((set, get) => ({
  // State
  currentPlan: null,

  // Actions (mutations)
  addPlanWithSnapshot: (plan) => {
    // Business logic here
    set({ currentPlan: plan });
  },
}));
```

---

### `/lib` - Core Library Code

```
lib/
├── api/                    # API client modules (15 files)
│   ├── client.ts           # ⭐ Base API client (auth, error handling)
│   ├── routePlanning.ts    # Route planning endpoints
│   ├── auth.ts             # Authentication endpoints
│   ├── drivers.ts          # Driver management
│   ├── vehicles.ts         # Vehicle management
│   ├── loads.ts            # Load management
│   ├── scenarios.ts        # Scenario endpoints
│   ├── preferences.ts      # User preferences
│   ├── integrations.ts     # External integrations
│   ├── featureFlags.ts     # Feature flags
│   ├── onboarding.ts       # Onboarding
│   ├── alerts.ts           # Alert system
│   └── external.ts         # Mock external APIs
│
├── types/                  # TypeScript type definitions
│   ├── routePlan.ts        # ⭐ Route planning types
│   ├── driver.ts           # Driver types
│   ├── load.ts             # Load types
│   ├── scenario.ts         # Scenario types
│   ├── trigger.ts          # Route trigger types
│   ├── engine.ts           # Engine types
│   └── preferences.ts      # Preferences types
│
├── hooks/                  # Custom React hooks
│   ├── useRoutePlanning.ts # ⭐ Route planning operations
│   ├── useFeatureFlags.ts  # Feature flag access
│   ├── useFeatureGuard.ts  # Feature flag guards
│   └── useEngineRun.ts     # Engine execution
│
├── store/                  # [REMOVED - migrated to /stores]
│
├── config/                 # Configuration
│   └── comingSoonContent.ts
│
├── utils/                  # Utility functions
│   ├── formatters.ts       # Date, number, string formatters
│   └── validation.ts       # Form validation
│
├── validation/             # Validation schemas
│   └── schemas.ts          # Zod schemas
│
├── firebase.ts             # Firebase configuration
├── navigation.ts           # Navigation config (sidebar items)
└── utils.ts                # Generic utilities (cn, etc)
```

**Critical Files:**
- `api/client.ts` - Base API client (all requests go through this)
- `types/routePlan.ts` - Core route planning types
- `hooks/useRoutePlanning.ts` - React Query integration for planning
- `firebase.ts` - Firebase auth setup

---

### `/hooks` - Shared Custom Hooks

```
hooks/
├── use-auth.ts             # Auth state hook (wraps auth-store)
└── use-toast.ts            # Toast notifications
```

---

## 🎯 Critical Files Reference

### **Must Understand Files**

1. **`app/layout.tsx`**
   - Root layout, metadata, font loading
   - Providers setup (Theme, React Query, Auth)

2. **`app/providers.tsx`**
   - React Query configuration
   - Auth provider setup
   - **Recently optimized:** Increased staleTime to 5 minutes

3. **`stores/auth-store.ts`**
   - Firebase authentication
   - JWT token management
   - User session state

4. **`stores/routePlanStore.ts`**
   - Route planning state (plan, stops, versions)
   - Form validation
   - **Recently added:** `addPlanWithSnapshot()` action

5. **`lib/api/client.ts`**
   - Base API client
   - JWT token injection
   - Auto token refresh on 401

6. **`lib/hooks/useRoutePlanning.ts`**
   - React Query mutations for planning
   - Coordinates API calls + store updates
   - **Recently simplified:** Moved logic to store

7. **`components/route-planner/core/RoutePlanningCockpit.tsx`**
   - Main planning interface
   - Tab container (Overview, Route, Map, Costs)
   - **Recently optimized:** Lazy loaded, CostsTab lazy loaded

8. **`components/ui/*`**
   - Shadcn UI components
   - **ALWAYS use these** instead of plain HTML elements

---

## 📊 Bundle Size Breakdown

### Main Bundle (203 KB - Optimized)
```
+ First Load JS shared by all: 103 KB
  ├── React + Next.js core: ~50 KB
  ├── Zustand stores: ~10 KB
  ├── UI components: ~30 KB
  └── Utils + hooks: ~13 KB
```

### Page Bundles
```
/dispatcher/create-plan:     12 KB (page) + 203 KB (shared) = 215 KB
  + Lazy loaded chunks:
    - RoutePlanningCockpit:  ~100 KB (loads when plan generated)
    - CostsTab (Recharts):   ~60 KB (loads when Costs tab clicked)

/login:                      6 KB (page) + 220 KB (shared) = 226 KB
/register:                   9 KB (page) + 252 KB (shared) = 261 KB
```

---

## 🏗️ Architecture Patterns

### 1. **State Management**
```
Server State (React Query) → API calls, caching
    ↓
Client State (Zustand) → UI state, form data
    ↓
Components → Display, interactions
```

### 2. **Data Flow**
```
User Action
    ↓
Component calls hook (useRoutePlanning)
    ↓
Hook triggers React Query mutation
    ↓
Mutation calls API (lib/api/*)
    ↓
On success: Hook calls store action
    ↓
Store updates state
    ↓
Components re-render (with memoization)
```

### 3. **Code Splitting**
```
Initial Load (203 KB)
    ↓
User generates plan → Load cockpit (~100 KB)
    ↓
User clicks Costs tab → Load charts (~60 KB)
```

---

## 🎨 UI Component Guidelines

### Always Use Shadcn Components

```typescript
// ❌ WRONG - Plain HTML
<button className="...">Click</button>
<input type="text" />
<div className="border rounded p-4">Card</div>

// ✅ CORRECT - Shadcn Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

<Button>Click</Button>
<Input type="text" />
<Card>Content</Card>
```

### Color System
```typescript
// Background colors
bg-background        // Main page background
bg-card             // Card/panel backgrounds
bg-muted            // Muted backgrounds

// Text colors
text-foreground          // Primary text
text-muted-foreground    // Secondary text

// Borders
border-border       // Standard borders

// ALWAYS support dark mode
bg-gray-50 dark:bg-gray-900
text-gray-900 dark:text-gray-100
```

---

## 🚀 Performance Best Practices

### 1. Lazy Loading (Implemented)
```typescript
// Heavy components
const RoutePlanningCockpit = dynamic(() => import('./RoutePlanningCockpit'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

### 2. Memoization (Implemented)
```typescript
// Expensive components
export default memo(FullyExpandedRouteTimeline);

// Expensive calculations
const segments = useMemo(() => plan.segments, [plan.segments]);

// Event handlers
const handleClick = useCallback(() => {...}, [deps]);
```

### 3. React Query (Optimized)
```typescript
// Server state caching
staleTime: 5 * 60 * 1000,  // 5 minutes
gcTime: 10 * 60 * 1000,     // 10 minutes
retry: 1,                   // Fast failure
```

---

## 📝 Quick Reference

### Adding a New Page
1. Create `app/my-route/page.tsx`
2. Add to navigation in `lib/navigation.ts`
3. Add route guard if needed in `layout-client.tsx`

### Adding a New API Endpoint
1. Add function to appropriate file in `lib/api/`
2. Define types in `lib/types/`
3. Create hook if needed in `lib/hooks/`

### Adding a New Store
1. Create file in `stores/`
2. Define interface with state + actions
3. Use Zustand `create()` pattern
4. Export hook

### Using Existing Components
1. Check `components/ui/` first (Shadcn)
2. Then check feature folders (`route-planner/`, `layout/`, etc.)
3. Import and use (they're all memoized/optimized)

---

## 🔍 Finding Things Quickly

### "Where is the route planning UI?"
→ `components/route-planner/core/RoutePlanningCockpit.tsx`

### "Where is authentication handled?"
→ `stores/auth-store.ts` + `lib/api/auth.ts`

### "Where are API calls made?"
→ `lib/api/*` (15 modules)

### "Where is the sidebar navigation?"
→ `components/layout/AppSidebar.tsx` + `lib/navigation.ts`

### "Where are types defined?"
→ `lib/types/*` (7 type files)

### "Where is the main layout?"
→ `app/layout.tsx` (root) + `components/layout/AppLayout.tsx`

---

## 📚 Key Dependencies

```json
{
  "next": "15.1.3",              // Framework
  "react": "18.3.1",             // UI library
  "zustand": "5.0.2",            // State management
  "@tanstack/react-query": "5.62.9",  // Server state
  "firebase": "12.8.0",          // Authentication
  "recharts": "2.15.0",          // Charts (lazy loaded)
  "framer-motion": "12.29.2",    // Animations
  "tailwindcss": "3.4.17",       // Styling
  "next-themes": "0.4.6",        // Dark mode
  "@radix-ui/*": "various",      // Shadcn UI primitives
}
```

---

## ✅ Recent Optimizations (2026-02-05)

1. **Consolidated stores** → Single `/stores` directory
2. **Removed dead code** → session.ts, empty directories
3. **Lazy loading** → Cockpit (-105 KB), Charts (-60 KB)
4. **Memoization** → Timeline components (50-70% fewer re-renders)
5. **Type safety** → Zero `Promise<any>`, all APIs typed
6. **React Query** → Optimized cache config

**Result:** 308 KB → 203 KB (-34%) on main route planning page

---

## 🎯 Summary

**Frontend is organized by:**
- **`/app`** - Pages (Next.js routes)
- **`/components`** - UI components (feature-based)
- **`/stores`** - State management (Zustand)
- **`/lib`** - Utilities (API, hooks, types, utils)

**Key concepts:**
- Use Shadcn components, never plain HTML
- React Query for server state, Zustand for client state
- Lazy load heavy components
- Memoize expensive renders
- Support dark mode always
