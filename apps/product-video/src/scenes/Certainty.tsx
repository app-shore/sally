import React from "react";
import {
  AbsoluteFill,
} from "remotion";
import { Counter } from "../components/Counter";
import { FadeIn } from "../components/FadeIn";
import { AnimatedText } from "../components/AnimatedText";
import { theme } from "../lib/theme";

const stats = [
  { to: 185000, prefix: "$", suffix: "+", label: "saved annually (50-truck fleet)", delay: 10, duration: 50 },
  { to: 520, prefix: "", suffix: "", label: "dispatcher hours recovered per year", delay: 40, duration: 40 },
  { to: 100, prefix: "", suffix: "%", label: "HOS compliant", delay: 70, duration: 30 },
];

export const Certainty: React.FC = () => {
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
          gap: 48,
        }}
      >
        {/* Stats row */}
        <div style={{ display: "flex", gap: 80 }}>
          {stats.map((stat) => (
            <FadeIn key={stat.label} delay={stat.delay}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Counter
                  to={stat.to}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  fontSize={64}
                  delay={stat.delay}
                  duration={stat.duration}
                />
                <div
                  style={{
                    fontFamily: theme.font,
                    fontSize: 15,
                    color: theme.dimmed,
                    maxWidth: 200,
                    textAlign: "center",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Tagline */}
        <AnimatedText
          text="For fleets that refuse to fly blind."
          fontSize={28}
          color={theme.muted}
          mode="fade"
          delay={120}
          style={{ fontWeight: 500, fontStyle: "italic" }}
        />
      </div>
    </AbsoluteFill>
  );
};
