"use client";

import { useState } from "react";
import { Gauge, History, Home, Menu, X, Route } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Determine active page from pathname
  const getActivePage = () => {
    if (pathname === '/') return 'home';
    if (pathname === '/route-planner') return 'route-planner';
    if (pathname === '/history') return 'history';
    if (pathname === '/rest-optimizer') return 'rest-optimizer';
    return 'home';
  };

  const activePage = getActivePage();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-lg sm:text-xl font-bold text-gray-900 hover:text-gray-700">
            SALLY
          </Link>
          <span className="hidden sm:inline text-xs text-gray-400">|</span>
          <p className="hidden sm:block text-xs text-gray-500">
            Rest Optimization System
          </p>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink
            icon={<Home className="h-4 w-4" />}
            label="Home"
            active={activePage === "home"}
            href="/"
          />
          <NavLink
            icon={<Route className="h-4 w-4" />}
            label="Route Planner"
            active={activePage === "route-planner"}
            href="/route-planner"
          />
          <NavLink
            icon={<Gauge className="h-4 w-4" />}
            label="REST Optimizer"
            active={activePage === "rest-optimizer"}
            href="/rest-optimizer"
          />


        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-md hover:bg-gray-100"
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
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="flex flex-col p-2 space-y-1">
            <MobileNavLink
              icon={<Home className="h-4 w-4" />}
              label="Home"
              active={activePage === "home"}
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <MobileNavLink
              icon={<Route className="h-4 w-4" />}
              label="Route Planner"
              active={activePage === "route-planner"}
              href="/simulator"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <MobileNavLink
              icon={<History className="h-4 w-4" />}
              label="History"
              active={activePage === "history"}
              href="/history"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <MobileNavLink
              icon={<Gauge className="h-4 w-4" />}
              label="REST Optimizer"
              active={activePage === "rest-optimizer"}
              href="/rest-optimizer"
              onClick={() => setIsMobileMenuOpen(false)}
            />
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
            ? "bg-gray-900 text-white"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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
            ? "bg-gray-900 text-white"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        {icon}
        {label}
      </div>
    </Link>
  );
}
