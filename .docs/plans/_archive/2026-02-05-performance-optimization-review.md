# Frontend Performance & Optimization Review
**Date:** 2026-02-05
**Scope:** apps/web (Next.js 15 App Router)
**Focus:** Bundle Size, Code Splitting, Rendering Performance

---

## Executive Summary

The frontend has **significant performance optimization opportunities**. While the codebase is well-structured, there are **critical issues** impacting bundle size and runtime performance.

### Key Findings

🔴 **Critical Issues:** 3
🟡 **Medium Issues:** 4
🟢 **Good Practices:** 2

### Estimated Impact

- **Bundle Size Reduction:** ~40-50% for largest route
- **Initial Load Time:** ~30-40% improvement
- **Runtime Performance:** ~20-30% improvement with memoization

---

## 🔴 Critical Performance Issues

### 1. Largest Route Has No Code Splitting (308 KB!)

**Impact:** CRITICAL | **Effort:** Low

**Problem:**
- `/dispatcher/create-plan` route: **308 KB** (3x larger than average)
- `RoutePlanningCockpit` component (heavy) loaded immediately
- All sub-components (Overview, Route, Costs tabs) loaded upfront
- User must download 308 KB even if they never use create-plan

**Current Bundle Analysis:**
```
Route (app)                                 Size  First Load JS
├ ○ /dispatcher/create-plan               117 kB         308 kB  ← CRITICAL
├ ○ /users                               10.1 kB         221 kB
├ ○ /login                               6.38 kB         220 kB
├ ○ /                                    12.3 kB         205 kB
├ ○ /drivers                             8.79 kB         181 kB
├ ○ /settings/preferences                2.61 kB         184 kB
└ ○ /driver/dashboard                    3.69 kB         159 kB
```

**Solution:**
Lazy load the `RoutePlanningCockpit` component:

```typescript
// ❌ Current (apps/web/src/app/dispatcher/create-plan/page.tsx)
import RoutePlanningCockpit from "@/components/route-planner/core/RoutePlanningCockpit";
import RoutePlanningCockpitSkeleton from "@/components/route-planner/core/RoutePlanningCockpitSkeleton";

// ✅ Optimized
import dynamic from 'next/dynamic';
const RoutePlanningCockpit = dynamic(
  () => import('@/components/route-planner/core/RoutePlanningCockpit'),
  {
    loading: () => <RoutePlanningCockpitSkeleton />,
    ssr: false // If map/charts don't need SSR
  }
);
```

**Expected Impact:**
- Route size: 308 KB → **~185 KB** (-40%)
- Cockpit only loads when user generates a plan
- Skeleton already exists for loading state

---

### 2. Recharts (Heavy Charting Library) Not Code-Split

**Impact:** CRITICAL | **Effort:** Low

**Problem:**
- `recharts` is a large charting library (~100 KB minified)
- Used only in `CostBreakdownChart.tsx` (Costs tab)
- Loaded even if user never views the Costs tab

**Current Import:**
```typescript
// src/components/route-planner/costs/CostBreakdownChart.tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
```

**Solution:**
Lazy load the chart component:

```typescript
// ❌ Current (RoutePlanningCockpit.tsx)
import CostsTab from "../costs/CostsTab";

// ✅ Optimized
import dynamic from 'next/dynamic';
const CostsTab = dynamic(() => import('../costs/CostsTab'), {
  loading: () => <div className="p-8 text-center">Loading costs...</div>,
  ssr: false
});
```

**Expected Impact:**
- Costs tab bundle: -100 KB when not used
- Only loads when user clicks "Costs" tab
- Progressive enhancement approach

---

### 3. Framer Motion Loaded on Every Page

**Impact:** HIGH | **Effort:** Medium

**Problem:**
- `framer-motion` is a large animation library (~50 KB)
- Used in **14 files** across the codebase
- Loaded on landing page, login, registration, alerts panel, chat

**Files Using Framer Motion:**
```
Landing Page Components (7 files):
- LandingPage.tsx
- AnimatedRoute.tsx
- FeatureCard.tsx
- MonitoringDashboard.tsx
- ComparisonRow.tsx
- ROICalculator.tsx
- ScrollReveal.tsx

Auth Components (3 files):
- LoginScreen.tsx
- login-form.tsx
- registration-form.tsx

Other (4 files):
- AlertsPanel.tsx
- FloatingSallyButton.tsx
- SallyChatPanel.tsx
- pending-approval/page.tsx
```

**Solution Options:**

**Option A: Conditional Loading (Recommended)**
Only load framer-motion for landing page and animations-heavy sections:

```typescript
// Landing page can keep it (marketing)
// Auth pages: Replace with CSS transitions

// ❌ Current (LoginScreen.tsx)
import { motion, AnimatePresence } from 'framer-motion';

// ✅ Optimized
// Use CSS transitions instead:
<div className="transition-opacity duration-300">
```

**Option B: Lazy Load Components with Animations**
```typescript
const AnimatedLoginForm = dynamic(() => import('@/components/auth/AnimatedLoginForm'), {
  ssr: false
});
```

**Expected Impact:**
- Auth pages: -50 KB per page
- Only landing page keeps framer-motion
- Faster login/register flow

---

## 🟡 Medium Performance Issues

### 4. Zero React Memoization in Route Planner

**Impact:** MEDIUM | **Effort:** Medium

**Problem:**
- **0 usages** of `React.memo`, `useMemo`, or `useCallback` in route-planner components
- Complex components re-render unnecessarily
- Timeline with 20+ segments re-renders entirely on any state change

**Example: FullyExpandedRouteTimeline**
```typescript
// ❌ Current: Re-renders on every parent update
export default function FullyExpandedRouteTimeline({ plan }: FullyExpandedRouteTimelineProps) {
  const { segments } = plan;

  return (
    <Card>
      {segments.map((segment, index) => (
        <div key={index}> {/* Renders all 20+ segments */}
          {/* ... */}
        </div>
      ))}
    </Card>
  );
}

// ✅ Optimized: Only re-renders when plan changes
import { memo, useMemo } from 'react';

export default memo(function FullyExpandedRouteTimeline({ plan }: FullyExpandedRouteTimelineProps) {
  const segments = useMemo(() => plan.segments, [plan.segments]);

  return (
    <Card>
      {segments.map((segment, index) => (
        <SegmentItem key={segment.sequence_order} segment={segment} /> {/* Use stable key */}
      ))}
    </Card>
  );
});

// Memoize segment item
const SegmentItem = memo(function SegmentItem({ segment }: { segment: RouteSegment }) {
  const display = useMemo(() => getSegmentDisplay(segment), [segment]);
  return <div>{/* ... */}</div>;
});
```

**Components Needing Memoization:**
1. `FullyExpandedRouteTimeline.tsx` - Renders 20+ segments
2. `VerticalCompactTimeline.tsx` - Similar issue
3. `HorizontalRouteTimeline.tsx` - Horizontal layout
4. `CostBreakdownChart.tsx` - Heavy chart rendering
5. `RouteKPICards.tsx` - Multiple KPI cards

**Expected Impact:**
- 50-70% reduction in unnecessary re-renders
- Smoother interactions in route planner
- Better perceived performance

---

### 5. Inline Arrow Functions in Render (Minor Anti-pattern)

**Impact:** LOW | **Effort:** Low

**Problem:**
- Inline arrow functions like `onClick={() => fn()}` create new function on every render
- Not a huge issue, but multiplied across many components

**Examples Found:**
```typescript
// src/components/route-planner/StopsManager.tsx
onClick={() => removeStop(stop.stop_id)}

// src/components/route-planner/overview/VerticalCompactTimeline.tsx
onClick={() => toggleExpand(index)}
```

**Solution:**
```typescript
// ❌ Current
<Button onClick={() => removeStop(stop.stop_id)}>

// ✅ Optimized
const handleRemove = useCallback(() => {
  removeStop(stop.stop_id);
}, [stop.stop_id, removeStop]);

<Button onClick={handleRemove}>
```

**When to Fix:**
- Components that re-render frequently
- Lists with many items
- Can skip for components that rarely re-render

---

### 6. No Virtualization for Long Lists

**Impact:** MEDIUM | **Effort:** Medium

**Problem:**
- `FullyExpandedRouteTimeline` renders all 20-30 segments in DOM
- No virtualization (only visible items should render)
- Becomes slow with 50+ segment routes

**Solution:**
Use a virtualization library like `react-window` or `@tanstack/react-virtual`:

```bash
npm install @tanstack/react-virtual
```

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export default function FullyExpandedRouteTimeline({ plan }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: plan.segments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated row height
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const segment = plan.segments[virtualRow.index];
          return (
            <div key={virtualRow.index} style={{ height: `${virtualRow.size}px` }}>
              <SegmentItem segment={segment} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Expected Impact:**
- Routes with 50+ segments: 70% faster rendering
- Smooth scrolling regardless of route length
- Lower memory usage

---

### 7. React Query Config Could Be Optimized

**Impact:** LOW | **Effort:** Low

**Current Config:**
```typescript
// src/app/providers.tsx
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
})
```

**Recommendations:**

```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes (most data doesn't change that fast)
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false, // ✅ Good
      refetchOnReconnect: 'always', // Refetch when connection restored
      retry: 1, // Only retry once (faster failure)
    },
    mutations: {
      retry: 0, // Don't retry mutations
    },
  },
})
```

**Per-Query Optimization:**
```typescript
// Loads change infrequently
useQuery({
  queryKey: ['loads'],
  queryFn: getLoads,
  staleTime: 10 * 60 * 1000, // 10 minutes
});

// Driver HOS changes frequently
useQuery({
  queryKey: ['driver-hos', driverId],
  queryFn: () => getDriverHOS(driverId),
  staleTime: 30 * 1000, // 30 seconds
  refetchInterval: 60 * 1000, // Poll every minute
});
```

---

## 🟢 Good Practices Found

### 1. Next.js App Router Static Generation
✅ All routes are statically generated (○ Static)
✅ No unnecessary server components
✅ Good use of client components with "use client"

### 2. Shared Bundle Optimization
✅ Shared chunks properly extracted (102 KB baseline)
✅ No obvious duplication in chunks

---

## Performance Optimization Roadmap

### Phase 1: Quick Wins (1-2 days)

**Priority: High | Effort: Low**

1. ✅ **Lazy load RoutePlanningCockpit** (-120 KB from create-plan route)
   ```typescript
   const RoutePlanningCockpit = dynamic(() => import('@/components/route-planner/core/RoutePlanningCockpit'));
   ```

2. ✅ **Lazy load CostsTab with Recharts** (-100 KB when not viewing costs)
   ```typescript
   const CostsTab = dynamic(() => import('../costs/CostsTab'), { ssr: false });
   ```

3. ✅ **Replace framer-motion with CSS in auth pages** (-50 KB from login/register)
   - Keep framer-motion only on landing page
   - Use CSS transitions for auth animations

**Expected Impact:**
- create-plan route: 308 KB → **~160 KB** (-48%)
- login route: 220 KB → **~170 KB** (-23%)

---

### Phase 2: Memoization (2-3 days)

**Priority: Medium | Effort: Medium**

4. ✅ **Add React.memo to timeline components**
   - `FullyExpandedRouteTimeline`
   - `VerticalCompactTimeline`
   - `HorizontalRouteTimeline`

5. ✅ **Memoize expensive calculations**
   - `getSegmentDisplay()` calls
   - `formatTime()` calls
   - Timeline sorting/filtering

6. ✅ **Use useCallback for event handlers**
   - In lists (StopsManager, timelines)
   - In modals/dialogs

**Expected Impact:**
- 50-70% fewer re-renders in route planner
- Smoother tab switching
- Better interaction performance

---

### Phase 3: Advanced (3-5 days)

**Priority: Low | Effort: High**

7. ✅ **Add virtualization for long lists**
   - Install `@tanstack/react-virtual`
   - Implement in timeline components
   - Test with 50+ segment routes

8. ✅ **Optimize React Query config**
   - Increase staleTime to 5 minutes
   - Add per-query optimizations
   - Implement background refetching

9. ✅ **Consider bundle analyzer**
   ```bash
   npm install @next/bundle-analyzer
   ```
   - Identify more optimization opportunities
   - Track bundle size over time

**Expected Impact:**
- Routes with 50+ segments: 70% faster
- Better cache hit rates
- Lower network usage

---

## Detailed Implementation: Phase 1 Quick Wins

### 1. Lazy Load RoutePlanningCockpit

**File:** `src/app/dispatcher/create-plan/page.tsx`

```typescript
// Add at top
import dynamic from 'next/dynamic';

// Replace static import
const RoutePlanningCockpit = dynamic(
  () => import('@/components/route-planner/core/RoutePlanningCockpit'),
  {
    loading: () => <RoutePlanningCockpitSkeleton />,
    ssr: false,
  }
);

// Remove this line:
// import RoutePlanningCockpit from "@/components/route-planner/core/RoutePlanningCockpit";
```

---

### 2. Lazy Load CostsTab

**File:** `src/components/route-planner/core/RoutePlanningCockpit.tsx`

```typescript
// Add at top
import dynamic from 'next/dynamic';

// Replace static import
const CostsTab = dynamic(() => import('../costs/CostsTab'), {
  loading: () => (
    <div className="p-8 text-center text-muted-foreground">
      Loading cost analysis...
    </div>
  ),
  ssr: false,
});

// Remove this line:
// import CostsTab from "../costs/CostsTab";
```

---

### 3. Replace Framer Motion in Auth Pages

**File:** `src/components/auth/LoginScreen.tsx`

**Before:**
```typescript
import { motion, AnimatePresence } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {/* content */}
</motion.div>
```

**After:**
```typescript
// Remove framer-motion import

<div className="animate-fade-up">
  {/* content */}
</div>

// Add to tailwind.config.ts (already exists):
// 'fade-up': 'fade-up 0.6s ease-out'
```

**Repeat for:**
- `login-form.tsx`
- `registration-form.tsx`

---

## Testing Performance Improvements

### Before Changes
```bash
npm run build
# Note the bundle sizes for:
# - /dispatcher/create-plan
# - /login
# - /register
```

### After Phase 1 Changes
```bash
npm run build
# Compare bundle sizes
# Expected:
# - /dispatcher/create-plan: 308 KB → ~160 KB
# - /login: 220 KB → ~170 KB
```

### Runtime Testing
```bash
npm run dev

# Test in browser with:
# 1. Chrome DevTools → Network tab → Throttle to "Fast 3G"
# 2. Chrome DevTools → Performance tab → Record page load
# 3. React DevTools → Profiler → Record interactions

# Key metrics to track:
# - First Contentful Paint (FCP)
# - Largest Contentful Paint (LCP)
# - Time to Interactive (TTI)
# - Bundle size downloaded before interaction
```

---

## Bundle Size Targets

| Route | Current | Target (Phase 1) | Target (Phase 2-3) |
|-------|---------|------------------|---------------------|
| /dispatcher/create-plan | 308 KB | 160 KB | 140 KB |
| /login | 220 KB | 170 KB | 150 KB |
| /register | 252 KB | 185 KB | 165 KB |
| / (landing) | 205 KB | 190 KB | 180 KB |

---

## Monitoring & Metrics

### Tools to Add

1. **Next.js Bundle Analyzer**
   ```bash
   npm install @next/bundle-analyzer
   ```
   ```js
   // next.config.ts
   const withBundleAnalyzer = require('@next/bundle-analyzer')({
     enabled: process.env.ANALYZE === 'true',
   });

   module.exports = withBundleAnalyzer(nextConfig);
   ```

2. **Web Vitals Tracking**
   Already have Next.js built-in, but can enhance:
   ```typescript
   // src/app/layout.tsx
   export function reportWebVitals(metric) {
     console.log(metric);
     // Send to analytics
   }
   ```

3. **React DevTools Profiler**
   - Already available in dev mode
   - Use to identify slow components

---

## Potential Future Optimizations

### Not Critical, But Worth Considering

1. **Image Optimization**
   - Use Next.js `<Image>` component for all images
   - Add proper width/height to prevent layout shift
   - Use `priority` prop for above-fold images

2. **Font Optimization**
   - Currently loading 3 font families (Space Grotesk, Sora, Outfit)
   - Consider reducing to 1-2 fonts
   - Use `next/font` for optimal loading (already done ✅)

3. **Tremor UI**
   - Used in dependencies but check actual usage
   - Consider if all Tremor components are needed
   - May be able to tree-shake unused components

4. **Service Worker / PWA**
   - Consider adding service worker for offline capability
   - Cache API responses for better offline experience

---

## Summary

### Critical Actions (Do This Week)

1. ✅ Lazy load `RoutePlanningCockpit` (1 hour)
2. ✅ Lazy load `CostsTab` with Recharts (30 min)
3. ✅ Replace framer-motion in auth pages with CSS (2 hours)

**Total Effort:** ~4 hours
**Expected Impact:**
- 40-50% bundle size reduction on key routes
- 30-40% faster initial page loads
- Better perceived performance

### Medium Priority (Next 1-2 Weeks)

4. Add React.memo to timeline components
5. Memoize expensive calculations
6. useCallback for event handlers

### Low Priority (Future)

7. Virtualization for long lists
8. React Query optimization
9. Bundle analyzer setup

---

## Questions for Discussion

1. **Phase 1 Timing:** Should we implement all Phase 1 optimizations now, or prioritize specific routes?

2. **Framer Motion Trade-off:** Landing page animations are nice, but we could replace with CSS for consistency. Worth it?

3. **Virtualization:** Do we expect routes with 50+ segments? If not, virtualization may be overkill.

4. **Testing Strategy:** Do you want manual testing or should we set up automated performance testing?

---

## Resources

- [Next.js Performance Docs](https://nextjs.org/docs/app/building-your-application/optimizing)
- [React Memo Guide](https://react.dev/reference/react/memo)
- [Bundle Size Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
- [React Virtual](https://tanstack.com/virtual/latest)
