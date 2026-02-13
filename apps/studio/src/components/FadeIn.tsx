import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

type FadeInProps = {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "none";
  style?: React.CSSProperties;
};

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  direction = "up",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const progress = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: { damping: 100, stiffness: 200 },
  });

  const offsetMap = { up: [30, 0], down: [-30, 0], none: [0, 0] };
  const translateY = interpolate(progress, [0, 1], offsetMap[direction]);

  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)`, ...style }}>
      {children}
    </div>
  );
};
