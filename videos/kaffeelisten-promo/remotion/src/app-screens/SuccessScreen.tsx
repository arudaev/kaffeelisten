import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EX } from "../constants";

interface Props {
  /** Scene-relative frame at which the success animation begins */
  startFrame: number;
}

export const SuccessScreen: React.FC<Props> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const checkScale = spring({
    frame: frame - (startFrame + 10),
    fps,
    config: { damping: 10, stiffness: 220 },
    durationInFrames: 26,
  });

  const primaryOpacity = interpolate(
    frame,
    [startFrame + 22, startFrame + 36],
    [0, 1],
    EX
  );
  const secondaryOpacity = interpolate(
    frame,
    [startFrame + 32, startFrame + 46],
    [0, 1],
    EX
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: C.stone,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        position: "relative",
        fontFamily: "inherit",
      }}
    >
      {/* Green check circle */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          background: C.greenBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${checkScale})`,
          boxShadow: "0 8px 32px rgba(22,163,74,0.18)",
        }}
      >
        <svg
          width={58}
          height={58}
          viewBox="0 0 24 24"
          fill="none"
          stroke={C.green}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      {/* Primary */}
      <p
        style={{
          margin: 0,
          fontSize: 44,
          fontWeight: 800,
          color: C.ink,
          opacity: primaryOpacity,
        }}
      >
        Gespeichert.
      </p>

      {/* English */}
      <p
        style={{
          margin: 0,
          fontSize: 26,
          fontWeight: 500,
          color: C.muted,
          opacity: secondaryOpacity,
        }}
      >
        Saved.
      </p>

      {/* Footer note */}
      <p
        style={{
          position: "absolute",
          bottom: 28,
          margin: 0,
          fontSize: 14,
          color: C.muted,
          fontWeight: 400,
          opacity: secondaryOpacity,
          textAlign: "center",
        }}
      >
        Automatisch zurück in 3 Sekunden...
      </p>
    </div>
  );
};
