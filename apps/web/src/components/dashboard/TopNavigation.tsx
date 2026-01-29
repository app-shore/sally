"use client";

import { useState } from "react";
import { Gauge, History, Home, Menu, X, Route, Settings, Truck, LogOut, LogIn } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/sessionStore";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function TopNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout: sessionLogout } = useSessionStore();

  // Determine active page from pathname
  const getActivePage = () => {
    if (pathname === '/') return 'home';
    if (pathname === '/route-planner') return 'route-planner';
    if (pathname === '/dispatcher') return 'dispatcher';
    if (pathname === '/driver') return 'driver';
    if (pathname === '/config') return 'config';
    if (pathname === '/rest-optimizer') return 'rest-optimizer';
    return 'home';
  };

  const activePage = getActivePage();

  const handleLogout = async () => {
    try {
      await sessionLogout();
      router.push('/');
    } catch (err) {
      console.error('Logout failed:', err);
      router.push('/');
    }
  };

  return (
    <nav className="border-b border-border bg-background">
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-lg sm:text-xl font-bold text-foreground hover:text-muted-foreground">
            SALLY
          </Link>
          <span className="hidden sm:inline text-xs text-muted-foreground">|</span>
          <p className="hidden sm:block text-xs text-muted-foreground">
            Dispatch & Driver Coordination
          </p>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
          {/* Theme toggle */}
          <ThemeToggle />

          {/* User info */}
          {isAuthenticated && user && (
            <div className="text-sm text-muted-foreground mr-4">
              <span className="font-medium">{user.firstName} {user.lastName}</span>
              <span className="mx-2">·</span>
              <span className="text-xs">{user.tenantName}</span>
            </div>
          )}

          {!isAuthenticated ? (
            <>
              <Link href="/login">
                <Button
                  size="sm"
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
              </Link>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="ml-2"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="flex flex-col p-2 space-y-1">
            {/* Theme toggle on mobile */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Theme</span>
              <ThemeToggle />
            </div>

            {!isAuthenticated ? (
              <Link href="/login" className="w-full">
                <Button
                  size="sm"
                  className="w-full bg-black hover:bg-gray-800 text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
              </Link>
            ) : (
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 hover:text-gray-900 w-full"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

interface NavLinkProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  href: string;
}

function NavLink({ icon, label, active, href }: NavLinkProps) {
  return (
    <Link href={href}>
      <div
        className={`flex items-center gap-2 rounded-md px-3 lg:px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
          active
            ? "bg-gray-900 dark:bg-gray-800 text-white"
            : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground"
        }`}
      >
        {icon}
        <span className="hidden lg:inline">{label}</span>
      </div>
    </Link>
  );
}

interface MobileNavLinkProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  href: string;
  onClick?: () => void;
}

function MobileNavLink({ icon, label, active, href, onClick }: MobileNavLinkProps) {
  return (
    <Link href={href} className="w-full">
      <div
        onClick={onClick}
        className={`flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors w-full cursor-pointer ${
          active
            ? "bg-gray-900 dark:bg-gray-800 text-white"
            : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground"
        }`}
      >
        {icon}
        {label}
      </div>
    </Link>
  );
}
