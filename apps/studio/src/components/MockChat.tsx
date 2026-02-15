import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { theme } from "../lib/theme";

type ChatMessage = {
  role: "user" | "sally";
  text: string;
  delay: number;
};

type MockChatProps = {
  messages: ChatMessage[];
  width?: number;
};

export const MockChat: React.FC<MockChatProps> = ({
  messages,
  width = 700,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width,
      }}
    >
      {messages.map((msg, i) => {
        const adjustedFrame = frame - msg.delay;
        if (adjustedFrame < 0) return null;

        // Fade in the bubble
        const bubbleOpacity = interpolate(adjustedFrame, [0, 8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Typewriter for text
        const charsToShow = interpolate(
          adjustedFrame,
          [5, 5 + msg.text.length * 1.5],
          [0, msg.text.length],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const isUser = msg.role === "user";
        const visibleText = msg.text.slice(0, Math.floor(charsToShow));
        const showCursor = Math.floor(charsToShow) < msg.text.length;

        return (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: isUser ? "flex-end" : "flex-start",
              opacity: bubbleOpacity,
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "12px 18px",
                borderRadius: 16,
                backgroundColor: isUser
                  ? "#1a1a1a"
                  : "rgba(255,255,255,0.05)",
                border: isUser
                  ? "1px solid #333"
                  : "1px solid rgba(255,255,255,0.1)",
                fontFamily: theme.font,
                fontSize: 18,
                lineHeight: 1.5,
                color: isUser ? theme.muted : theme.text,
              }}
            >
              {!isUser && (
                <div
                  style={{
                    fontSize: 11,
                    color: theme.dimmed,
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  SALLY
                </div>
              )}
              {visibleText}
              {showCursor && (
                <span
                  style={{
                    opacity: frame % 15 < 8 ? 1 : 0,
                    color: theme.dimmed,
                  }}
                >
                  |
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
