import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { GlowDot } from "./GlowDot";
import { theme } from "../lib/theme";

// Simplified route points (relative positions within 800x500 container)
const stops = [
  { x: 80, y: 400, label: "Dallas, TX" },
  { x: 250, y: 280, label: "Oklahoma City" },
  { x: 420, y: 180, label: "Wichita, KS" },
  { x: 560, y: 100, label: "Kansas City" },
  { x: 720, y: 80, label: "Chicago, IL" },
];

// SVG path through the stops
const pathD = "M 80 400 C 150 340, 200 300, 250 280 C 320 240, 370 200, 420 180 C 480 150, 520 120, 560 100 C 620 85, 680 80, 720 80";

export const MockMap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate the route line drawing
  const pathProgress = interpolate(frame, [0, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "relative",
        width: 800,
        height: 500,
      }}
    >
      {/* Grid lines for map feel */}
      <svg width={800} height={500} style={{ position: "absolute" }}>
        {/* Subtle grid */}
        {Array.from({ length: 10 }).map((_, i) => (
          <React.Fragment key={i}>
            <line
              x1={i * 80}
              y1={0}
              x2={i * 80}
              y2={500}
              stroke="#1a1a1a"
              strokeWidth={1}
            />
            <line
              x1={0}
              y1={i * 50}
              x2={800}
              y2={i * 50}
              stroke="#1a1a1a"
              strokeWidth={1}
            />
          </React.Fragment>
        ))}

        {/* Route line */}
        <path
          d={pathD}
          fill="none"
          stroke={theme.text}
          strokeWidth={2}
          strokeDasharray="1200"
          strokeDashoffset={1200 * (1 - pathProgress)}
          opacity={0.6}
        />
      </svg>

      {/* Stop dots */}
      {stops.map((stop, i) => (
        <GlowDot
          key={stop.label}
          x={stop.x}
          y={stop.y}
          label={stop.label}
          delay={15 + i * 18}
          size={10}
        />
      ))}
    </div>
  );
};
