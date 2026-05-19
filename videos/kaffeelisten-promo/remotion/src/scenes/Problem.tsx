import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, EX, SCENES } from "../constants";
import { SceneWrapper } from "../components/SceneWrapper";

export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = SCENES.PROBLEM.dur;

  const line1Y       = interpolate(frame, [14, 28], [34, 0], EX);
  const line1Opacity = interpolate(frame, [14, 28], [0, 1], EX);

  const line2Y       = interpolate(frame, [34, 48], [34, 0], EX);
  const line2Opacity = interpolate(frame, [34, 48], [0, 1], EX);

  const line3Y       = interpolate(frame, [54, 68], [34, 0], EX);
  const line3Opacity = interpolate(frame, [54, 68], [0, 1], EX);

  const underlineScaleX = interpolate(frame, [70, 88], [0, 1], EX);

  return (
    <SceneWrapper totalFrames={dur}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 1320, padding: "0 120px" }}>
          {/* Kicker */}
          <p
            style={{
              margin: "0 0 18px",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: C.muted,
              opacity: line1Opacity,
              transform: `translateY(${line1Y}px)`,
            }}
          >
            ITC1 Deggendorf — Jeden Monat
          </p>

          {/* The problem */}
          <div
            style={{
              margin: "0 0 52px",
              opacity: line2Opacity,
              transform: `translateY(${line2Y}px)`,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 80,
                lineHeight: 1.0,
                fontWeight: 800,
                color: C.ink,
              }}
            >
              Wer hat seinen Kaffee bezahlt?
            </h2>
          </div>

          {/* The old way */}
          <div
            style={{
              opacity: line3Opacity,
              transform: `translateY(${line3Y}px)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ position: "relative", display: "inline-block" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 52,
                  lineHeight: 1.1,
                  fontWeight: 700,
                  color: C.stone6,
                }}
              >
                Zettel. Kuli. Ausrechnen. Nachfragen. Vergessen.
              </p>
              {/* Amber strikethrough */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  height: 6,
                  borderRadius: 999,
                  background: C.amber,
                  transformOrigin: "left center",
                  transform: `scaleX(${underlineScaleX})`,
                  marginTop: -3,
                }}
              />
            </div>
            {/* English translation */}
            <p
              style={{
                margin: 0,
                fontSize: 26,
                lineHeight: 1.2,
                fontWeight: 400,
                color: C.muted,
                fontStyle: "italic",
              }}
            >
              Paper list. Monthly math. Forgotten entries.
            </p>
          </div>
        </div>
      </AbsoluteFill>
    </SceneWrapper>
  );
};
