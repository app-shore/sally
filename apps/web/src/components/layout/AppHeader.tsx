'use client';

import Link from 'next/link';
import { Menu, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UserProfileMenu } from './UserProfileMenu';
import { ThemeToggle } from './ThemeToggle';
import { CommandPalette } from './CommandPalette';
import { useSessionStore } from '@/lib/store/sessionStore';

interface AppHeaderProps {
  onToggleSidebar: () => void;
  alertCount: number;
  onOpenAlerts: () => void;
}

export function AppHeader({ onToggleSidebar, alertCount, onOpenAlerts }: AppHeaderProps) {
  const { user } = useSessionStore();

  const getRoleLabel = () => {
    const tenantName = user?.tenantName || 'Unknown Tenant';
    let roleView = 'SALLY';

    if (user?.role === 'DISPATCHER') roleView = 'Dispatcher View';
    if (user?.role === 'DRIVER') roleView = 'Driver View';
    if (user?.role === 'ADMIN') roleView = 'Admin View';

    return `${tenantName} • ${roleView}`;
  };

  return (
    <header className="h-16 border-b border-gray-200 bg-background z-50">
      <div className="h-full flex items-center justify-between px-4 md:px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {/* Mobile hamburger */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo - clickable to home */}
          <Link
            href="/"
            className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity font-space-grotesk"
            title="Back to Home"
            data-sally-logo
          >
            SALLY
          </Link>

          {/* Tagline - desktop only */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-xs text-gray-400">|</span>
            <p className="text-xs text-gray-500">
              Smart Routes. Confident Dispatchers. Happy Drivers.
            </p>
          </div>
        </div>

        {/* Center section - Role badge (desktop only) */}
        <div className="hidden md:block">
          <Badge variant="secondary" className="text-sm font-medium">
            {getRoleLabel()}
          </Badge>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Command Palette */}
          <CommandPalette />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Notifications bell */}
          <button
            onClick={onOpenAlerts}
            className="relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="View alerts"
          >
            <Bell className={`h-5 w-5 ${alertCount > 0 ? 'animate-pulse text-red-600' : ''}`} />
            {alertCount > 0 && (
              <>
                {/* Pulsating ring effect */}
                <span className="absolute top-2 right-2 h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                </span>
                {/* Alert count badge */}
                <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold z-10">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              </>
            )}
          </button>

          {/* User profile menu */}
          <UserProfileMenu />
        </div>
      </div>
    </header>
  );
}
