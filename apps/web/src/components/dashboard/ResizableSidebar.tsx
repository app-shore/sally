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
    <div
      ref={sidebarRef}
      className={`relative bg-white border-r border-gray-200 transition-all duration-300 ${
        isCollapsed ? "w-0" : ""
      }`}
      style={{ width: isCollapsed ? 0 : width }}
    >
      {/* Collapse/Expand Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-4 z-10 h-8 w-8 rounded-full border-2 border-gray-900 bg-white p-0 shadow-md hover:bg-gray-900 hover:text-white transition-all"
      >
        {isCollapsed ? (
          <ChevronRight className="h-5 w-5 text-gray-900" />
        ) : (
          <ChevronLeft className="h-5 w-5 text-gray-900" />
        )}
      </Button>

      {/* Sidebar Content */}
      <div
        className={`h-full overflow-y-auto ${isCollapsed ? "hidden" : ""}`}
      >
        {children}
      </div>

      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-gray-300 ${
            isResizing ? "bg-gray-400" : ""
          }`}
          onMouseDown={() => setIsResizing(true)}
        />
      )}
    </div>
  );
}
