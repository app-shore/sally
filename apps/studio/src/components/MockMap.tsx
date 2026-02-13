import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { GlowDot } from "./GlowDot";
import { HOSBar } from "./HOSBar";
import { theme } from "../lib/theme";

const stops = [
  { x: 80, y: 380, label: "Dallas, TX", type: "stop" as const },
  { x: 220, y: 270, label: "Oklahoma City", type: "stop" as const },
  { x: 370, y: 190, label: "Wichita, KS", type: "stop" as const },
  { x: 440, y: 240, label: "10h Rest — HOS Compliant", type: "rest" as const },
  { x: 520, y: 145, label: "Fuel · $3.42/gal", type: "fuel" as const },
  { x: 600, y: 100, label: "Kansas City", type: "stop" as const },
  { x: 730, y: 80, label: "Chicago, IL", type: "stop" as const },
];

const pathD =
  "M 80 380 C 140 330, 180 290, 220 270 C 280 230, 330 210, 370 190 C 390 200, 420 230, 440 240 C 470 220, 500 170, 520 145 C 550 125, 580 110, 600 100 C 650 90, 700 82, 730 80";

const colorMap = {
  stop: "#FFFFFF",
  rest: theme.alertGreen,
  fuel: theme.alertBlue,
};

export const MockMap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pathProgress = interpolate(frame, [10, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "relative", width: 800, height: 480 }}>
      {/* Grid */}
      <svg width={800} height={440} style={{ position: "absolute" }}>
        {Array.from({ length: 11 }).map((_, i) => (
          <React.Fragment key={i}>
            <line x1={i * 80} y1={0} x2={i * 80} y2={440} stroke="#111" strokeWidth={1} />
            <line x1={0} y1={i * 44} x2={800} y2={i * 44} stroke="#111" strokeWidth={1} />
          </React.Fragment>
        ))}

        {/* Route line */}
        <path
          d={pathD}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={2}
          strokeDasharray="1500"
          strokeDashoffset={1500 * (1 - pathProgress)}
          opacity={0.5}
        />
      </svg>

      {/* Stop dots */}
      {stops.map((stop, i) => {
        const baseDelay = stop.type === "stop" ? 20 + i * 15 : 80 + i * 10;
        return (
          <GlowDot
            key={stop.label}
            x={stop.x}
            y={stop.y}
            label={stop.label}
            delay={baseDelay}
            size={stop.type === "stop" ? 8 : 10}
            color={colorMap[stop.type]}
          />
        );
      })}

      {/* HOS Bar at bottom */}
      <div style={{ position: "absolute", bottom: 0, left: 50, right: 50 }}>
        <HOSBar delay={30} width={700} />
      </div>
    </div>
  );
};
