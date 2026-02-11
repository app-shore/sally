'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, LogIn, LogOut, ArrowRight, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import { Button } from '@/shared/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { getDefaultRouteForRole } from '@/shared/lib/navigation';

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * PublicLayout - Layout for unauthenticated pages (landing, login)
 * Provides minimal header with branding, login button, and theme toggle
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { isAuthenticated, user, signOut } = useAuthStore();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (err) {
      console.error('Logout failed:', err);
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Public Header */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          {/* Logo and tagline */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-lg sm:text-xl font-bold text-foreground hover:text-muted-foreground transition-opacity font-space-grotesk"
              data-sally-logo
            >
              SALLY
            </Link>
            <span className="hidden sm:inline text-xs text-gray-400">|</span>
            <p className="hidden sm:block text-xs text-gray-500">
              Smart Routes. Confident Dispatchers. Happy Drivers.
            </p>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />

            {/* User info if authenticated */}
            {isAuthenticated && user && (
              <div className="text-sm text-muted-foreground mr-4">
                <span className="font-medium">
                  {user.firstName} {user.lastName}
                </span>
                <span className="mx-2">·</span>
                <span className="text-xs">{user.tenantName}</span>
              </div>
            )}

            {/* Login/Logout */}
            {!isAuthenticated ? (
              <>
                <Link href="/register">
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Register
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="sm">
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href={getDefaultRouteForRole(user?.role)}>
                  <Button size="sm">
                    Go to App
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-2">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <div className="flex flex-col p-2 space-y-1">
              {/* Theme toggle on mobile */}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Theme
                </span>
                <ThemeToggle />
              </div>

              {/* Login/Logout on mobile */}
              {!isAuthenticated ? (
                <>
                  <Link href="/register" className="w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Register
                    </Button>
                  </Link>
                  <Link href="/login" className="w-full">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Login
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href={getDefaultRouteForRole(user?.role)} className="w-full">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Go to App
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}

export default PublicLayout;
