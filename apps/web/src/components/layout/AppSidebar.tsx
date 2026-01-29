'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/lib/store/sessionStore';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getNavigationForRole } from '@/lib/navigation';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  alertCount: number;
  onOpenAlerts: () => void;
}

export function AppSidebar({ isOpen, onClose, alertCount, onOpenAlerts }: AppSidebarProps) {
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
          'fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 z-40 transition-transform duration-300 ease-in-out',
          'border-r border-border flex flex-col',
          user?.role === 'DRIVER' ? 'bg-gray-50 dark:bg-gray-900' : 'bg-background',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              const showSeparator = user?.role !== 'DRIVER' && index === 3; // After Active Routes
              const Icon = item.icon;

              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                      'text-sm font-medium',
                      isActive
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'text-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                  {showSeparator && (
                    <div className="my-2">
                      <Separator />
                      <p className="text-xs text-muted-foreground px-3 py-2">Tools</p>
                    </div>
                  )}
                </div>
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
              'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md transition-colors',
              'text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
              alertCount > 0 && 'relative'
            )}
          >
            <div className="flex items-center gap-3">
              <Bell className={`h-5 w-5 ${alertCount > 0 ? 'animate-pulse text-red-600' : ''}`} />
              <span>Alerts</span>
            </div>
            {alertCount > 0 && (
              <div className="relative">
                <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center px-1.5 animate-pulse">
                  {alertCount > 99 ? '99+' : alertCount}
                </Badge>
              </div>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Version 1.0.0</div>
            <Link href="/help" className="text-blue-600 dark:text-blue-400 hover:underline">
              Help & Support
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
