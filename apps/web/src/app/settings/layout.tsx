'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/features/auth';
import { Settings, Bell, Route, AlertTriangle, Plug, Key, Map } from 'lucide-react';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Separator } from '@/shared/components/ui/separator';
import { cn } from '@/shared/lib/utils';

interface SettingsNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface SettingsNavSection {
  label: string;
  items: SettingsNavItem[];
  roles?: string[];
}

const settingsSections: SettingsNavSection[] = [
  {
    label: 'Personal',
    items: [
      { label: 'General', href: '/settings/general', icon: Settings },
      { label: 'Notifications', href: '/settings/notifications', icon: Bell },
    ],
  },
  {
    label: 'Organization',
    items: [
      { label: 'Route Planning', href: '/settings/route-planning', icon: Route },
      { label: 'Alerts', href: '/settings/alerts', icon: AlertTriangle },
    ],
    roles: ['DISPATCHER', 'ADMIN', 'OWNER'],
  },
  {
    label: 'Connections',
    items: [
      { label: 'Integrations', href: '/settings/integrations', icon: Plug },
      { label: 'API Keys', href: '/settings/api-keys', icon: Key },
    ],
    roles: ['ADMIN', 'OWNER'],
  },
];

const driverSections: SettingsNavSection[] = [
  {
    label: 'Personal',
    items: [
      { label: 'General', href: '/settings/general', icon: Settings },
      { label: 'Notifications', href: '/settings/notifications', icon: Bell },
      { label: 'Route Display', href: '/settings/driver', icon: Map },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const userRole = user?.role;

  const isDriver = userRole === 'DRIVER';
  const sections = isDriver ? driverSections : settingsSections;

  const visibleSections = sections.filter((section) => {
    if (!section.roles) return true;
    return section.roles.includes(userRole || '');
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your preferences and organization configuration.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <nav className="w-full md:w-56 shrink-0">
          {/* Mobile: horizontal scroll strip */}
          <div className="flex md:hidden gap-1 overflow-x-auto pb-2">
            {visibleSections.flatMap((section) =>
              section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })
            )}
          </div>

          {/* Desktop: vertical sidebar */}
          <ScrollArea className="hidden md:block">
            <div className="space-y-4">
              {visibleSections.map((section, idx) => (
                <div key={section.label}>
                  {idx > 0 && <Separator className="mb-4" />}
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                    {section.label}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-black text-white dark:bg-white dark:text-black'
                              : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
