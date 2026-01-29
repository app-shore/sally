"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResizableSidebarProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function ResizableSidebar({
  children,
  defaultWidth = 320,
  minWidth = 280,
  maxWidth = 600,
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth]);

  return (
    <div className="relative flex h-full">
      <div
        ref={sidebarRef}
        className={`relative bg-background border-r border-border transition-all duration-300 flex flex-col ${
          isCollapsed ? "w-0 border-r-0" : ""
        }`}
        style={{ width: isCollapsed ? 0 : width }}
      >
        {/* Sidebar Content */}
        <div
          className={`flex-1 overflow-y-auto overflow-x-hidden ${isCollapsed ? "hidden" : ""}`}
        >
          {children}
        </div>

        {/* Resize Handle */}
        {!isCollapsed && (
          <div
            className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-gray-300 dark:hover:bg-gray-600 ${
              isResizing ? "bg-gray-400 dark:bg-gray-500" : ""
            }`}
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      {/* Collapse/Expand Button - always visible */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-4 z-10 h-6 w-6 rounded-full border border-border bg-background p-0 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        style={{ left: isCollapsed ? -4 : width - 12 }}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
