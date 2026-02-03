import { Home, Plus, Truck, Settings, Map, MessageSquare, LucideIcon, Package, Plug, Users, BarChart3, Route, Building2, Rocket, Flag } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: ('DISPATCHER' | 'DRIVER' | 'ADMIN' | 'OWNER')[];
}

export interface NavSeparator {
  type: 'separator';
  label: string;
  roles?: ('DISPATCHER' | 'DRIVER' | 'ADMIN' | 'OWNER')[];
}

export type NavigationItem = NavItem | NavSeparator;

/**
 * Centralized navigation configuration for SALLY
 * Defines all navigation items for authenticated users
 *
 * Label Guidelines (Marketing & PO Perspective):
 * - Use value-driven language (what user gets, not just what it is)
 * - Use industry-standard terminology (fleet management best practices)
 * - Keep labels concise but descriptive (2-3 words max)
 * - Focus on action and outcomes
 */
export const navigationConfig: Record<string, NavigationItem[]> = {
  dispatcher: [
    { label: 'Command Center', href: '/dispatcher/overview', icon: Home },
    { label: 'Plan Route', href: '/dispatcher/create-plan', icon: Plus },
    { label: 'Live Routes', href: '/dispatcher/active-routes', icon: Truck },
    { type: 'separator', label: 'Configuration' } as NavSeparator,
    { label: 'Route Planner', href: '/settings/route-planning', icon: Route },
    { label: 'Fleet', href: '/settings/fleet', icon: Package },
    { label: 'Integrations', href: '/settings/integrations', icon: Plug },
    { label: 'Preferences', href: '/settings/preferences', icon: Settings },
  ],

  driver: [
    { label: 'My Routes', href: '/driver/dashboard', icon: Home },
    { label: 'Today\'s Route', href: '/driver/current-route', icon: Map },
    { label: 'Dispatch Messages', href: '/driver/messages', icon: MessageSquare },
    { type: 'separator', label: 'Configuration' } as NavSeparator,
    { label: 'Preferences', href: '/settings/preferences', icon: Settings },
  ],

  admin: [
    // Admin/Management Section - High-level admin functions
    { label: 'Setup Hub', href: '/setup-hub', icon: Rocket },
    { label: 'Dashboard', href: '/admin/dashboard', icon: Home },
    { label: 'Team', href: '/users', icon: Users },
    { label: 'Drivers', href: '/drivers', icon: Truck },
    { type: 'separator', label: 'Operations' } as NavSeparator,
    // Dispatcher operations
    { label: 'Command Center', href: '/dispatcher/overview', icon: BarChart3 },
    { label: 'Plan Route', href: '/dispatcher/create-plan', icon: Plus },
    { label: 'Live Routes', href: '/dispatcher/active-routes', icon: Map },
    { type: 'separator', label: 'Configuration' } as NavSeparator,
    { label: 'Route Planner', href: '/settings/route-planning', icon: Route },
    { label: 'Fleet', href: '/settings/fleet', icon: Package },
    { label: 'Integrations', href: '/settings/integrations', icon: Plug },
    { label: 'Preferences', href: '/settings/preferences', icon: Settings },
  ],

  // OWNER has same capabilities as ADMIN plus full user management control
  owner: [
    // Admin/Management Section - High-level admin functions
    { label: 'Setup Hub', href: '/setup-hub', icon: Rocket },
    { label: 'Dashboard', href: '/admin/dashboard', icon: Home },
    { label: 'Team', href: '/users', icon: Users },
    { label: 'Drivers', href: '/drivers', icon: Truck },

    { type: 'separator', label: 'Operations' } as NavSeparator,
    // Dispatcher operations
    { label: 'Command Center', href: '/dispatcher/overview', icon: BarChart3 },
    { label: 'Plan Route', href: '/dispatcher/create-plan', icon: Plus },
    { label: 'Live Routes', href: '/dispatcher/active-routes', icon: Map },
    { type: 'separator', label: 'Configuration' } as NavSeparator,
    { label: 'Route Planner', href: '/settings/route-planning', icon: Route },
    { label: 'Fleet', href: '/settings/fleet', icon: Package },
    { label: 'Integrations', href: '/settings/integrations', icon: Plug },
    { label: 'Preferences', href: '/settings/preferences', icon: Settings },
  ],

  super_admin: [
    { label: 'Tenant Management', href: '/admin/tenants', icon: Building2 },
    { label: 'Feature Flags', href: '/admin/feature-flags', icon: Flag },
    // User and driver management is handled by tenant OWNER/ADMIN users
    // We can add more SUPER_ADMIN features later (analytics, billing, etc.)
  ],
};

/**
 * Public routes that don't require authentication
 */
export const publicRoutes = ['/', '/login'] as const;

/**
 * Routes that require authentication
 */
export const protectedRoutePatterns = [
  '/dispatcher',
  '/driver',
  '/admin',
  '/settings',
  '/users',
  '/drivers',
  '/setup-hub',
] as const;

/**
 * Get navigation items based on user role
 */
export function getNavigationForRole(role: 'DISPATCHER' | 'DRIVER' | 'ADMIN' | 'OWNER' | 'SUPER_ADMIN' | undefined): NavigationItem[] {
  if (!role) return [];

  const roleKey = role.toLowerCase() as keyof typeof navigationConfig;
  return navigationConfig[roleKey] || [];
}

/**
 * Check if a route requires authentication
 */
export function isProtectedRoute(pathname: string): boolean {
  return protectedRoutePatterns.some(pattern => pathname.startsWith(pattern));
}

/**
 * Check if a route is public (doesn't require auth)
 */
export function isPublicRoute(pathname: string): boolean {
  return publicRoutes.includes(pathname as any) || pathname.startsWith('/login');
}

/**
 * Get default route for user role
 */
export function getDefaultRouteForRole(role: 'DISPATCHER' | 'DRIVER' | 'ADMIN' | 'OWNER' | 'SUPER_ADMIN' | undefined): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin/tenants';
    case 'OWNER':
      return '/admin/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    case 'DISPATCHER':
      return '/dispatcher/overview';
    case 'DRIVER':
      return '/driver/dashboard';
    default:
      return '/login';
  }
}
