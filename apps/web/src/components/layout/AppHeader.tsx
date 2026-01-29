'use client';

import Link from 'next/link';
import { Menu, Bell, Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserProfileMenu } from './UserProfileMenu';
import { useSessionStore } from '@/lib/store/sessionStore';

interface AppHeaderProps {
  onToggleSidebar: () => void;
  alertCount: number;
  onOpenAlerts: () => void;
}

export function AppHeader({ onToggleSidebar, alertCount, onOpenAlerts }: AppHeaderProps) {
  const { user_type } = useSessionStore();

  const getRoleLabel = () => {
    if (user_type === 'dispatcher') return 'Dispatcher View';
    if (user_type === 'driver') return 'Driver View';
    return 'SALLY';
  };

  const getDashboardLink = () => {
    if (user_type === 'dispatcher') return '/dispatcher/overview';
    if (user_type === 'driver') return '/driver/dashboard';
    return '/';
  };

  return (
    <header className="h-16 border-b border-gray-200 bg-white sticky top-0 z-30">
      <div className="h-full flex items-center justify-between px-4 md:px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {/* Mobile hamburger */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors md:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo - clickable to dashboard */}
          <Link
            href={getDashboardLink()}
            className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
            title="Back to Dashboard"
          >
            SALLY
          </Link>

          {/* Home link (back to landing) - desktop only */}
          <Link href="/" className="hidden md:block">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>

        {/* Center section - Role badge (desktop only) */}
        <div className="hidden md:block">
          <Badge variant="secondary" className="text-sm font-medium">
            {getRoleLabel()}
          </Badge>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-4">
          {/* Notifications bell */}
          <button
            onClick={onOpenAlerts}
            className="relative p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="View alerts"
          >
            <Bell className="h-5 w-5" />
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {/* User profile menu */}
          <UserProfileMenu />
        </div>
      </div>
    </header>
  );
}
