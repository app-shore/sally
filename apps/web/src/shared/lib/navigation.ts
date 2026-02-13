import { BarChart3, Building2, ClipboardList, Flag, Home, LucideIcon, Map, MessageSquare, Package, Plus, Receipt, Rocket, Settings, Users, Wallet } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: ('DISPATCHER' | 'DRIVER' | 'ADMIN' | 'OWNER' | 'CUSTOMER')[];
}

export interface NavSeparator {
  type: 'separator';
  label: string;
  roles?: ('DISPATCHER' | 'DRIVER' | 'ADMIN' | 'OWNER' | 'CUSTOMER')[];
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
    { label: 'Command Center', href: '/dispatcher/command-center', icon: Home },
    { label: 'Loads', href: '/dispatcher/loads', icon: ClipboardList },
    { label: 'Plan Route', href: '/dispatcher/create-plan', icon: Plus },
    { label: 'Fleet', href: '/dispatcher/fleet', icon: Package },
    { type: 'separator', label: 'Money' } as NavSeparator,
    { label: 'Billing', href: '/dispatcher/billing', icon: Receipt },
    { label: 'Pay', href: '/dispatcher/pay', icon: Wallet },
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
    { label: 'Command Center', href: '/dispatcher/command-center', icon: Home },
    { label: 'Loads', href: '/dispatcher/loads', icon: ClipboardList },
    { label: 'Plan Route', href: '/dispatcher/create-plan', icon: Plus },
    { label: 'Fleet', href: '/dispatcher/fleet', icon: Package },
    { type: 'separator', label: 'Money' } as NavSeparator,
    { label: 'Billing', href: '/dispatcher/billing', icon: Receipt },
    { label: 'Pay', href: '/dispatcher/pay', icon: Wallet },
    { type: 'separator', label: 'Administration' } as NavSeparator,
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Team', href: '/admin/team', icon: Users },
    { label: 'Setup Hub', href: '/setup-hub', icon: Rocket },
    { label: 'Settings', href: '/settings/general', icon: Settings },
  ],

  owner: [
    { label: 'Command Center', href: '/dispatcher/command-center', icon: Home },
    { label: 'Loads', href: '/dispatcher/loads', icon: ClipboardList },
    { label: 'Plan Route', href: '/dispatcher/create-plan', icon: Plus },
    { label: 'Fleet', href: '/dispatcher/fleet', icon: Package },
    { type: 'separator', label: 'Money' } as NavSeparator,
    { label: 'Billing', href: '/dispatcher/billing', icon: Receipt },
    { label: 'Pay', href: '/dispatcher/pay', icon: Wallet },
    { type: 'separator', label: 'Administration' } as NavSeparator,
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Team', href: '/admin/team', icon: Users },
    { label: 'Setup Hub', href: '/setup-hub', icon: Rocket },
    { label: 'Settings', href: '/settings/general', icon: Settings },
  ],

  super_admin: [
    { label: 'Tenant Management', href: '/admin/tenants', icon: Building2 },
    { label: 'Feature Flags', href: '/admin/feature-flags', icon: Flag },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ],

  customer: [
    { label: 'My Shipments', href: '/customer/dashboard', icon: Package },
    { label: 'Request Load', href: '/customer/request-load', icon: Plus },
    { type: 'separator', label: 'Configuration' } as NavSeparator,
    { label: 'Settings', href: '/settings/general', icon: Settings },
  ],
};

/**
 * Public routes that don't require authentication
 */
export const publicRoutes = ['/', '/login', '/track'] as const;

/**
 * Routes that require authentication
 */
export const protectedRoutePatterns = [
  '/dispatcher',
  '/driver',
  '/admin',
  '/customer',
  '/settings',
  '/setup-hub',
  '/notifications',
] as const;

/**
 * Get navigation items based on user role
 */
export function getNavigationForRole(role: 'DISPATCHER' | 'DRIVER' | 'ADMIN' | 'OWNER' | 'CUSTOMER' | 'SUPER_ADMIN' | undefined): NavigationItem[] {
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
  return publicRoutes.includes(pathname as any) || pathname.startsWith('/login') || pathname.startsWith('/track');
}

/**
 * Get default route for user role
 */
export function getDefaultRouteForRole(role: 'DISPATCHER' | 'DRIVER' | 'ADMIN' | 'OWNER' | 'CUSTOMER' | 'SUPER_ADMIN' | undefined): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin/tenants';
    case 'OWNER':
      return '/dispatcher/command-center';
    case 'ADMIN':
      return '/dispatcher/command-center';
    case 'DISPATCHER':
      return '/dispatcher/command-center';
    case 'DRIVER':
      return '/driver/dashboard';
    case 'CUSTOMER':
      return '/customer/dashboard';
    default:
      return '/login';
  }
}
