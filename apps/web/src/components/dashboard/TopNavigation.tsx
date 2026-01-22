"use client";

import { useState } from "react";
import { Gauge, History, Home, Menu, X } from "lucide-react";

interface TopNavigationProps {
  currentPage: "landing" | "engine" | "history";
  onNavigate: (page: "landing" | "engine" | "history") => void;
}

export function TopNavigation({ currentPage, onNavigate }: TopNavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (page: "landing" | "engine" | "history") => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleNavigate("landing")}
            className="text-lg sm:text-xl font-bold text-gray-900 hover:text-gray-700"
          >
            REST-OS
          </button>
          <span className="hidden sm:inline text-xs text-gray-400">|</span>
          <p className="hidden sm:block text-xs text-gray-500">
            Rest Optimization System
          </p>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          <NavButton
            icon={<Home className="h-4 w-4" />}
            label="Home"
            active={currentPage === "landing"}
            onClick={() => handleNavigate("landing")}
          />
          <NavButton
            icon={<Gauge className="h-4 w-4" />}
            label="Engine"
            active={currentPage === "engine"}
            onClick={() => handleNavigate("engine")}
          />
          <NavButton
            icon={<History className="h-4 w-4" />}
            label="History"
            active={currentPage === "history"}
            onClick={() => handleNavigate("history")}
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
            <MobileNavButton
              icon={<Home className="h-4 w-4" />}
              label="Home"
              active={currentPage === "landing"}
              onClick={() => handleNavigate("landing")}
            />
            <MobileNavButton
              icon={<Gauge className="h-4 w-4" />}
              label="Engine"
              active={currentPage === "engine"}
              onClick={() => handleNavigate("engine")}
            />
            <MobileNavButton
              icon={<History className="h-4 w-4" />}
              label="History"
              active={currentPage === "history"}
              onClick={() => handleNavigate("history")}
            />
          </div>
        </div>
      )}
    </nav>
  );
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavButton({ icon, label, active, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-3 lg:px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-gray-900 text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

interface MobileNavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function MobileNavButton({ icon, label, active, onClick }: MobileNavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors w-full ${
        active
          ? "bg-gray-900 text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
