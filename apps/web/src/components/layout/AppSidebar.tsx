'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/lib/store/sessionStore';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getNavigationForRole, type NavItem } from '@/lib/navigation';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  alertCount: number;
  onOpenAlerts: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppSidebar({
  isOpen,
  onClose,
  alertCount,
  onOpenAlerts,
  isCollapsed,
  onToggleCollapse
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useSessionStore();

  // Get navigation items from centralized config
  const navItems = getNavigationForRole(user?.role);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-16 h-[calc(100vh-4rem)] z-40 transition-all duration-300 ease-in-out',
          'border-r border-border flex flex-col',
          user?.role === 'DRIVER' ? 'bg-gray-50 dark:bg-gray-900' : 'bg-background',
          // Mobile: slide in/out
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: always visible, width changes based on collapse state
          'md:translate-x-0',
          isCollapsed ? 'md:w-16' : 'md:w-64',
          // Mobile always full width when open
          'w-64'
        )}
      >
        {/* Collapse toggle button (desktop only) */}
        <div className="hidden md:flex justify-end p-2 border-b border-border">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navItems.map((item, index) => {
              // Check if this is a separator
              if ('type' in item && item.type === 'separator') {
                return (
                  <div key={`separator-${index}`} className="my-2">
                    <Separator />
                    {!isCollapsed && (
                      <p className="text-xs text-muted-foreground px-3 py-2">{item.label}</p>
                    )}
                  </div>
                );
              }

              // Regular nav item (type guard ensures this is NavItem)
              const navItem = item as NavItem;
              const isActive = pathname === navItem.href || pathname?.startsWith(navItem.href + '/');
              const Icon = navItem.icon;

              return (
                <Link
                  key={navItem.href}
                  href={navItem.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                    'text-sm font-medium',
                    isActive
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'text-foreground hover:bg-gray-100 dark:hover:bg-gray-800',
                    isCollapsed && 'justify-center'
                  )}
                  title={isCollapsed ? navItem.label : undefined}
                >
                  <Icon className={cn('h-5 w-5', isCollapsed && 'mx-auto')} />
                  {!isCollapsed && <span>{navItem.label}</span>}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <Separator />

        {/* Alerts notification button */}
        <div className="p-3">
          <button
            onClick={onOpenAlerts}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
              'text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
              alertCount > 0 && 'relative',
              isCollapsed && 'justify-center'
            )}
            title={isCollapsed ? 'Alerts' : undefined}
          >
            <div className={cn('flex items-center gap-3', isCollapsed && 'relative')}>
              <Bell className={cn(
                'h-5 w-5',
                alertCount > 0 && 'animate-pulse text-red-600',
                isCollapsed && 'mx-auto'
              )} />
              {!isCollapsed && <span>Alerts</span>}
            </div>
            {alertCount > 0 && (
              <div className={cn('relative', isCollapsed && 'absolute -top-1 -right-1')}>
                <Badge
                  variant="destructive"
                  className={cn(
                    'h-5 min-w-5 flex items-center justify-center animate-pulse',
                    isCollapsed ? 'px-1 text-xs' : 'px-1.5'
                  )}
                >
                  {isCollapsed ? '!' : (alertCount > 99 ? '99+' : alertCount)}
                </Badge>
              </div>
            )}
          </button>
        </div>

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Version 1.0.0</div>
              <Link href="/help" className="text-blue-600 dark:text-blue-400 hover:underline">
                Help & Support
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
