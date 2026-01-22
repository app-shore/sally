"use client";

import { Gauge, History, Home } from "lucide-react";

interface TopNavigationProps {
  currentPage: "landing" | "engine" | "history";
  onNavigate: (page: "landing" | "engine" | "history") => void;
}

export function TopNavigation({ currentPage, onNavigate }: TopNavigationProps) {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("landing")}
            className="text-xl font-bold text-gray-900 hover:text-gray-700"
          >
            REST-OS
          </button>
          <span className="text-xs text-gray-400">|</span>
          <p className="text-xs text-gray-500">
            Rest Optimization System
          </p>
        </div>

        <div className="flex items-center gap-1">
          <NavButton
            icon={<Home className="h-4 w-4" />}
            label="Home"
            active={currentPage === "landing"}
            onClick={() => onNavigate("landing")}
          />
          <NavButton
            icon={<Gauge className="h-4 w-4" />}
            label="Engine"
            active={currentPage === "engine"}
            onClick={() => onNavigate("engine")}
          />
          <NavButton
            icon={<History className="h-4 w-4" />}
            label="History"
            active={currentPage === "history"}
            onClick={() => onNavigate("history")}
          />
        </div>
      </div>
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
      className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
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
