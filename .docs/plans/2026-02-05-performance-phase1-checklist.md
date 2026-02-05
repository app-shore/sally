# Performance Optimization Phase 1: Quick Wins Checklist

**Estimated Time:** 3-4 hours
**Expected Impact:** 40-50% bundle size reduction on key routes

---

## Task 1: Lazy Load RoutePlanningCockpit
**File:** `src/app/dispatcher/create-plan/page.tsx`
**Time:** 30 minutes
**Impact:** -120 KB from create-plan route

### Changes

1. **Add dynamic import at top:**
```typescript
import dynamic from 'next/dynamic';

const RoutePlanningCockpit = dynamic(
  () => import('@/components/route-planner/core/RoutePlanningCockpit'),
  {
    loading: () => <RoutePlanningCockpitSkeleton />,
    ssr: false,
  }
);
```

2. **Remove static import:**
```typescript
// DELETE THIS LINE:
import RoutePlanningCockpit from "@/components/route-planner/core/RoutePlanningCockpit";
```

3. **Test:**
- [ ] Page loads without errors
- [ ] Skeleton shows while cockpit loads
- [ ] Cockpit renders correctly after loading
- [ ] Check bundle size: `npm run build`

---

## Task 2: Lazy Load CostsTab (with Recharts)
**File:** `src/components/route-planner/core/RoutePlanningCockpit.tsx`
**Time:** 30 minutes
**Impact:** -100 KB when not viewing costs

### Changes

1. **Add dynamic import at top:**
```typescript
import dynamic from 'next/dynamic';

const CostsTab = dynamic(() => import('../costs/CostsTab'), {
  loading: () => (
    <div className="p-8 text-center text-muted-foreground">
      Loading cost analysis...
    </div>
  ),
  ssr: false,
});
```

2. **Remove static import:**
```typescript
// DELETE THIS LINE:
import CostsTab from "../costs/CostsTab";
```

3. **Test:**
- [ ] Overview tab loads immediately
- [ ] Route tab loads immediately
- [ ] Costs tab shows loading state
- [ ] Costs tab renders correctly after loading
- [ ] Chart displays properly

---

## Task 3: Replace Framer Motion in Auth Pages
**Files:** 3 files
**Time:** 2-3 hours
**Impact:** -50 KB from login/register

### File 1: LoginScreen.tsx

**Before:**
```typescript
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence mode="wait">
  {step === 'email' && (
    <motion.div
      key="email"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
```

**After:**
```typescript
// Remove framer-motion import

<div className={`transition-opacity duration-300 ${step === 'email' ? 'opacity-100' : 'opacity-0 hidden'}`}>
```

**Changes:**
- [ ] Remove framer-motion imports
- [ ] Replace `<motion.div>` with `<div className="animate-fade-up">`
- [ ] Replace `<AnimatePresence>` with conditional rendering
- [ ] Test animations still work smoothly

### File 2: login-form.tsx

**Changes:**
- [ ] Remove framer-motion imports
- [ ] Replace motion components with CSS transitions
- [ ] Test form animations

### File 3: registration-form.tsx

**Changes:**
- [ ] Remove framer-motion imports
- [ ] Replace motion components with CSS transitions
- [ ] Test multi-step form transitions

### CSS Utilities (Already in Tailwind Config)

Check `tailwind.config.ts` has these animations:
```typescript
animation: {
  'fade-up': 'fade-up 0.6s ease-out',
  'fade-in': 'fade-in 0.6s ease-out',
}
```

---

## Testing Checklist

### Bundle Size Test
```bash
# Before changes
npm run build
# Note sizes for:
# - /dispatcher/create-plan (currently 308 KB)
# - /login (currently 220 KB)
# - /register (currently 252 KB)

# After Phase 1 changes
npm run build
# Expected sizes:
# - /dispatcher/create-plan: ~160 KB (-48%)
# - /login: ~170 KB (-23%)
# - /register: ~185 KB (-27%)
```

### Functional Test

**Route Planning:**
- [ ] Navigate to `/dispatcher/create-plan`
- [ ] Page loads quickly
- [ ] Skeleton shows before cockpit
- [ ] Select load, driver, vehicle
- [ ] Generate plan
- [ ] Cockpit renders with Overview tab
- [ ] Switch to Route tab (should load immediately)
- [ ] Switch to Costs tab (should show loading, then chart)

**Authentication:**
- [ ] Navigate to `/login`
- [ ] Animations are smooth (CSS transitions)
- [ ] Email lookup works
- [ ] Tenant selection works (if multi-tenant)
- [ ] Login completes successfully

**Registration:**
- [ ] Navigate to `/register`
- [ ] Multi-step form transitions smoothly
- [ ] All steps complete
- [ ] Registration works

### Performance Test

**Chrome DevTools:**
1. Open Network tab
2. Throttle to "Fast 3G"
3. Navigate to `/dispatcher/create-plan`
4. Check:
   - [ ] Cockpit chunk loads only when needed
   - [ ] Recharts loads only when Costs tab clicked
   - [ ] Total JS downloaded before interaction

**Lighthouse:**
```bash
# Run Lighthouse audit
npm run build && npm start
# Then in Chrome: DevTools → Lighthouse → Analyze page load
```

**Target Metrics:**
- Performance Score: > 85
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Total Blocking Time: < 200ms

---

## Expected Before/After

### Bundle Analysis

**Before:**
```
Route (app)                                 Size  First Load JS
├ ○ /dispatcher/create-plan               117 kB         308 kB
├ ○ /login                               6.38 kB         220 kB
├ ○ /register                            8.65 kB         252 kB
```

**After:**
```
Route (app)                                 Size  First Load JS
├ ○ /dispatcher/create-plan              ~50 kB         ~160 kB  (-48%)
├ ○ /login                              ~5 kB          ~170 kB  (-23%)
├ ○ /register                           ~6 kB          ~185 kB  (-27%)
```

### Network Waterfall (Fast 3G)

**Before:**
- Time to Interactive: ~4.5s
- JS Downloaded: 308 KB
- Parse Time: ~800ms

**After:**
- Time to Interactive: ~2.8s (-38%)
- JS Downloaded: 160 KB (-48%)
- Parse Time: ~400ms (-50%)

---

## Rollback Plan

If issues arise:

```bash
git log --oneline -5  # Find commit hash
git revert <commit-hash>
```

Or revert specific files:
```bash
git checkout HEAD~1 -- src/app/dispatcher/create-plan/page.tsx
git checkout HEAD~1 -- src/components/route-planner/core/RoutePlanningCockpit.tsx
git checkout HEAD~1 -- src/components/auth/LoginScreen.tsx
```

---

## Success Criteria

✅ **Must Have:**
- [ ] Bundle size reduced by at least 35% on create-plan route
- [ ] All features work exactly as before
- [ ] No console errors or warnings
- [ ] Animations are smooth (CSS or lazy-loaded framer-motion)

✅ **Nice to Have:**
- [ ] Lighthouse performance score > 85
- [ ] First Contentful Paint < 1.8s
- [ ] Subjectively "feels faster"

---

## Next Steps After Phase 1

Once Phase 1 is complete and tested:

1. **Document Results**
   - Update performance review with actual measurements
   - Screenshot before/after bundle analysis
   - Record performance metrics

2. **Plan Phase 2**
   - Memoization (React.memo, useMemo, useCallback)
   - Timeline component optimization
   - Event handler optimization

3. **Consider Phase 3**
   - Virtualization (if needed for 50+ segment routes)
   - React Query optimization
   - Bundle analyzer setup
