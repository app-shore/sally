'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Plus, Truck, Settings, Bell, Map, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/lib/store/sessionStore';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  alertCount: number;
  onOpenAlerts: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function AppSidebar({ isOpen, onClose, alertCount, onOpenAlerts }: AppSidebarProps) {
  const pathname = usePathname();
  const { user_type } = useSessionStore();

  const dispatcherNavItems: NavItem[] = [
    { label: 'Overview', href: '/dispatcher/overview', icon: <Home className="h-5 w-5" /> },
    { label: 'Create Plan', href: '/dispatcher/create-plan', icon: <Plus className="h-5 w-5" /> },
    { label: 'Active Routes', href: '/dispatcher/active-routes', icon: <Truck className="h-5 w-5" /> },
    { label: 'Route Planner', href: '/route-planner', icon: <Map className="h-5 w-5" /> },
    { label: 'REST Optimizer', href: '/rest-optimizer', icon: <Settings className="h-5 w-5" /> },
    { label: 'Settings', href: '/settings', icon: <Settings className="h-5 w-5" /> },
  ];

  const driverNavItems: NavItem[] = [
    { label: 'My Dashboard', href: '/driver/dashboard', icon: <Home className="h-5 w-5" /> },
    { label: 'Current Route', href: '/driver/current-route', icon: <Map className="h-5 w-5" /> },
    { label: 'Messages', href: '/driver/messages', icon: <MessageSquare className="h-5 w-5" /> },
    { label: 'Settings', href: '/settings', icon: <Settings className="h-5 w-5" /> },
  ];

  const navItems = user_type === 'dispatcher' ? dispatcherNavItems : driverNavItems;

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
          'fixed left-0 top-0 h-screen w-64 z-50 transition-transform duration-300 ease-in-out',
          'border-r border-gray-200 flex flex-col',
          user_type === 'driver' ? 'bg-gray-50' : 'bg-white',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 md:hidden">
          <span className="text-xl font-bold">SALLY</span>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              const showSeparator = user_type === 'dispatcher' && index === 3; // After Active Routes

              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                      'text-sm font-medium',
                      isActive
                        ? 'bg-black text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                  {showSeparator && (
                    <div className="my-2">
                      <Separator />
                      <p className="text-xs text-gray-500 px-3 py-2">Tools</p>
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
              'text-sm font-medium text-gray-700 hover:bg-gray-100'
            )}
          >
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5" />
              <span>Alerts</span>
            </div>
            {alertCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center px-1.5">
                {alertCount > 99 ? '99+' : alertCount}
              </Badge>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div>Version 1.0.0</div>
            <Link href="/help" className="text-blue-600 hover:underline">
              Help & Support
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
