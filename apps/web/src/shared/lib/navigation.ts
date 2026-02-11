import { BarChart3, Building2, FileText, Flag, Home, LucideIcon, Map, MessageSquare, Package, Plus, Rocket, Settings, Truck, Users, Wallet } from 'lucide-react';

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
 *
 * Design philosophy:
 * - Sidebar = places you GO (workspaces, tools)
 * - Header icons = things that COME TO YOU (alerts, notifications)
 * - Every item must earn its spot through daily-use frequency
 * - Alerts & notifications are header-level concerns (icon → popover → full page)
 */
export const navigationConfig: Record<string, NavigationItem[]> = {
  dispatcher: [
    { label: 'Command Center', href: '/dispatcher/overview', icon: Home },
    { label: 'Fleet', href: '/dispatcher/fleet', icon: Package },
    { label: 'Plan Route', href: '/dispatcher/create-plan', icon: Plus },
    { label: 'Live Routes', href: '/dispatcher/active-routes', icon: Truck },
    // { label: 'Analytics', href: '/dispatcher/analytics', icon: BarChart3 },
    { type: 'separator', label: 'Financials' } as NavSeparator,
    { label: 'Invoicing', href: '/dispatcher/invoicing', icon: FileText },
    { label: 'Settlements', href: '/dispatcher/settlements', icon: Wallet },
    { type: 'separator', label: 'Configuration' } as NavSeparator,
    { label: 'Settings', href: '/settings/general', icon: Settings },
  ],

  driver: [
    { label: 'My Routes', href: '/driver/dashboard', icon: Home },
    { label: 'Today\'s Route', href: '/driver/current-route', icon: Map },
    { label: 'Dispatch Messages', href: '/driver/messages', icon: MessageSquare },
    { type: 'separator', label: 'Configuration' } as NavSeparator,
    { label: 'Settings', href: '/settings/general', icon: Settings },
  ],

  admin: [
    { label: 'Setup Hub', href: '/setup-hub', icon: Rocket },
    { label: 'Dashboard', href: '/admin/dashboard', icon: Home },
    { label: 'Team', href: '/admin/team', icon: Users },
    { type: 'separator', label: 'Operations' } as NavSeparator,
    { label: 'Command Center', href: '/dispatcher/overview', icon: BarChart3 },
    { label: 'Fleet', href: '/dispatcher/fleet', icon: Package },
    { label: 'Plan Route', href: '/dispatcher/create-plan', icon: Plus },
    { label: 'Live Routes', href: '/dispatcher/active-routes', icon: Map },
    // { label: 'Analytics', href: '/dispatcher/analytics', icon: BarChart3 },
    { type: 'separator', label: 'Financials' } as NavSeparator,
    { label: 'Invoicing', href: '/dispatcher/invoicing', icon: FileText },
    { label: 'Settlements', href: '/dispatcher/settlements', icon: Wallet },
    { type: 'separator', label: 'Configuration' } as NavSeparator,
    { label: 'Settings', href: '/settings/general', icon: Settings },
  ],

  owner: [
    { label: 'Setup Hub', href: '/setup-hub', icon: Rocket },
    { label: 'Dashboard', href: '/admin/dashboard', icon: Home },
    { label: 'Team', href: '/admin/team', icon: Users },
    { type: 'separator', label: 'Operations' } as NavSeparator,
    { label: 'Command Center', href: '/dispatcher/overview', icon: BarChart3 },
    { label: 'Fleet', href: '/dispatcher/fleet', icon: Package },
    { label: 'Plan Route', href: '/dispatcher/create-plan', icon: Plus },
    { label: 'Live Routes', href: '/dispatcher/active-routes', icon: Map },
    // { label: 'Analytics', href: '/dispatcher/analytics', icon: BarChart3 },
    { type: 'separator', label: 'Financials' } as NavSeparator,
    { label: 'Invoicing', href: '/dispatcher/invoicing', icon: FileText },
    { label: 'Settlements', href: '/dispatcher/settlements', icon: Wallet },
    { type: 'separator', label: 'Configuration' } as NavSeparator,
    { label: 'Settings', href: '/settings/general', icon: Settings },
  ],

  super_admin: [
    { label: 'Tenant Management', href: '/admin/tenants', icon: Building2 },
    { label: 'Feature Flags', href: '/admin/feature-flags', icon: Flag },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
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
  '/setup-hub',
  '/notifications',
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
