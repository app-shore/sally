# SALLY Navigation - Quick Reference

## 🚀 For Users

### Accessing the App
- **URL**: http://localhost:3000
- **Landing Page**: Always accessible at `/`
- **Login**: Click "Get Started" button → `/login`

### Login Credentials
**Dispatcher:**
- Role: Select "Dispatcher"
- Auto-assigned ID: `dispatcher_1`

**Driver:**
- Role: Select "Driver"
- Select from dropdown of available drivers

### Navigation Shortcuts

#### When Not Logged In
| Action | Location | Result |
|--------|----------|--------|
| Visit / | Browser | Landing page |
| Click "Get Started" | Landing page hero | Login page |
| Click "Login" | Top navigation | Login page |

#### When Logged In (Dispatcher)
| Action | Location | Result |
|--------|----------|--------|
| Click logo | Header | Back to overview |
| Click "Home" | Header | Landing page |
| Click sidebar item | Sidebar | Navigate to page |
| Click bell icon | Header | Open alerts |
| Click avatar | Header | Profile menu |
| Click "Logout" | Profile menu | Logout & return to landing |

#### When Logged In (Driver)
| Action | Location | Result |
|--------|----------|--------|
| Click logo | Header | Back to dashboard |
| Click "Home" | Header | Landing page |
| Click sidebar item | Sidebar | Navigate to page |
| Click bell icon | Header | Open alerts |
| Click avatar | Header | Profile menu |
| Click "Logout" | Profile menu | Logout & return to landing |

## 💻 For Developers

### Key Files Modified

#### Navigation Components
```
/src/components/layout/
├── AppSidebar.tsx          ✏️ Added Route Planner & REST Optimizer
├── AppHeader.tsx           ✏️ Added "Home" button
├── UserProfileMenu.tsx     ✓ No changes
├── AlertsPanel.tsx         ✓ No changes
└── AppLayout.tsx           ✓ No changes

/src/components/dashboard/
└── TopNavigation.tsx       ✏️ Simplified (login/logout only)

/src/components/landing/
└── LandingPage.tsx         ✏️ Changed CTA to "Get Started" → /login
```

#### Pages
```
/src/app/
├── page.tsx                ✏️ Removed auto-redirect, show landing for all
├── layout-client.tsx       ✏️ Added route-planner & rest-optimizer to AppLayout
└── login/
    └── page.tsx            ✨ NEW - Dedicated login page
```

### Route Table

| Route | Layout | Auth Required | Component |
|-------|--------|---------------|-----------|
| `/` | TopNavigation | No | LandingPage |
| `/login` | TopNavigation | No | LoginScreen |
| `/dispatcher/*` | AppLayout | Yes (dispatcher) | Dispatcher pages |
| `/driver/*` | AppLayout | Yes (driver) | Driver pages |
| `/settings` | AppLayout | Yes (both) | Settings page |
| `/route-planner` | AppLayout | Yes (dispatcher) | Route Planner |
| `/rest-optimizer` | AppLayout | Yes (dispatcher) | REST Optimizer |

### Component Props

#### AppSidebar
```typescript
interface AppSidebarProps {
  isOpen: boolean;           // Mobile sidebar state
  onClose: () => void;       // Close sidebar callback
  alertCount: number;        // Badge count for alerts button
  onOpenAlerts: () => void;  // Open alerts panel callback
}
```

#### AppHeader
```typescript
interface AppHeaderProps {
  onToggleSidebar: () => void;  // Toggle mobile sidebar
  alertCount: number;           // Badge count for bell icon
  onOpenAlerts: () => void;     // Open alerts panel callback
}
```

### Session Store API

```typescript
// Access store
const { user_type, user_id, is_authenticated, login, logout } = useSessionStore();

// Login
login('dispatcher', 'user_123', 'session_abc');

// Logout
logout();

// Check authentication
if (is_authenticated) {
  // User is logged in
}

// Check role
if (user_type === 'dispatcher') {
  // Dispatcher-specific logic
}
```

### Adding New Navigation Items

**To Dispatcher Sidebar:**
```typescript
// File: /src/components/layout/AppSidebar.tsx
const dispatcherNavItems: NavItem[] = [
  { label: 'Overview', href: '/dispatcher/overview', icon: <Home /> },
  // ... existing items ...
  { label: 'New Feature', href: '/dispatcher/new-feature', icon: <Icon /> }, // Add here
];
```

**To Driver Sidebar:**
```typescript
const driverNavItems: NavItem[] = [
  { label: 'My Dashboard', href: '/driver/dashboard', icon: <Home /> },
  // ... existing items ...
  { label: 'New Feature', href: '/driver/new-feature', icon: <Icon /> }, // Add here
];
```

### Protected Route Template

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';

export default function ProtectedPage() {
  const router = useRouter();
  const { is_authenticated, user_type } = useSessionStore();

  useEffect(() => {
    if (!is_authenticated) {
      router.push('/login');
      return;
    }

    // Optional: Role-based protection
    if (user_type !== 'dispatcher') {
      router.push('/driver/dashboard');
    }
  }, [is_authenticated, user_type, router]);

  if (!is_authenticated) {
    return null; // Will redirect
  }

  return (
    <div>
      {/* Your page content */}
    </div>
  );
}
```

## 🔍 Debugging

### Check Session State
```javascript
// In browser console
JSON.parse(localStorage.getItem('sally-session'))
```

### Clear Session (Force Logout)
```javascript
// In browser console
localStorage.removeItem('sally-session');
window.location.reload();
```

### Check Current Route
```javascript
// In component
import { usePathname } from 'next/navigation';
const pathname = usePathname();
console.log('Current path:', pathname);
```

### Check User Role
```javascript
// In component
import { useSessionStore } from '@/lib/store/sessionStore';
const { user_type, is_authenticated } = useSessionStore();
console.log('User type:', user_type);
console.log('Authenticated:', is_authenticated);
```

## 🎨 Styling

### Sidebar Active State
```css
/* Active navigation item */
bg-black text-white

/* Inactive navigation item */
text-gray-700 hover:bg-gray-100
```

### Header Layout
```css
/* Header height */
h-16 (64px)

/* Sidebar width */
w-64 (256px)

/* Content offset (desktop) */
md:ml-64
```

### Responsive Classes
```css
/* Show on mobile only */
md:hidden

/* Show on desktop only */
hidden md:block

/* Sidebar visibility */
-translate-x-full md:translate-x-0  /* Hidden on mobile, visible on desktop */
```

## 📊 Analytics Events (Future)

### Suggested Tracking
```javascript
// Login
track('user_login', { user_type: 'dispatcher' });

// Navigation
track('page_view', { page: '/dispatcher/overview' });

// Alerts
track('alert_acknowledge', { alert_id: 'alert_123', priority: 'critical' });
track('alert_resolve', { alert_id: 'alert_123' });

// Sidebar
track('sidebar_navigation', { from: '/dispatcher/overview', to: '/route-planner' });

// Landing Page CTA
track('cta_click', { button: 'get_started', location: 'hero' });
```

## 🐛 Common Issues

### Issue: "Not authenticated" on refresh
**Cause**: Session store not loading from localStorage
**Fix**: Check browser console for errors, verify Zustand persist is working

### Issue: Sidebar not showing on desktop
**Cause**: Tailwind classes not applying correctly
**Fix**: Check `md:translate-x-0` class is present on sidebar

### Issue: Redirect loop
**Cause**: Protected route redirecting to itself
**Fix**: Check `useEffect` dependencies, ensure redirect target is different

### Issue: Alerts not loading
**Cause**: Backend API not running
**Fix**: Start backend: `cd apps/backend && npm run dev`

### Issue: Role badge not showing
**Cause**: Expected on mobile (hidden by design)
**Fix**: Check on desktop (≥768px width)

## 📚 Related Documentation

- **Full Implementation**: `NAVIGATION_REDESIGN_SUMMARY.md`
- **Home Page Fix**: `HOME_PAGE_NAVIGATION_FIX.md`
- **Flow Diagrams**: `NAVIGATION_FLOW_DIAGRAM.md`
- **Testing Guide**: `NAVIGATION_TESTING_GUIDE.md`

## 🔗 Quick Links

### Development
- Dev Server: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Pages (when logged in as dispatcher)
- Overview: http://localhost:3000/dispatcher/overview
- Create Plan: http://localhost:3000/dispatcher/create-plan
- Active Routes: http://localhost:3000/dispatcher/active-routes
- Route Planner: http://localhost:3000/route-planner
- REST Optimizer: http://localhost:3000/rest-optimizer
- Settings: http://localhost:3000/settings

### Pages (when logged in as driver)
- Dashboard: http://localhost:3000/driver/dashboard
- Current Route: http://localhost:3000/driver/current-route
- Messages: http://localhost:3000/driver/messages
- Settings: http://localhost:3000/settings

---

**Last Updated**: January 29, 2026
**Version**: 1.0
**Status**: ✅ Production Ready
