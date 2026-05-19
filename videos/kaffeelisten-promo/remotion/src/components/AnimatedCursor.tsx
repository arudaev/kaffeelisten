import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, EX } from "../constants";

interface Props {
  /** Starting canvas position (x) */
  fromX: number;
  /** Starting canvas position (y) */
  fromY: number;
  /** Target canvas position (x) */
  toX: number;
  /** Target canvas position (y) */
  toY: number;
  /** Scene-relative frame to start moving */
  moveStart: number;
  /** Scene-relative frame to finish moving */
  moveEnd: number;
  /** Scene-relative frame to fire the tap pulse */
  tapFrame: number;
  /** How many frames the tap ring animation lasts (default 26) */
  tapDuration?: number;
}

export const AnimatedCursor: React.FC<Props> = ({
  fromX,
  fromY,
  toX,
  toY,
  moveStart,
  moveEnd,
  tapFrame,
  tapDuration = 26,
}) => {
  const frame = useCurrentFrame();

  // Smooth position using a slight ease-in
  const cursorX = interpolate(frame, [moveStart, moveEnd], [fromX, toX], EX);
  const cursorY = interpolate(frame, [moveStart, moveEnd], [fromY, toY], EX);

  // Fade in when movement starts, fade out after tap ring completes
  const fadeInEnd = moveStart;
  const fadeOutStart = tapFrame + tapDuration;
  const opacity = interpolate(
    frame,
    [moveStart - 8, fadeInEnd, fadeOutStart, fadeOutStart + 12],
    [0, 1, 1, 0],
    EX
  );

  // Tap ring: expands outward at tapFrame
  const tapProgress = frame - tapFrame;
  const ringActive = tapProgress >= 0 && tapProgress <= tapDuration;
  const ringScale = ringActive
    ? interpolate(tapProgress, [0, tapDuration], [0.3, 2.6], EX)
    : 0;
  const ringOpacity = ringActive
    ? interpolate(tapProgress, [0, tapDuration * 0.4, tapDuration], [0.8, 0.5, 0], EX)
    : 0;

  // Cursor press: slight scale-down on tap
  const pressScale =
    tapProgress >= 0 && tapProgress <= 12
      ? interpolate(tapProgress, [0, 5, 12], [1, 0.75, 1], EX)
      : 1;

  return (
    <div
      style={{
        position: "absolute",
        left: cursorX,
        top: cursorY,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 200,
        opacity,
      }}
    >
      {/* Expanding tap ring */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: `3px solid ${C.amber}`,
          transform: `translate(-50%, -50%) scale(${ringScale})`,
          opacity: ringOpacity,
          pointerEvents: "none",
        }}
      />
      {/* Cursor dot */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: C.amber,
          boxShadow: "0 4px 14px rgba(217,119,6,0.55)",
          transform: `scale(${pressScale})`,
          border: "2.5px solid rgba(255,255,255,0.55)",
          position: "relative",
          zIndex: 1,
        }}
      />
    </div>
  );
};
