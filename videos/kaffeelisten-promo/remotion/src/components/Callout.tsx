import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, EX } from "../constants";

interface Props {
  /** Primary label text (English) */
  text: string;
  /** Optional secondary line (German / sub-label) */
  subtext?: string;
  /** Canvas x position */
  x: number;
  /** Canvas y position */
  y: number;
  /** Which side to slide in from */
  side: "left" | "right";
  /** Scene-relative frame to appear */
  startFrame: number;
  /** Scene-relative frame to disappear (optional) */
  endFrame?: number;
  /** Show amber left-border accent */
  accent?: boolean;
}

export const Callout: React.FC<Props> = ({
  text,
  subtext,
  x,
  y,
  side,
  startFrame,
  endFrame,
  accent = false,
}) => {
  const frame = useCurrentFrame();

  const offset = 36;
  const slideIn = interpolate(
    frame,
    [startFrame, startFrame + 18],
    [side === "left" ? -offset : offset, 0],
    EX
  );
  const fadeIn = interpolate(frame, [startFrame, startFrame + 18], [0, 1], EX);
  const fadeOut =
    endFrame != null
      ? interpolate(frame, [endFrame - 14, endFrame], [1, 0], EX)
      : 1;

  const finalOpacity = fadeIn * fadeOut;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translateX(${slideIn}px)`,
        opacity: finalOpacity,
        pointerEvents: "none",
        zIndex: 50,
        maxWidth: 380,
        padding: "14px 18px",
        borderRadius: 14,
        background: C.white,
        border: `1px solid ${C.border}`,
        borderLeft: accent ? `5px solid ${C.amber}` : `1px solid ${C.border}`,
        boxShadow: "0 8px 28px rgba(28,25,23,0.10)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 700,
          color: C.ink,
          lineHeight: 1.25,
        }}
      >
        {text}
      </p>
      {subtext != null && (
        <p
          style={{
            margin: "5px 0 0",
            fontSize: 15,
            fontWeight: 400,
            color: C.stone6,
            lineHeight: 1.35,
          }}
        >
          {subtext}
        </p>
      )}
    </div>
  );
};
