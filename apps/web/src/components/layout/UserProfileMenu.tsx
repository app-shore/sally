'use client';

import { useRouter } from 'next/navigation';
import { User, Settings, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useSessionStore } from '@/lib/store/sessionStore';

export function UserProfileMenu() {
  const router = useRouter();
  const { user_id, user_type, logout } = useSessionStore();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const getInitials = (id: string) => {
    return id.slice(0, 2).toUpperCase();
  };

  const getRoleLabel = (type: string | null) => {
    if (type === 'dispatcher') return 'Dispatcher';
    if (type === 'driver') return 'Driver';
    return 'User';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-gray-300">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-black text-white text-sm">
              {user_id ? getInitials(user_id) : 'U'}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user_id || 'User'}</p>
            <Badge variant="secondary" className="w-fit text-xs">
              {getRoleLabel(user_type)}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
