import { Home, Plus, Truck, Settings, Map, MessageSquare, LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: ('DISPATCHER' | 'DRIVER' | 'ADMIN')[];
}

/**
 * Centralized navigation configuration for SALLY
 * Defines all navigation items for authenticated users
 */
export const navigationConfig = {
  dispatcher: [
    { label: 'Overview', href: '/dispatcher/overview', icon: Home },
    { label: 'Create Plan', href: '/dispatcher/create-plan', icon: Plus },
    { label: 'Active Routes', href: '/dispatcher/active-routes', icon: Truck },
    // Separator after Active Routes (index 3)
    { label: 'Route Planner', href: '/route-planner', icon: Map },
    { label: 'REST Optimizer', href: '/rest-optimizer', icon: Settings },
    { label: 'Settings', href: '/settings', icon: Settings },
  ] as const,

  driver: [
    { label: 'My Dashboard', href: '/driver/dashboard', icon: Home },
    { label: 'Current Route', href: '/driver/current-route', icon: Map },
    { label: 'Messages', href: '/driver/messages', icon: MessageSquare },
    { label: 'Settings', href: '/settings', icon: Settings },
  ] as const,

  admin: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: Home },
    { label: 'Users', href: '/admin/users', icon: Settings },
    { label: 'Settings', href: '/settings', icon: Settings },
  ] as const,
} as const;

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
  '/route-planner',
  '/rest-optimizer',
  '/settings',
  '/config',
] as const;

/**
 * Get navigation items based on user role
 */
export function getNavigationForRole(role: 'DISPATCHER' | 'DRIVER' | 'ADMIN' | undefined) {
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
export function getDefaultRouteForRole(role: 'DISPATCHER' | 'DRIVER' | 'ADMIN' | undefined): string {
  switch (role) {
    case 'DISPATCHER':
      return '/dispatcher/overview';
    case 'DRIVER':
      return '/driver/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    default:
      return '/login';
  }
}
