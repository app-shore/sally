import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme } from "../lib/theme";

type Alert = {
  type: "warning" | "danger" | "info";
  title: string;
  description: string;
};

const alerts: Alert[] = [
  { type: "warning", title: "HOS Warning", description: "Driver J. Smith — 45 min remaining" },
  { type: "danger", title: "Driver Stopped", description: "Unit #847 — stationary 22 min" },
  { type: "info", title: "Dock Delay", description: "Stop #3 — 40 min wait detected" },
];

const colorMap = {
  warning: theme.alertYellow,
  danger: theme.alertRed,
  info: "#3B82F6",
};

export const MockDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 600 }}>
      {alerts.map((alert, i) => {
        const delay = 10 + i * 20;
        const scale = spring({
          fps,
          frame: Math.max(0, frame - delay),
          config: { damping: 80, stiffness: 200 },
        });
        const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={alert.title}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 24px",
              borderRadius: 12,
              border: "1px solid #222",
              backgroundColor: "#0a0a0a",
              transform: `scale(${scale})`,
              opacity,
            }}
          >
            {/* Status dot */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: colorMap[alert.type],
                boxShadow: `0 0 8px ${colorMap[alert.type]}`,
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
                {alert.title}
              </div>
              <div
                style={{
                  fontFamily: theme.font,
                  fontSize: 14,
                  color: theme.muted,
                  marginTop: 2,
                }}
              >
                {alert.description}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
