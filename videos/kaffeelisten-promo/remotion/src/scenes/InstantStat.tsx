import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, EX, SCENES } from "../constants";
import { SceneWrapper } from "../components/SceneWrapper";

export const InstantStat: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = SCENES.INSTANT_STAT.dur;

  // Amber number "15" drops in
  const numY       = interpolate(frame, [14, 34], [60, 0], EX);
  const numOpacity = interpolate(frame, [14, 34], [0, 1], EX);

  // "Sek." label slides in from right
  const labelX       = interpolate(frame, [28, 46], [40, 0], EX);
  const labelOpacity = interpolate(frame, [28, 46], [0, 1], EX);

  // Body copy lines stagger in
  const b1O = interpolate(frame, [52, 66], [0, 1], EX);
  const b1Y = interpolate(frame, [52, 66], [22, 0], EX);

  const b2O = interpolate(frame, [66, 80], [0, 1], EX);
  const b2Y = interpolate(frame, [66, 80], [22, 0], EX);

  const b3O = interpolate(frame, [80, 94], [0, 1], EX);
  const b3Y = interpolate(frame, [80, 94], [22, 0], EX);

  // Amber accent bar under the number
  const barScaleX = interpolate(frame, [36, 54], [0, 1], EX);

  return (
    <SceneWrapper totalFrames={dur}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
      >
        {/* "15 Sek." lockup */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 20,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontSize: 220,
              lineHeight: 0.82,
              fontWeight: 900,
              color: C.amber,
              fontVariantNumeric: "tabular-nums",
              opacity: numOpacity,
              transform: `translateY(${numY}px)`,
            }}
          >
            15
          </span>
          <span
            style={{
              fontSize: 96,
              lineHeight: 0.9,
              fontWeight: 800,
              color: C.ink,
              opacity: labelOpacity,
              transform: `translateX(${labelX}px)`,
            }}
          >
            Sek.
          </span>
        </div>

        {/* Amber underbar */}
        <div
          style={{
            width: 640,
            height: 8,
            borderRadius: 999,
            background: C.amber,
            transformOrigin: "left center",
            transform: `scaleX(${barScaleX})`,
            marginBottom: 52,
          }}
        />

        {/* Body copy */}
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {[
            { text: "Kein Login.  /  No login.", opacity: b1O, y: b1Y },
            { text: "Kein Passwort.  /  No password.", opacity: b2O, y: b2Y },
            { text: "Einfach tippen, fertig.  /  Just tap and go.", opacity: b3O, y: b3Y },
          ].map(({ text, opacity, y }, i) => (
            <p
              key={i}
              style={{
                margin: 0,
                fontSize: 54,
                fontWeight: 700,
                color: i === 2 ? C.ink : C.stone6,
                opacity,
                transform: `translateY(${y}px)`,
              }}
            >
              {text}
            </p>
          ))}
        </div>
      </AbsoluteFill>
    </SceneWrapper>
  );
};
