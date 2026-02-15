import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { PulsingDot } from "../components/PulsingDot";
import { theme } from "../lib/theme";

export const Stillness: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "SALLY" emerges from blur after dot settles
  const textDelay = 60;
  const textProgress = spring({
    fps,
    frame: Math.max(0, frame - textDelay),
    config: { damping: 100, stiffness: 150 },
  });

  const textOpacity = interpolate(frame - textDelay, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const textBlur = interpolate(textProgress, [0, 1], [12, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Pulsing dot */}
      <div style={{ position: "absolute" }}>
        <PulsingDot size={14} delay={20} />
      </div>

      {/* SALLY text emerging from blur */}
      <div
        style={{
          position: "absolute",
          marginTop: 100,
          fontFamily: theme.font,
          fontSize: 72,
          fontWeight: 800,
          color: theme.text,
          letterSpacing: "-0.04em",
          opacity: textOpacity,
          filter: `blur(${textBlur}px)`,
        }}
      >
        SALLY
      </div>
    </AbsoluteFill>
  );
};
