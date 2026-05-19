import React from "react";

interface Props {
  children: React.ReactNode;
  width?: number;
  height?: number;
}

const BORDER = 20;
const RADIUS = 40;

export const AppFrame: React.FC<Props> = ({
  children,
  width = 620,
  height = 830,
}) => {
  const innerW = width - BORDER * 2;
  const innerH = height - BORDER * 2;

  return (
    <div
      style={{
        width,
        height,
        borderRadius: RADIUS,
        background: "#1c1c1e",
        padding: BORDER,
        boxShadow:
          "0 48px 96px rgba(0,0,0,0.38), 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.12)",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Home indicator bar at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: "50%",
          transform: "translateX(-50%)",
          width: 100,
          height: 4,
          borderRadius: 2,
          background: "rgba(255,255,255,0.3)",
          zIndex: 10,
        }}
      />
      {/* Dynamic island / pill at top */}
      <div
        style={{
          position: "absolute",
          top: BORDER + 10,
          left: "50%",
          transform: "translateX(-50%)",
          width: 88,
          height: 26,
          borderRadius: 14,
          background: "#1c1c1e",
          zIndex: 10,
        }}
      />
      {/* Screen area */}
      <div
        style={{
          width: innerW,
          height: innerH,
          borderRadius: RADIUS - BORDER,
          overflow: "hidden",
          background: "#fafaf9",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const FRAME_INNER_W = 620 - BORDER * 2;
export const FRAME_INNER_H = 830 - BORDER * 2;
