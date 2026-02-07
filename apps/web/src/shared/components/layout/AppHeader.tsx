'use client';

import Link from 'next/link';
import { Menu, Bell } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { UserProfileMenu } from './UserProfileMenu';
import { ThemeToggle } from './ThemeToggle';
import { CommandPalette } from './CommandPalette';
import { NotificationCenter } from './NotificationCenter';
import { useAuthStore } from '@/features/auth';

interface AppHeaderProps {
  onToggleSidebar: () => void;
  alertCount: number;
  onOpenAlerts: () => void;
}

export function AppHeader({ onToggleSidebar, alertCount, onOpenAlerts }: AppHeaderProps) {
  const { user } = useAuthStore();

  const getRoleLabel = () => {
    const tenantName = user?.tenantName || 'Unknown Tenant';
    let roleView = 'SALLY';

    if (user?.role === 'DISPATCHER') roleView = 'Dispatcher View';
    if (user?.role === 'DRIVER') roleView = 'Driver View';
    if (user?.role === 'ADMIN') roleView = 'Admin View';
    if (user?.role === 'OWNER') roleView = 'Admin View';

    return `${tenantName} • ${roleView}`;
  };

  return (
    <header className="h-16 border-b border-border bg-background z-50">
      <div className="h-full flex items-center justify-between px-4 md:px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {/* Mobile hamburger */}
          <Button
            onClick={onToggleSidebar}
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo - clickable to home */}
          <Link
            href="/"
            className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity font-space-grotesk"
            title="Go to Home"
            data-sally-logo
          >
            SALLY
          </Link>

          {/* Tagline - desktop only */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-xs text-muted-foreground">|</span>
            <p className="text-xs text-muted-foreground">
              Smart Routes. Confident Dispatchers. Happy Drivers.
            </p>
          </div>
        </div>

        {/* Center section - Role badge (desktop only) */}
        <div className="hidden md:block">
          <Badge variant="muted" className="text-sm font-medium">
            {getRoleLabel()}
          </Badge>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1">
          {/* Command Palette */}
          <CommandPalette />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Notification Center (popover) */}
          <NotificationCenter />

          {/* Alerts bell (opens slide-out panel) */}
          <Button
            onClick={onOpenAlerts}
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="View alerts"
          >
            <Bell className={`h-5 w-5 ${alertCount > 0 ? 'animate-pulse text-red-600 dark:text-red-400' : ''}`} />
            {alertCount > 0 && (
              <>
                {/* Pulsating ring effect */}
                <span className="absolute top-1.5 right-1.5 h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                </span>
                {/* Alert count badge */}
                <span className="absolute top-0.5 right-0.5 h-4 w-4 bg-red-500 dark:bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-semibold z-10">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              </>
            )}
          </Button>

          {/* User profile menu */}
          <UserProfileMenu />
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
