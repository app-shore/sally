# User Preferences - Feature Specification

**Status:** Planning
**Priority:** P1 (High Impact, Medium Effort)
**Target Release:** POC Phase 2
**Estimated Effort:** 32-40 hours (~1 week sprint)
**Last Updated:** 2026-01-30

---

## Executive Summary

User Preferences enables dispatchers, drivers, and administrators to customize SALLY's behavior, display formats, and operational defaults without requiring code changes. This feature addresses the reality that different fleets operate under different regulations, have different optimization priorities, and prefer different units of measurement and notification methods.

**Why It Matters:**
- **Flexibility:** Different fleets follow different HOS rules (US FMCSA, Canadian, exempt categories)
- **Optimization Alignment:** Some fleets prioritize cost reduction, others prioritize delivery speed
- **Alert Fatigue:** Dispatchers need control over what triggers notifications and when
- **User Experience:** Drivers and dispatchers have different display preferences (units, formats, timezone)
- **Accessibility:** Users need font size, contrast, and motion controls for inclusive access

**Key Achievement:**
Users can configure SALLY to match their fleet's operational policies, regulatory environment, and personal preferences—transforming a generic system into a tailored dispatch platform.

**Target Personas:**
- **Fleet Dispatchers:** Configure HOS defaults, optimization priorities, alert thresholds
- **Owner-Operators/Drivers:** Set display preferences, notification methods, favorite locations
- **Fleet Administrators:** Manage system-wide defaults and compliance standards

---

## Design Principles

### 1. Sensible Defaults with Easy Customization
All preferences must have production-ready defaults that work out-of-the-box. Users should only customize when they have specific needs—not as a prerequisite to using the system.

### 2. Role-Appropriate Settings
Preferences are scoped by role:
- **User Preferences (All Roles):** Display formats, dashboard layout, accessibility
- **Dispatcher Preferences (Dispatcher/Admin):** HOS defaults, optimization, alert thresholds
- **Driver Preferences (Driver Role):** Break preferences, favorite locations, mobile settings

### 3. Immediate Application
Preference changes apply immediately to the current session without requiring logout/login. Changes persist across sessions via database storage.

### 4. Non-Invasive Validation
Validate preferences silently in the background. Only surface errors when user attempts to save invalid data. Provide helpful error messages (not generic "Invalid input").

### 5. Integration Over Isolation
Preferences aren't just stored—they're actively applied throughout the system:
- Route planner uses optimization defaults
- Alert system respects notification preferences
- Dashboard applies display format preferences
- All components use formatters for unit conversion

---

## Key Features

### Feature 1: User Preferences (All Roles)

**Purpose:** Configure display formats, dashboard behavior, and accessibility settings.

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Preferences > General                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─── Display Preferences ────────────────────────────────┐ │
│ │                                                         │ │
│ │  Distance Unit:       [Miles ▼]                        │ │
│ │  Time Format:         [12-hour (AM/PM) ▼]             │ │
│ │  Temperature:         [Fahrenheit (°F) ▼]             │ │
│ │  Currency:            [USD ($) ▼]                      │ │
│ │  Timezone:            [America/New_York ▼]            │ │
│ │  Date Format:         [MM/DD/YYYY ▼]                  │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Dashboard Preferences ──────────────────────────────┐ │
│ │                                                         │ │
│ │  Auto-Refresh:        [Every 30 seconds ▼]            │ │
│ │  Default View:        [Overview ▼]                     │ │
│ │  Compact Mode:        [Off]  (Toggle)                  │ │
│ │  High Contrast:       [Off]  (Toggle)                  │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Alert Preferences ──────────────────────────────────┐ │
│ │                                                         │ │
│ │  Notification Methods:                                  │ │
│ │    [✓] In-App Alerts                                   │ │
│ │    [ ] Email Notifications                             │ │
│ │    [ ] SMS Alerts                                      │ │
│ │                                                         │ │
│ │  Minimum Priority:    [Medium ▼]                       │ │
│ │                                                         │ │
│ │  Alert Categories:                                      │ │
│ │    [✓] HOS Violations    [✓] Route Delays             │ │
│ │    [✓] Vehicle Issues    [✓] Weather Alerts           │ │
│ │                                                         │ │
│ │  Quiet Hours:                                          │ │
│ │    Start: [22:00]   End: [06:00]                      │ │
│ │    (Notifications muted during quiet hours)            │ │
│ │                                                         │ │
│ │  Email Digest:        [Never ▼]                        │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Accessibility ──────────────────────────────────────┐ │
│ │                                                         │ │
│ │  Font Size:           [Medium ▼]                       │ │
│ │  Reduce Motion:       [Off]  (Toggle)                  │ │
│ │  Screen Reader Mode:  [Off]  (Toggle)                  │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                      [Reset to Defaults]  [Save Changes]    │
└─────────────────────────────────────────────────────────────┘
```

**Implementation Notes:**
- Use `Select` component from Shadcn UI for dropdowns
- Use `Switch` component for toggles
- Use `Input` with type="time" for quiet hours
- Use `Checkbox` for multi-select categories
- All fields load current values from `UserPreferences` model
- Save button enabled only when changes detected (dirty state)

---

### Feature 2: Dispatcher Preferences (Dispatcher/Admin Only)

**Purpose:** Configure HOS defaults, optimization priorities, and operational thresholds.

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Preferences > Dispatcher                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─── HOS Defaults ───────────────────────────────────────┐ │
│ │                                                         │ │
│ │  Default Driver State:                                  │ │
│ │    Drive Hours:       [0.0] ────────────── [11.0]      │ │
│ │                       (Currently: 0.0 hours)            │ │
│ │                                                         │ │
│ │    On-Duty Hours:     [0.0] ────────────── [14.0]      │ │
│ │                       (Currently: 0.0 hours)            │ │
│ │                                                         │ │
│ │    Since-Break:       [0.0] ────────────── [8.0]       │ │
│ │                       (Currently: 0.0 hours)            │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Compliance Thresholds ──────────────────────────────┐ │
│ │                                                         │ │
│ │  Drive Hours Progress Bars:                            │ │
│ │    Warning (Yellow):  [75]%                            │ │
│ │    Critical (Red):    [90]%                            │ │
│ │                                                         │ │
│ │  On-Duty Hours Progress Bars:                          │ │
│ │    Warning (Yellow):  [75]%                            │ │
│ │    Critical (Red):    [90]%                            │ │
│ │                                                         │ │
│ │  Since-Break Progress Bars:                            │ │
│ │    Warning (Yellow):  [75]%                            │ │
│ │    Critical (Red):    [90]%                            │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Optimization Defaults ──────────────────────────────┐ │
│ │                                                         │ │
│ │  Default Mode:        [Balance ▼]                      │ │
│ │                       (Minimize Time | Minimize Cost)   │ │
│ │                                                         │ │
│ │  Cost Per Mile:       [$1.85]                          │ │
│ │  Labor Cost/Hour:     [$25.00]                         │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Rest Insertion Rules ───────────────────────────────┐ │
│ │                                                         │ │
│ │  Prefer Full Rest (10h):     [On]  (Toggle)           │ │
│ │  Allow Dock Rest:            [On]  (Toggle)           │ │
│ │  Rest Stop Buffer:           [30] minutes              │ │
│ │  Minimum Rest Duration:      [7] hours                 │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Fuel Stop Rules ────────────────────────────────────┐ │
│ │                                                         │ │
│ │  Max Fuel Detour:            [10] miles                │ │
│ │  Fuel Price Threshold:       [$0.15] /gallon           │ │
│ │  Min Savings to Detour:      [$10.00]                  │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Alert Thresholds ───────────────────────────────────┐ │
│ │                                                         │ │
│ │  Delay Alert Trigger:        [30] minutes late         │ │
│ │  HOS Approaching Alert:      [85]% of limit            │ │
│ │  Cost Overrun Alert:         [10]% over budget         │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                      [Reset to Defaults]  [Save Changes]    │
└─────────────────────────────────────────────────────────────┘
```

**Implementation Notes:**
- Use `Slider` component for HOS hour inputs (0-11, 0-14, 0-8 ranges)
- Use `Input` type="number" for percentage and currency fields
- Validate: Warning % must be < Critical %
- Validate: Minimum rest must be 7 or 10 (per FMCSA rules)
- Validate: All numeric fields must be positive

---

### Feature 3: Driver Preferences (Driver Role Only)

**Purpose:** Configure personal preferences for route execution and mobile app usage.

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Preferences > Driver                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─── Preferred Locations ────────────────────────────────┐ │
│ │                                                         │ │
│ │  Favorite Rest Stops:                                   │ │
│ │    🅿️  Love's Travel Stop - Exit 45, I-80             │ │
│ │    🅿️  Pilot Flying J - Exit 102, I-70                │ │
│ │    [+ Add Favorite Rest Stop]                          │ │
│ │                                                         │ │
│ │  Favorite Fuel Stops:                                   │ │
│ │    ⛽ TA Truck Stop - Exit 89, I-40                     │ │
│ │    [+ Add Favorite Fuel Stop]                          │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Break Preferences ──────────────────────────────────┐ │
│ │                                                         │ │
│ │  Preferred Break Duration:   [30] minutes              │ │
│ │  Break Reminder Advance:     [30] minutes              │ │
│ │    (Alert me 30 min before HOS limit)                  │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Route Display ──────────────────────────────────────┐ │
│ │                                                         │ │
│ │  Timeline View:        [Vertical ▼]                    │ │
│ │                        (Horizontal | Vertical)          │ │
│ │                                                         │ │
│ │  Show Rest Reasoning:  [On]  (Toggle)                  │ │
│ │    (Show why rest stops were inserted)                 │ │
│ │                                                         │ │
│ │  Show Cost Details:    [Off] (Toggle)                  │ │
│ │    (Hide cost information from route view)             │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Mobile Preferences ─────────────────────────────────┐ │
│ │                                                         │ │
│ │  Large Text Mode:      [Off] (Toggle)                  │ │
│ │  Offline Mode:         [Off] (Toggle)                  │ │
│ │  Data Usage:           [Normal ▼]                      │ │
│ │                        (Low | Normal | High)            │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Emergency Contact ──────────────────────────────────┐ │
│ │                                                         │ │
│ │  Phone Number:         [(555) 123-4567]                │ │
│ │  Preferred Contact:    [In-App ▼]                      │ │
│ │                        (In-App | SMS | Phone Call)      │ │
│ │  Language:             [English (US) ▼]                │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                      [Reset to Defaults]  [Save Changes]    │
└─────────────────────────────────────────────────────────────┘
```

**Implementation Notes:**
- Favorite locations stored as JSON array: `[{name, lat, lng, amenities}]`
- Use Dialog component for adding favorite locations (with map picker)
- Phone number validation with proper formatting
- Language selector supports i18n (Phase 2 feature)

---

## Technical Implementation

### Database Schema Changes

**New Models:**

1. **UserPreferences** (1:1 with User)
   - All display, dashboard, alert, and accessibility preferences
   - Applied to all roles
   - 17 fields total

2. **DispatcherPreferences** (1:1 with User, Dispatcher/Admin only)
   - HOS defaults, compliance thresholds, optimization defaults
   - Rest and fuel insertion rules
   - Alert thresholds
   - 25 fields total

3. **DriverPreferences** (1:1 with User, Driver only)
   - Favorite locations (JSON arrays)
   - Break preferences
   - Route display preferences
   - Mobile and communication preferences
   - 12 fields total

**Schema Relations:**
```prisma
model User {
  // ... existing fields
  preferences               UserPreferences?
  dispatcherPreferences     DispatcherPreferences?
  driverPreferences         DriverPreferences?
}

model Driver {
  // ... existing fields
  driverPreferences         DriverPreferences?
}
```

**Indexes:**
- `UserPreferences.userId` (unique, indexed)
- `DispatcherPreferences.userId` (unique, indexed)
- `DriverPreferences.userId` (unique, indexed)
- `DriverPreferences.driverId` (indexed, nullable)

---

### Backend API Changes

**New Module:** `apps/backend/src/api/preferences/`

**New Files:**
- `preferences.controller.ts` (8 endpoints)
- `preferences.service.ts` (12 methods)
- `preferences.module.ts` (NestJS module configuration)
- `dto/user-preferences.dto.ts` (Validation DTOs)
- `dto/dispatcher-preferences.dto.ts`
- `dto/driver-preferences.dto.ts`

**API Endpoints:**
```
GET    /api/v1/preferences/user          → Get user preferences
PUT    /api/v1/preferences/user          → Update user preferences
GET    /api/v1/preferences/dispatcher    → Get dispatcher preferences (role check)
PUT    /api/v1/preferences/dispatcher    → Update dispatcher preferences (role check)
GET    /api/v1/preferences/driver        → Get driver preferences (role check)
PUT    /api/v1/preferences/driver        → Update driver preferences (role check)
POST   /api/v1/preferences/reset         → Reset to defaults
GET    /api/v1/preferences/defaults      → Get system defaults
```

**Service Methods:**
- `getUserPreferences(userId)` - Get or create with defaults
- `updateUserPreferences(userId, dto)` - Validate and update
- `getDispatcherPreferences(userId)` - Fetch dispatcher settings
- `updateDispatcherPreferences(userId, dto)` - Update with validation
- `getDriverPreferences(userId)` - Fetch driver settings
- `updateDriverPreferences(userId, dto)` - Update with validation
- `resetToDefaults(userId, scope)` - Reset specific preference set
- `validatePreferences(dto)` - Business rule validation
- `getSystemDefaults()` - Return schema defaults

**Validation Rules:**
- Warning % must be less than Critical %
- Quiet hours end must be after start (or next day)
- Alert methods array must not be empty
- Minimum rest duration must be 7 or 10 hours
- All percentage fields: 0-100 range
- All currency fields: positive numbers
- All duration fields: positive integers

---

### Frontend Implementation

**New Files Created:**

1. **Page:**
   - `apps/web/src/app/settings/preferences/page.tsx` (Main preferences page with tabs)

2. **Tab Components:**
   - `apps/web/src/app/settings/preferences/components/UserPreferencesTab.tsx`
   - `apps/web/src/app/settings/preferences/components/DispatcherPreferencesTab.tsx`
   - `apps/web/src/app/settings/preferences/components/DriverPreferencesTab.tsx`

3. **Preference Section Components:**
   - `apps/web/src/components/preferences/DisplayPreferences.tsx`
   - `apps/web/src/components/preferences/DashboardPreferences.tsx`
   - `apps/web/src/components/preferences/AlertPreferences.tsx`
   - `apps/web/src/components/preferences/AccessibilityPreferences.tsx`
   - `apps/web/src/components/preferences/HOSDefaults.tsx` (Dispatcher only)
   - `apps/web/src/components/preferences/OptimizationDefaults.tsx` (Dispatcher only)
   - `apps/web/src/components/preferences/FavoriteLocations.tsx` (Driver only)
   - `apps/web/src/components/preferences/PreferenceSection.tsx` (Reusable wrapper)

4. **State Management:**
   - `apps/web/src/lib/store/preferencesStore.ts` (Zustand store)

5. **API Client:**
   - `apps/web/src/lib/api/preferences.ts` (Fetch functions)

6. **Utilities:**
   - `apps/web/src/lib/utils/formatters.ts` (Distance, time, currency formatters)

**Files Modified:**

1. **Route Planning Integration:**
   - `apps/web/src/app/dispatcher/create-plan/page.tsx`
     - Load dispatcher preferences on mount
     - Auto-populate optimization mode dropdown
     - Auto-populate HOS state sliders
     - Apply cost defaults

2. **Alert System Integration:**
   - `apps/web/src/components/route-planner/core/AlertsPanel.tsx`
     - Filter by minimum priority preference
     - Filter by enabled alert categories
     - Apply quiet hours suppression
     - Use preferred notification methods

3. **Dashboard Integration:**
   - `apps/web/src/components/route-planner/overview/RouteKPICards.tsx`
   - `apps/web/src/components/route-planner/timeline/TimelineTab.tsx`
   - `apps/web/src/components/route-planner/costs/CostsTab.tsx`
   - All components apply formatters for distance, time, currency

4. **Driver Route View:**
   - `apps/web/src/app/driver/route/[planId]/page.tsx`
     - Apply timeline view preference
     - Apply font size preference
     - Hide/show cost details based on preference

---

## Implementation Sequence

### Week 1: Backend Foundation (16 hours)

**Day 1: Database Schema (4 hours)**
- [ ] Add `UserPreferences` model to Prisma schema
- [ ] Add `DispatcherPreferences` model
- [ ] Add `DriverPreferences` model
- [ ] Add relations to `User` and `Driver` models
- [ ] Create migration: `npx prisma migrate dev --name add_user_preferences`
- [ ] Update seed script to create default preferences for existing users
- [ ] Test migration rollback/rollforward

**Day 2: Backend API - Part 1 (4 hours)**
- [ ] Create DTOs with validation decorators
- [ ] Create `PreferencesService` with CRUD methods
- [ ] Implement `getUserPreferences` with auto-create defaults
- [ ] Implement `updateUserPreferences` with validation
- [ ] Write unit tests for service methods

**Day 3: Backend API - Part 2 (4 hours)**
- [ ] Implement dispatcher preferences CRUD
- [ ] Implement driver preferences CRUD
- [ ] Implement reset to defaults
- [ ] Add role-based access control guards
- [ ] Write integration tests for all endpoints

**Day 4: Backend API - Part 3 (4 hours)**
- [ ] Create `PreferencesController` with 8 endpoints
- [ ] Create `PreferencesModule` and register dependencies
- [ ] Test all endpoints with Postman/REST client
- [ ] Verify multi-tenant isolation
- [ ] Verify role-based access enforcement

---

### Week 2: Frontend Implementation (16 hours)

**Day 5: State Management & API Client (4 hours)**
- [ ] Create `preferencesStore.ts` with Zustand
- [ ] Create `preferences.ts` API client (8 fetch functions)
- [ ] Create `formatters.ts` utility (distance, time, currency)
- [ ] Write tests for formatters
- [ ] Test store persistence

**Day 6: Preferences UI - Part 1 (4 hours)**
- [ ] Create preferences page with Tabs component
- [ ] Create `UserPreferencesTab` layout
- [ ] Create `DisplayPreferences` component
- [ ] Create `DashboardPreferences` component
- [ ] Test loading preferences from API

**Day 7: Preferences UI - Part 2 (4 hours)**
- [ ] Create `AlertPreferences` component
- [ ] Create `AccessibilityPreferences` component
- [ ] Create `DispatcherPreferencesTab` layout
- [ ] Create `HOSDefaults` component
- [ ] Create `OptimizationDefaults` component

**Day 8: Preferences UI - Part 3 (4 hours)**
- [ ] Create `DriverPreferencesTab` layout
- [ ] Create `FavoriteLocations` component
- [ ] Implement save/reset functionality
- [ ] Add loading states and error handling
- [ ] Test all forms with validation errors

---

### Week 3: Integration & Testing (8 hours)

**Day 9: Feature Integration (4 hours)**
- [ ] Integrate preferences into route planning page
- [ ] Integrate preferences into alert panel
- [ ] Apply formatters to KPI cards
- [ ] Apply formatters to timeline
- [ ] Apply formatters to costs tab
- [ ] Test preferences apply immediately

**Day 10: Testing & Polish (4 hours)**
- [ ] Test dark theme on all preference forms
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Write E2E tests for preference workflows
- [ ] Test role-based access (Dispatcher can't see Driver tab, etc.)
- [ ] Fix bugs and polish UI
- [ ] Update documentation

---

## Verification Checklist

### Functionality Tests
- [ ] Can create user preferences with defaults on first login
- [ ] Can update user preferences and changes persist
- [ ] Can update dispatcher preferences (Dispatcher role only)
- [ ] Can update driver preferences (Driver role only)
- [ ] Reset to defaults works for each preference scope
- [ ] Preferences apply to route planning (optimization mode, HOS defaults)
- [ ] Preferences apply to alerts (priority filter, category filter, quiet hours)
- [ ] Preferences apply to display (distance unit, time format, currency)
- [ ] Multi-tenant isolation (User A can't see User B's preferences)
- [ ] Role-based access enforced (Driver can't access dispatcher endpoints)

### UX/Design Tests
- [ ] All components use Shadcn UI (Button, Select, Input, Switch, Slider, Card)
- [ ] No plain HTML form elements used
- [ ] Dark theme fully supported (no white backgrounds, correct text colors)
- [ ] Responsive on 375px mobile (all forms usable)
- [ ] Responsive on 768px tablet (sidebar visible)
- [ ] Responsive on 1440px desktop (optimal layout)
- [ ] Form validation shows helpful error messages
- [ ] Loading spinner shows while fetching preferences
- [ ] Success message shows after save
- [ ] Save button disabled until changes detected
- [ ] Reset button shows confirmation dialog

### Performance Tests
- [ ] Preferences load in < 500ms
- [ ] Preferences save in < 1000ms
- [ ] No N+1 database queries
- [ ] Preferences cached in Zustand store (no redundant API calls)
- [ ] Auto-refresh interval respects user preference
- [ ] No unnecessary component re-renders

### Code Quality Tests
- [ ] TypeScript types defined for all DTOs and interfaces
- [ ] Prisma schema has proper indexes
- [ ] API follows RESTful conventions
- [ ] Service methods have unit test coverage
- [ ] Frontend components have unit test coverage
- [ ] No hardcoded values (all defaults in schema)
- [ ] Error handling comprehensive (backend and frontend)
- [ ] Comments explain business logic

---

## User Experience Flow

### Dispatcher: Setting HOS Defaults

**Happy Path (7 clicks, ~60 seconds):**

1. User clicks "Preferences" in sidebar → Preferences page loads
2. User clicks "Dispatcher" tab → Dispatcher preferences tab loads
3. User scrolls to "HOS Defaults" section
4. User drags "Default Drive Hours" slider to 5.0 hours
5. User drags "Default On-Duty Hours" slider to 7.0 hours
6. User clicks "Save Changes" → API call, success message
7. User navigates to "Create Plan" → Sliders pre-populated with 5.0h, 7.0h

**Alternative Path: Reset to Defaults (4 clicks):**

1. User clicks "Reset to Defaults" button
2. Confirmation dialog appears: "Reset dispatcher preferences to system defaults?"
3. User clicks "Confirm" → API call, preferences reset
4. Form reloads with defaults (0.0h drive, 0.0h on-duty, 0.0h since-break)

---

### Driver: Setting Notification Preferences

**Happy Path (6 clicks, ~45 seconds):**

1. User clicks "Preferences" in sidebar → Preferences page loads
2. User scrolls to "Alert Preferences" section
3. User unchecks "In-App Alerts"
4. User checks "SMS Alerts"
5. User sets "Quiet Hours Start" to 22:00 and "End" to 06:00
6. User clicks "Save Changes" → API call, success message
7. **Result:** Alerts now sent via SMS, muted 10pm-6am

---

### Administrator: Viewing System Defaults

**Happy Path (2 clicks, ~10 seconds):**

1. User navigates to `/api/v1/preferences/defaults` in browser
2. JSON response shows all system defaults
3. **Use Case:** Administrator documents defaults for training materials

---

## Success Metrics

### User Engagement Metrics
- **Preference Adoption Rate:** % of users who customize at least 1 preference
  - Target: 60% within first month
- **Most Customized Preferences:** Track which preferences are changed most often
  - Hypothesis: Distance unit, time format, optimization mode
- **Reset Rate:** % of users who reset preferences to defaults
  - Target: < 5% (indicates defaults are well-chosen)

### Quality Metrics
- **Validation Error Rate:** % of save attempts that fail validation
  - Target: < 2% (indicates clear UX and validation)
- **Support Tickets:** Number of tickets related to preferences confusion
  - Target: < 1 ticket per 100 active users per month
- **Preference Persistence:** % of users who keep custom preferences > 30 days
  - Target: > 90% (indicates preferences are useful)

### Performance Metrics
- **Load Time:** Time to fetch and display preferences
  - Target: < 500ms at 95th percentile
- **Save Time:** Time to validate and persist preferences
  - Target: < 1000ms at 95th percentile
- **Database Query Efficiency:** Average queries per preferences fetch
  - Target: 1 query (single join to User table)

### Integration Metrics
- **Formatter Usage:** % of distance/time/currency values using formatters
  - Target: 100% (all display values respect preferences)
- **Alert Filter Effectiveness:** % of alerts suppressed by preferences
  - Baseline: Measure after launch (indicates preference utility)
- **Route Planning Defaults:** % of new routes using default optimization mode
  - Target: > 70% (indicates defaults save dispatcher time)

---

## Future Enhancements (Post-MVP)

### Phase 2: Advanced Preferences (Priority: Medium)
1. **Preference Templates:** Save/load named preference sets
   - Use case: "Winter Operations" template with different fuel thresholds
   - Use case: "Long Haul" template with extended rest preferences
2. **Team Preferences:** Share dispatcher preferences across team members
   - Use case: All dispatchers use same HOS defaults and alert thresholds
3. **Tenant-Level Defaults:** Admin sets company-wide preference defaults
   - Use case: Fleet-wide distance unit (km for Canadian fleets)
4. **Preference Import/Export:** JSON export for backup/migration
   - Use case: Copy preferences when onboarding new dispatcher
5. **Preference History:** Audit log showing when preferences changed
   - Use case: Compliance review of who changed HOS thresholds when

### Phase 3: Smart Preferences (Priority: Low)
6. **Smart Defaults:** ML-based preference suggestions from usage patterns
   - Use case: "You frequently use Minimize Cost—set as default?"
7. **Contextual Preferences:** Different preferences by day/time
   - Use case: Different alert thresholds on weekends vs weekdays
8. **Predictive Alerts:** Alert user when detected behavior doesn't match preferences
   - Use case: "You set default to Minimize Cost but always switch to Balance"

### Phase 4: Mobile & Integration (Priority: Medium)
9. **Mobile App Sync:** Sync preferences to iOS/Android mobile app
10. **Webhook Preferences:** Custom webhook URLs for alerts
11. **Voice Preferences:** Voice assistant integration settings (Alexa, Google)
12. **Localization:** Full i18n support with language packs (Spanish, French)

---

## Related Documents

- **Architecture:** `.docs/architecture/` - System architecture diagrams
- **Dark Theme:** `.docs/DARK_THEME_IMPLEMENTATION.md` - Dark theme requirements
- **Integration Pattern:** `.specs/features/03-integrations/` - Settings page pattern reference
- **Fleet Management:** `.specs/features/07-fleet-management/` - Role-based settings pattern
- **UI Standards:** `CLAUDE.md` - Shadcn UI component requirements

---

## Metadata

**Last Updated:** 2026-01-30
**Status:** Planning
**Priority:** P1 (High Impact, Medium Effort)
**Estimated Effort:** 32-40 hours
**Maintained By:** SALLY Product & Engineering Team

---

**End of Feature Specification**
