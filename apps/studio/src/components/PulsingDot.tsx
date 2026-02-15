import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

type PulsingDotProps = {
  size?: number;
  color?: string;
  delay?: number;
  style?: React.CSSProperties;
};

export const PulsingDot: React.FC<PulsingDotProps> = ({
  size = 16,
  color = "#FFFFFF",
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dot appears with spring
  const appear = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: { damping: 80, stiffness: 200 },
  });

  // Continuous pulse (cycles every 60 frames = 2 seconds)
  const pulseFrame = Math.max(0, frame - delay - 15);
  const pulse = Math.sin((pulseFrame / 60) * Math.PI * 2) * 0.3 + 0.7;

  // Glow radius pulses
  const glowSize = size * 6 * pulse;
  const glowOpacity = interpolate(pulse, [0.4, 1], [0.08, 0.2]);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${appear})`,
        ...style,
      }}
    >
      {/* Outer glow */}
      <div
        style={{
          position: "absolute",
          width: glowSize,
          height: glowSize,
          borderRadius: "50%",
          backgroundColor: color,
          opacity: glowOpacity,
          filter: "blur(30px)",
        }}
      />
      {/* Inner glow */}
      <div
        style={{
          position: "absolute",
          width: size * 2.5,
          height: size * 2.5,
          borderRadius: "50%",
          backgroundColor: color,
          opacity: 0.15 * pulse,
          filter: "blur(10px)",
        }}
      />
      {/* Core dot */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          position: "relative",
        }}
      />
    </div>
  );
};
