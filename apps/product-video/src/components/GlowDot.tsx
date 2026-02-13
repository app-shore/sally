import React from "react";
import { useCurrentFrame, spring, useVideoConfig } from "remotion";

type GlowDotProps = {
  x: number;
  y: number;
  delay?: number;
  size?: number;
  color?: string;
  label?: string;
};

export const GlowDot: React.FC<GlowDotProps> = ({
  x,
  y,
  delay = 0,
  size = 12,
  color = "#FFFFFF",
  label,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: { damping: 80, stiffness: 300 },
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${scale})`,
      }}
    >
      {/* Glow */}
      <div
        style={{
          width: size * 3,
          height: size * 3,
          borderRadius: "50%",
          backgroundColor: color,
          opacity: 0.15,
          filter: "blur(8px)",
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Dot */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          position: "relative",
        }}
      />
      {/* Label */}
      {label && (
        <div
          style={{
            position: "absolute",
            top: size + 8,
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 14,
            color: "#A0A0A0",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
