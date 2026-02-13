import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { SallyOrb } from "../components/SallyOrb";
import { MockChat } from "../components/MockChat";
import { AnimatedText } from "../components/AnimatedText";
import { FadeIn } from "../components/FadeIn";
import { theme } from "../lib/theme";

const chatMessages = [
  {
    role: "user" as const,
    text: "Can driver 14 make Memphis on time?",
    delay: 200,
  },
  {
    role: "sally" as const,
    text: "Yes. 3.5 hours drive time. 1.2-hour buffer. HOS compliant through delivery.",
    delay: 250,
  },
];

export const TheNerve: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- PART A: Alert → Resolution (frames 0-170) ---
  const alertScale = spring({
    fps,
    frame: Math.max(0, frame - 15),
    config: { damping: 80, stiffness: 200 },
  });
  const alertOpacity = interpolate(frame, [15, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Alert resolves at frame 90
  const resolveProgress = interpolate(frame, [90, 105], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Part A fades out, Part B fades in
  const partAOpacity = interpolate(frame, [155, 170], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const partBOpacity = interpolate(frame, [170, 185], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Determine orb state based on frame
  const orbState =
    frame < 240 ? "idle" : frame < 260 ? "thinking" : "speaking";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* --- PART A: Alert + Resolution --- */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          opacity: partAOpacity,
        }}
      >
        <AnimatedText
          text="MONITOR · RESPOND"
          fontSize={48}
          color={theme.text}
          mode="fade"
          delay={0}
          style={{ fontWeight: 800, letterSpacing: "0.08em" }}
        />
        <AnimatedText
          text="A nervous system that never sleeps."
          fontSize={20}
          color={theme.dimmed}
          mode="fade"
          delay={10}
        />

        {/* Alert card */}
        <div
          style={{
            transform: `scale(${alertScale})`,
            opacity: alertOpacity,
            width: 550,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "18px 24px",
              borderRadius: 12,
              border: `1px solid ${resolveProgress > 0.5 ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`,
              backgroundColor:
                resolveProgress > 0.5
                  ? "rgba(34,197,94,0.05)"
                  : "rgba(234,179,8,0.05)",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor:
                  resolveProgress > 0.5
                    ? theme.alertGreen
                    : theme.alertYellow,
                boxShadow: `0 0 8px ${resolveProgress > 0.5 ? theme.alertGreen : theme.alertYellow}`,
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{
                  fontFamily: theme.font,
                  fontSize: 18,
                  fontWeight: 600,
                  color: theme.text,
                }}
              >
                {resolveProgress > 0.5 ? "Route Updated" : "HOS Warning"}
              </div>
              <div
                style={{
                  fontFamily: theme.font,
                  fontSize: 14,
                  color: theme.muted,
                  marginTop: 2,
                }}
              >
                {resolveProgress > 0.5
                  ? "Rest stop inserted at Mile 247. Driver compliant."
                  : "Driver J. Smith — 45 min remaining"}
              </div>
            </div>
            {resolveProgress > 0.5 && (
              <div
                style={{
                  marginLeft: "auto",
                  fontSize: 22,
                  color: theme.alertGreen,
                  opacity: interpolate(resolveProgress, [0.5, 1], [0, 1]),
                }}
              >
                ✓
              </div>
            )}
          </div>
        </div>

        <FadeIn delay={110}>
          <div
            style={{
              fontFamily: theme.font,
              fontSize: 16,
              color: theme.dimmed,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: theme.alertGreen,
                boxShadow: `0 0 6px ${theme.alertGreen}`,
              }}
            />
            24/7 monitoring. Proactive, not reactive.
          </div>
        </FadeIn>
      </div>

      {/* --- PART B: AI Chat --- */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          opacity: partBOpacity,
        }}
      >
        <AnimatedText
          text="It doesn't just monitor. It converses."
          fontSize={28}
          color={theme.muted}
          mode="fade"
          delay={175}
          style={{ fontStyle: "italic" }}
        />

        {/* Orb */}
        <SallyOrb state={orbState} size={60} delay={180} />

        {/* Chat */}
        <MockChat messages={chatMessages} width={600} />
      </div>
    </AbsoluteFill>
  );
};
