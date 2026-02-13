import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { FadeIn } from "../components/FadeIn";
import { theme } from "../lib/theme";

const checkmarks = [
  "Proactive HOS monitoring",
  "Automatic rest stop insertion",
  "Audit-ready documentation",
];

export const Compliance: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Big "0" springs in
  const zeroScale = spring({
    fps,
    frame: frame - 10,
    config: { damping: 60, stiffness: 150, mass: 1.2 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* Big zero */}
        <div
          style={{
            fontFamily: theme.font,
            fontSize: 180,
            fontWeight: 800,
            color: theme.text,
            letterSpacing: "-0.04em",
            transform: `scale(${zeroScale})`,
            lineHeight: 1,
          }}
        >
          0
        </div>

        <AnimatedText
          text="Zero HOS Violations"
          fontSize={36}
          color={theme.text}
          mode="fade"
          delay={30}
          style={{ fontWeight: 600 }}
        />

        {/* Checkmarks */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginTop: 24,
          }}
        >
          {checkmarks.map((item, i) => (
            <FadeIn key={item} delay={50 + i * 15}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontFamily: theme.font,
                  fontSize: 20,
                  color: theme.muted,
                }}
              >
                <span style={{ color: theme.alertGreen }}>✓</span>
                {item}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
