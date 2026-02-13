import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { theme } from "../lib/theme";

type CounterProps = {
  from?: number;
  to: number;
  suffix?: string;
  prefix?: string;
  fontSize?: number;
  delay?: number;
  duration?: number;
};

export const Counter: React.FC<CounterProps> = ({
  from = 0,
  to,
  suffix = "",
  prefix = "",
  fontSize = 120,
  delay = 0,
  duration = 30,
}) => {
  const frame = useCurrentFrame();
  const value = interpolate(frame - delay, [0, duration], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontFamily: theme.font,
        fontSize,
        fontWeight: 800,
        color: theme.text,
        letterSpacing: "-0.04em",
      }}
    >
      {prefix}
      {Math.round(value)}
      {suffix}
    </div>
  );
};
