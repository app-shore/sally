# SALLY Navigation Flow Diagram

## Complete User Journey Map

### 1. Landing Page (Unauthenticated)
```
┌─────────────────────────────────────────────────────────────────┐
│  TopNavigation                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ SALLY | Dispatch & Driver Coordination     [Login Button]   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│                         SALLY                                    │
│      Stop planning routes. Start preventing violations.         │
│                                                                  │
│        ┌──────────────┐    ┌──────────────────────┐           │
│        │ Get Started  │    │  See How It Works    │           │
│        └──────┬───────┘    └──────────────────────┘           │
│               │                                                  │
│               └──> Navigates to /login                          │
│                                                                  │
│  [Features, Benefits, ROI Calculator, Testimonials...]          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Login Page
```
┌─────────────────────────────────────────────────────────────────┐
│  TopNavigation                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ SALLY | Dispatch & Driver Coordination     [Login Button]   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│                ┌─────────────────────────┐                      │
│                │   SALLY Login           │                      │
│                │                         │                      │
│                │  Select your role:      │                      │
│                │                         │                      │
│                │  ┌──────────────────┐  │                      │
│                │  │ Login as         │  │                      │
│                │  │ Dispatcher       │  │                      │
│                │  └────────┬─────────┘  │                      │
│                │           │             │                      │
│                │  ┌────────┴─────────┐  │                      │
│                │  │ Login as Driver  │  │                      │
│                │  └────────┬─────────┘  │                      │
│                │           │             │                      │
│                └───────────┼─────────────┘                      │
│                            │                                     │
│                            └──> Authenticates                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Dispatcher Dashboard (Authenticated)
```
┌──────────┬──────────────────────────────────────────────────────┐
│          │ AppHeader                                             │
│          │ ┌────────────────────────────────────────────────────┤
│          │ │ [☰] SALLY [🏠 Home]  [Dispatcher View]  [🔔 3] [👤]│
│          │ └────────────────────────────────────────────────────┤
│  Sidebar │                                                       │
│          │                                                       │
│  🏠      │   Overview Dashboard                                 │
│  Overview│   ┌──────────────┐  ┌──────────────┐               │
│          │   │ Active: 12   │  │ Pending: 3   │               │
│  ➕      │   └──────────────┘  └──────────────┘               │
│  Create  │                                                       │
│  Plan    │   Recent Alerts                                      │
│          │   ┌────────────────────────────────────┐            │
│  🚛      │   │ ⚠️ Driver #45 HOS approaching     │            │
│  Active  │   │ 🚨 Traffic delay on Route #12     │            │
│  Routes  │   └────────────────────────────────────┘            │
│          │                                                       │
│ ────────│                                                       │
│  Tools   │                                                       │
│ ────────│                                                       │
│          │                                                       │
│  🗺️      │                                                       │
│  Route   │                                                       │
│  Planner │                                                       │
│          │                                                       │
│  ⚙️      │                                                       │
│  REST    │                                                       │
│  Optimizer│                                                      │
│          │                                                       │
│  ⚙️      │                                                       │
│  Settings│                                                       │
│          │                                                       │
│  ─────── │                                                       │
│          │                                                       │
│  🔔 (3)  │                                                       │
│  Alerts  │                                                       │
│          │                                                       │
│  ─────── │                                                       │
│  v1.0.0  │                                                       │
│  Help    │                                                       │
└──────────┴───────────────────────────────────────────────────────┘
```

### 4. Alerts Panel (Slide-in)
```
┌──────────┬──────────────────────────────────────┬───────────────┐
│          │                                       │ Alerts    [X] │
│  Sidebar │                                       │               │
│          │                                       │ [All] Critical│
│          │                                       │  High Medium  │
│          │                                       │               │
│          │                                       │ ┌───────────┐ │
│          │        Main Content Area              │ │⚠️ Critical│ │
│          │                                       │ │HOS Alert  │ │
│          │                                       │ │           │ │
│          │                                       │ │[Ack] [Res]│ │
│          │                                       │ └───────────┘ │
│          │                                       │               │
│          │                                       │ ┌───────────┐ │
│          │                                       │ │⚠️ High    │ │
│          │                                       │ │Delay Alert│ │
│          │                                       │ └───────────┘ │
│          │                                       │               │
└──────────┴───────────────────────────────────────┴───────────────┘
          ← Backdrop overlay (click to close)
```

### 5. Driver Dashboard (Authenticated)
```
┌──────────┬──────────────────────────────────────────────────────┐
│          │ AppHeader                                             │
│          │ ┌────────────────────────────────────────────────────┤
│          │ │ [☰] SALLY [🏠 Home]  [Driver View]  [🔔 0] [👤]    │
│          │ └────────────────────────────────────────────────────┤
│  Sidebar │                                                       │
│          │                                                       │
│  🏠      │   My Dashboard                                       │
│  My      │   ┌──────────────┐  ┌──────────────┐               │
│  Dashboard   │ On Duty      │  │ Next: 2.5hrs │               │
│          │   └──────────────┘  └──────────────┘               │
│  🗺️      │                                                       │
│  Current │   HOS Status                                         │
│  Route   │   ┌────────────────────────────────────┐            │
│          │   │ Drive Time:  [████████░░] 8.5/11h │            │
│  💬      │   │ Shift Time:  [██████░░░░] 6.2/14h │            │
│  Messages│   │ Cycle Time:  [███████░░░] 42/70h  │            │
│          │   └────────────────────────────────────┘            │
│  ⚙️      │                                                       │
│  Settings│   Recent Activity                                    │
│          │   • Departed LA (8:30 AM)                           │
│  ─────── │   • Rest stop scheduled (2:00 PM)                   │
│          │                                                       │
│  🔔 (0)  │                                                       │
│  Alerts  │                                                       │
│          │                                                       │
└──────────┴───────────────────────────────────────────────────────┘
```

## Navigation Flow Charts

### Flow 1: First-Time User (Unauthenticated)
```
    Landing Page (/)
         │
         │ Click "Get Started"
         ↓
    Login Page (/login)
         │
         │ Select Role + Login
         ↓
    ┌────────────────┐
    │                │
    ↓                ↓
Dispatcher      Driver
Dashboard       Dashboard
```

### Flow 2: Authenticated User Navigation
```
                  Dashboard
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ↓             ↓             ↓
    Sidebar      Header        Content
    Navigation   Actions       Area
        │             │             │
        │             │             │
    ┌───┴───┬───┬─────┴─────┬──────┴────┐
    │       │   │           │           │
    ↓       ↓   ↓           ↓           ↓
Overview  Routes Home    Alerts    Profile
          Tools  (/)     Panel     Menu
            │
        ┌───┴───┐
        │       │
        ↓       ↓
    Route    REST
    Planner  Optimizer
```

### Flow 3: Route Planner Access (Dispatcher Only)
```
Dispatcher Dashboard
        │
        │ Click "Route Planner" in sidebar
        ↓
Route Planner Page
        │
        │ Sidebar still visible (AppLayout)
        │ Can navigate to other features
        │
        ├─> Overview (sidebar)
        ├─> Active Routes (sidebar)
        ├─> REST Optimizer (sidebar)
        ├─> Settings (sidebar)
        ├─> Alerts (header icon)
        └─> Home (header button) -> Landing Page
```

### Flow 4: Mobile Navigation
```
Tap Hamburger Menu
        │
        ↓
Sidebar Slides In (Overlay)
        │
        │ Select item
        ↓
Navigate to Page
        │
        ↓
Sidebar Auto-Closes
```

### Flow 5: Logout Flow
```
Click User Avatar
        │
        ↓
Profile Menu Opens
        │
        │ Click "Logout"
        ↓
API Call: /api/v1/session/logout
        │
        ↓
Clear Session Store
        │
        ↓
Redirect to Landing Page (/)
        │
        ↓
TopNavigation (Public)
Shows "Login" Button
```

### Flow 6: Alerts Workflow
```
Header: Bell Icon (Badge: 3)
        │
        │ Click
        ↓
AlertsPanel Slides In
        │
        ├─> Filter by Priority
        │   (All, Critical, High, Medium, Low)
        │
        ├─> View Alert Details
        │   (Priority, Category, Message, Timestamp)
        │
        └─> Take Action
            │
            ├─> Acknowledge
            │   └─> API Call -> Refetch Alerts
            │
            └─> Resolve
                └─> API Call -> Refetch Alerts
                    └─> Badge Count Updates
```

## Component Hierarchy

```
App
└─> LayoutClient
    │
    ├─> Public Pages (/, /login)
    │   └─> TopNavigation (simple)
    │       └─> [Logo] [Login/Logout]
    │
    └─> Authenticated Pages (/dispatcher, /driver, /settings, /route-planner, /rest-optimizer)
        └─> AppLayout
            │
            ├─> AppSidebar (left, 256px)
            │   ├─> Navigation Items (role-based)
            │   ├─> Tools Section (dispatcher only)
            │   ├─> Alerts Button (badge)
            │   └─> Footer (version, help)
            │
            ├─> AppHeader (top, 64px)
            │   ├─> Hamburger (mobile only)
            │   ├─> Logo (→ dashboard)
            │   ├─> Home Button (→ landing)
            │   ├─> Role Badge (desktop only)
            │   ├─> Bell Icon (→ AlertsPanel)
            │   └─> UserProfileMenu
            │       ├─> User Info
            │       ├─> Settings Link
            │       └─> Logout Action
            │
            ├─> Main Content (full width with padding)
            │   └─> Page Content
            │
            └─> AlertsPanel (slide-in, 400px)
                ├─> Filter Tabs
                ├─> Alert List
                └─> Actions (Acknowledge, Resolve)
```

## URL Structure

```
Public Routes:
/                   → Landing Page (TopNavigation)
/login              → Login Screen (TopNavigation)

Dispatcher Routes (AppLayout):
/dispatcher         → Redirect to /dispatcher/overview
/dispatcher/overview            → Dashboard home
/dispatcher/create-plan         → Route planning (placeholder)
/dispatcher/active-routes       → Active routes monitoring

Driver Routes (AppLayout):
/driver             → Redirect to /driver/dashboard
/driver/dashboard               → Driver home
/driver/current-route           → Current route timeline
/driver/messages                → Messages from dispatch

Shared Routes (AppLayout):
/settings           → Settings (role-appropriate content)

Tool Routes (AppLayout - Dispatcher access via sidebar):
/route-planner      → Route planning tool
/rest-optimizer     → REST optimization tool
```

## State Management

```
Session Store (Zustand + localStorage)
├─> user_type: 'dispatcher' | 'driver' | null
├─> user_id: string | null
├─> session_id: string | null
├─> is_authenticated: boolean
└─> isAuthenticated: boolean (alias)

Actions:
├─> login(user_type, user_id, session_id)
└─> logout()

Persistence:
└─> localStorage key: 'sally-session'
    └─> Survives page refresh
    └─> Cleared on logout
```

## Responsive Breakpoints

```
Mobile (<768px):
├─> Sidebar: Hidden by default, overlay when open
├─> Header: Hamburger visible, role badge hidden
├─> Content: Full width, reduced padding (px-4)
└─> Alerts Panel: Full width

Tablet (768px - 1024px):
├─> Sidebar: Always visible, fixed left
├─> Header: Full features, role badge visible
├─> Content: Adjusted width (ml-64)
└─> Alerts Panel: 400px width

Desktop (>1024px):
├─> Sidebar: Always visible, fixed left
├─> Header: Full features, all elements visible
├─> Content: Max-width container (max-w-7xl)
└─> Alerts Panel: 400px width
```

---

**Created**: January 29, 2026
**Purpose**: Visual reference for SALLY navigation redesign
**Status**: ✅ Current
