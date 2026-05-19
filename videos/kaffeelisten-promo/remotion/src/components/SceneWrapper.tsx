import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, EX } from "../constants";

interface Props {
  children: React.ReactNode;
  totalFrames: number;
  dark?: boolean;
  /** Skip the built-in fade-in (useful when the scene has its own entry animation) */
  noFade?: boolean;
}

export const SceneWrapper: React.FC<Props> = ({
  children,
  totalFrames,
  dark = false,
  noFade = false,
}) => {
  const frame = useCurrentFrame();
  const fadeIn  = noFade ? 1 : interpolate(frame, [0, 10],                        [0, 1], EX);
  const fadeOut =           interpolate(frame, [totalFrames - 10, totalFrames], [1, 0], EX);
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill
      style={{
        background: dark ? C.ink : C.stone,
        opacity,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Subtle film-grain texture — matches the original prototype */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.22,
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(217,119,6,0.08) 0 1px, transparent 1px),
            radial-gradient(circle at 80% 70%, rgba(28,25,23,0.05) 0 1px, transparent 1px)
          `,
          backgroundSize: "36px 36px, 52px 52px",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
