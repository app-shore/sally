# Settings Restructuring: Preferences vs Route Planning Configuration

**Date:** January 30, 2026
**Status:** ✅ Implemented
**Impact:** Low (Frontend-only refactoring)

---

## What Changed

### Before
```
/settings/preferences
├── General Tab (UserPreferences - personal UI)
├── Route Planning Tab (DispatcherPreferences - tenant config)
└── Driver Tab (DriverPreferences - driver personal)
```

### After
```
/settings/preferences
├── General Tab (UserPreferences - personal UI)
└── Driver Tab (DriverPreferences - driver personal)

/settings/route-planning (NEW)
└── Route planning configuration (DispatcherPreferences - tenant-scoped)
```

---

## Why We Made This Change

### 1. Terminology Clarity
**Problem:** "Route Planning" settings were grouped under "Preferences", but these are organizational **configuration** settings, not personal **preferences**.

**Solution:** Separate into:
- **Preferences** = Personal UI settings (how you like to view things)
- **Route Planning** = Operational configuration (how routes are planned for the organization)

### 2. Scope Clarity
**Problem:** Route Planning settings are tenant-scoped (shared across all dispatchers), while preferences are user-scoped (personal to each user).

**Solution:** Different pages make the different scopes immediately obvious:
- Preferences page = "Your personal settings"
- Route Planning page = "Organization-wide configuration"

### 3. Scalability
**Problem:** Route Planning settings will grow significantly with features like:
- Route templates
- Customer-specific routing rules
- Geographic zone configurations
- Holiday/weather routing overrides
- Driver assignment rules

These don't belong in a "preferences" page.

**Solution:** Dedicated Route Planning Configuration page provides room for growth.

### 4. Navigation Consistency
**Problem:** Settings navigation had inconsistent URLs:
- Dispatcher Preferences pointed to `/settings` (incorrect)
- Other settings pointed to `/settings/fleet`, `/settings/integrations` (correct)

**Solution:** All settings now consistently use `/settings/*` pattern:
- `/settings/preferences` - Personal settings
- `/settings/route-planning` - Route planning config
- `/settings/fleet` - Fleet management
- `/settings/integrations` - External integrations

---

## What Didn't Change

### Backend (Zero Changes)
✅ Database schema unchanged
✅ API endpoints unchanged (`/api/v1/preferences/dispatcher` still works)
✅ Model names unchanged (`DispatcherPreferences` still valid)
✅ No breaking changes to contracts

**Rationale:** Backend naming is technically accurate. Only the frontend abstraction changed for UX clarity.

### API Client (Zero Changes)
✅ `/lib/api/preferences.ts` unchanged
✅ All API functions still work
✅ TypeScript interfaces unchanged

### Store (Zero Changes)
✅ `/lib/store/preferencesStore.ts` unchanged
✅ State management unchanged
✅ Action names unchanged

---

## Files Modified

### New Files (1)
1. `apps/web/src/app/settings/route-planning/page.tsx` - New route planning config page

### Modified Files (3)
1. `apps/web/src/app/settings/preferences/page.tsx` - Removed Route Planning tab
2. `apps/web/src/lib/navigation.ts` - Added Route Planning route, fixed URLs
3. `.specs/features/08-user-preferences/IMPLEMENTATION_COMPLETE.md` - Updated docs

### Component Changes
- `DispatcherPreferencesTab.tsx` - Still exists but no longer used in preferences page
- Could be refactored/removed in future cleanup (low priority)

---

## Navigation Updates

### Dispatcher Navigation
```typescript
{ label: 'Route Planning', href: '/settings/route-planning', icon: Route },
{ label: 'Fleet', href: '/settings/fleet', icon: Package },
{ label: 'Integrations', href: '/settings/integrations', icon: Plug },
{ label: 'Preferences', href: '/settings/preferences', icon: Settings },
```

### Driver Navigation
```typescript
{ label: 'Preferences', href: '/settings/preferences', icon: Settings },
```

### Admin Navigation
Same as dispatcher (includes Route Planning).

---

## Access Control

### Route Planning Page
- **Access:** Dispatchers and admins only
- **Behavior:** Redirects non-dispatchers to `/settings/preferences`
- **Implementation:** Client-side redirect using `useRouter`

### Preferences Page
- **Access:** All authenticated users
- **Tabs:**
  - General: Always visible
  - Driver: Only for driver role

---

## User Experience Impact

### For Dispatchers/Admins
**Before:**
- Navigate to Preferences → See 3 tabs → Click "Route Planning" tab

**After:**
- Navigate to Route Planning → See route planning config directly
- OR
- Navigate to Preferences → See personal settings only

**Benefit:** Clearer separation, faster access to route planning config

### For Drivers
**Before:**
- Navigate to Preferences → See 2 tabs (General, Driver)

**After:**
- Navigate to Preferences → See 2 tabs (General, Driver)

**Impact:** No change (Route Planning was never visible to drivers)

---

## Testing Performed

### Manual Testing
✅ Dispatcher can access `/settings/route-planning`
✅ Driver redirected from `/settings/route-planning` to `/settings/preferences`
✅ Admin can access `/settings/route-planning`
✅ Preferences page shows correct tabs for each role
✅ Navigation links point to correct URLs
✅ Save/Reset buttons work on both pages
✅ Dark theme works on both pages
✅ Responsive design works on both pages

### Type Checking
✅ TypeScript compilation passes (no new errors from restructuring)

---

## Future Enhancements

### Route Planning Page (Phase 2)
When route planning features expand, add sections for:
- Route templates
- Customer-specific routing rules
- Geographic zone configurations
- Holiday/weather routing overrides
- Driver assignment rules

### Preferences Page (Future)
Could potentially remove tabs if only 2 sections remain:
- Show UserPreferences and DriverPreferences as inline sections
- Simpler UX with less clicking

**Decision:** Keep tabs for now to maintain consistency with other settings pages.

---

## Rollback Plan

If issues arise:
1. Revert `apps/web/src/lib/navigation.ts` changes
2. Revert `apps/web/src/app/settings/preferences/page.tsx` changes
3. Delete `apps/web/src/app/settings/route-planning/page.tsx`
4. No database rollback needed
5. No API rollback needed

**Risk:** Very low (frontend-only, no breaking changes)

---

## Lessons Learned

### What Worked Well
1. **Frontend-only refactoring** - No backend changes = low risk
2. **Clear terminology** - "Configuration" vs "Preferences" resonates with users
3. **Incremental approach** - Didn't rename backend models, just improved UX
4. **Documentation first** - Writing this doc clarified the decision

### What Could Be Improved
1. Could have done this earlier (before tab structure was established)
2. DispatcherPreferencesTab component name is now misleading (could refactor)
3. Could add breadcrumbs to show page hierarchy

---

## Related Documentation

- `.specs/features/08-user-preferences/FEATURE_SPEC.md` - Feature specification
- `.specs/features/08-user-preferences/IMPLEMENTATION_COMPLETE.md` - Implementation details
- `.docs/DARK_THEME_IMPLEMENTATION.md` - UI guidelines followed

---

**Last Updated:** January 30, 2026
**Author:** Senior Product Owner + Engineering
