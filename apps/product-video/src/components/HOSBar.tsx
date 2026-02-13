import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { theme } from "../lib/theme";

type HOSBarProps = {
  delay?: number;
  width?: number;
};

export const HOSBar: React.FC<HOSBarProps> = ({
  delay = 0,
  width = 700,
}) => {
  const frame = useCurrentFrame();

  // Bar fades in
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Hours count down from 11 to 3.2, then back up to 8.5 (after rest inserted)
  const hours = (() => {
    const t = frame - delay;
    if (t < 0) return 11;
    if (t < 120) {
      // Count down: 11 → 3.2 over 120 frames
      return interpolate(t, [0, 120], [11, 3.2], {
        extrapolateRight: "clamp",
      });
    }
    // After rest inserted, jump back up: 3.2 → 8.5
    return interpolate(t, [120, 150], [3.2, 8.5], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  })();

  const percentage = (hours / 11) * 100;
  const barColor =
    hours > 5 ? theme.alertGreen : hours > 2 ? theme.alertYellow : theme.alertRed;

  return (
    <div style={{ opacity, width }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: theme.font,
          fontSize: 13,
          color: theme.dimmed,
          marginBottom: 6,
        }}
      >
        <span>HOS Remaining</span>
        <span style={{ color: barColor, fontWeight: 600 }}>
          {hours.toFixed(1)}h
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: 6,
          borderRadius: 3,
          backgroundColor: "#1a1a1a",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            borderRadius: 3,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
};
