import React from "react";
import { AbsoluteFill } from "remotion";
import { MockMap } from "../components/MockMap";
import { AnimatedText } from "../components/AnimatedText";
import { FadeIn } from "../components/FadeIn";
import { theme } from "../lib/theme";

const features = [
  { text: "Optimized Stop Sequence", delay: 60 },
  { text: "Auto Rest Stops", delay: 100 },
  { text: "Fuel Stop Insertion", delay: 140 },
];

export const RoutePlanning: React.FC = () => {
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
          gap: 40,
        }}
      >
        <FadeIn delay={0}>
          <AnimatedText
            text="Intelligent Route Planning"
            fontSize={40}
            color={theme.text}
            mode="fade"
            style={{ fontWeight: 700 }}
          />
        </FadeIn>

        <MockMap />

        {/* Feature labels below the map */}
        <div
          style={{
            display: "flex",
            gap: 60,
            marginTop: 20,
          }}
        >
          {features.map((f) => (
            <FadeIn key={f.text} delay={f.delay}>
              <div
                style={{
                  fontFamily: theme.font,
                  fontSize: 18,
                  color: theme.muted,
                  padding: "8px 20px",
                  border: `1px solid #333`,
                  borderRadius: 24,
                }}
              >
                {f.text}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
