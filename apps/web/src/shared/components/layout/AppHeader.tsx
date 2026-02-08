'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { UserProfileMenu } from './UserProfileMenu';
import { ThemeToggle } from './ThemeToggle';
import { CommandPalette } from './CommandPalette';
import { NotificationCenter } from './NotificationCenter';
import { AlertsPopover } from './AlertsPopover';
import { useAuthStore } from '@/features/auth';

interface AppHeaderProps {
  onToggleSidebar: () => void;
  alertCount: number;
}

export function AppHeader({ onToggleSidebar, alertCount }: AppHeaderProps) {
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

          {/* Alerts popover */}
          <AlertsPopover alertCount={alertCount} />

          {/* User profile menu */}
          <UserProfileMenu />
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
