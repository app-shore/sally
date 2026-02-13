import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { SallyOrb } from "../components/SallyOrb";
import { AnimatedText } from "../components/AnimatedText";
import { theme } from "../lib/theme";

export const Invitation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    fps,
    frame: Math.max(0, frame - 60),
    config: { damping: 80, stiffness: 200 },
  });

  const ctaOpacity = interpolate(frame, [130, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
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
          gap: 20,
        }}
      >
        {/* Orb */}
        <SallyOrb state="idle" size={50} delay={10} />

        {/* "Give your fleet a nervous system" */}
        <AnimatedText
          text="Give your fleet a nervous system."
          fontSize={38}
          color={theme.text}
          mode="fade"
          delay={30}
          style={{ fontWeight: 600 }}
        />

        {/* SALLY logo */}
        <div
          style={{
            fontFamily: theme.font,
            fontSize: 72,
            fontWeight: 800,
            color: theme.text,
            letterSpacing: "-0.04em",
            transform: `scale(${logoScale})`,
            marginTop: 8,
          }}
        >
          SALLY
        </div>

        {/* CTA */}
        <div style={{ opacity: ctaOpacity, marginTop: 16 }}>
          <div
            style={{
              fontFamily: theme.font,
              fontSize: 20,
              color: theme.text,
              padding: "14px 40px",
              border: "1px solid #444",
              borderRadius: 32,
              letterSpacing: "0.05em",
            }}
          >
            Request a demo → sally.appshore.in
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
