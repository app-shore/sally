'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/features/auth';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Separator } from '@/shared/components/ui/separator';
import { getNavigationForRole, type NavItem } from '@/shared/lib/navigation';
import { useOnboardingStore } from '@/features/platform/onboarding';
import { CheckCircle2 } from 'lucide-react';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppSidebar({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { status, criticalIncompleteCount, recommendedIncompleteCount } = useOnboardingStore();

  // Get navigation items from centralized config
  const navItems = getNavigationForRole(user?.role);

  // Setup Hub badge logic
  const getSetupHubBadge = () => {
    if (!status) return null;

    if (!status.criticalComplete && criticalIncompleteCount > 0) {
      return (
        <Badge variant="destructive" className="h-5 min-w-5 px-1">
          {criticalIncompleteCount}
        </Badge>
      );
    }

    if (!status.recommendedComplete && recommendedIncompleteCount > 0) {
      return (
        <Badge className="h-5 min-w-5 px-1 bg-amber-500 text-white dark:bg-amber-600">
          {recommendedIncompleteCount}
        </Badge>
      );
    }

    if (status.criticalComplete && status.recommendedComplete && status.optionalComplete) {
      return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
    }

    return null;
  };

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
          user?.role === 'DRIVER' ? 'bg-muted' : 'bg-background',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
          isCollapsed ? 'md:w-16' : 'md:w-64',
          'w-64'
        )}
      >
        {/* Collapse toggle button (desktop only) */}
        <div className="hidden md:flex justify-end p-2 border-b border-border">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
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

              const navItem = item as NavItem;
              const settingsPrefix = '/settings';
              const isActive = navItem.href.startsWith(settingsPrefix)
                ? pathname?.startsWith(settingsPrefix)
                : pathname === navItem.href || pathname?.startsWith(navItem.href + '/');
              const Icon = navItem.icon;
              const isSetupHub = navItem.href === '/setup-hub';
              const showBadge = isSetupHub && (user?.role === 'OWNER' || user?.role === 'ADMIN');

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
                      : 'text-foreground hover:bg-muted',
                    isCollapsed && 'justify-center'
                  )}
                  title={isCollapsed ? navItem.label : undefined}
                >
                  <Icon className={cn('h-5 w-5', isCollapsed && 'mx-auto')} />
                  {!isCollapsed && <span>{navItem.label}</span>}
                  {!isCollapsed && showBadge && (
                    <div className="ml-auto">{getSetupHubBadge()}</div>
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

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

export default AppSidebar;
