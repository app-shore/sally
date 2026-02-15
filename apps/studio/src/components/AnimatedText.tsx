import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { theme } from "../lib/theme";

type AnimatedTextProps = {
  text: string;
  mode?: "typewriter" | "fade";
  fontSize?: number;
  color?: string;
  delay?: number;
  style?: React.CSSProperties;
};

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  mode = "fade",
  fontSize = 48,
  color = theme.text,
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (mode === "typewriter") {
    const charsToShow = interpolate(
      frame - delay,
      [0, text.length * 2],
      [0, text.length],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    return (
      <div
        style={{
          fontFamily: theme.font,
          fontSize,
          color,
          letterSpacing: "-0.02em",
          ...style,
        }}
      >
        {text.slice(0, Math.floor(charsToShow))}
        {Math.floor(charsToShow) < text.length && (
          <span style={{ opacity: frame % 15 < 8 ? 1 : 0 }}>|</span>
        )}
      </div>
    );
  }

  // Fade mode
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: { damping: 100, stiffness: 200 },
  });
  const y = interpolate(translateY, [0, 1], [20, 0]);

  return (
    <div
      style={{
        fontFamily: theme.font,
        fontSize,
        color,
        opacity,
        transform: `translateY(${y}px)`,
        letterSpacing: "-0.02em",
        ...style,
      }}
    >
      {text}
    </div>
  );
};
