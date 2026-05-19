import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, EX, SCENES } from "../constants";
import { SceneWrapper } from "../components/SceneWrapper";

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = SCENES.HOOK.dur;

  // Pine drifts up from below
  const pineY       = interpolate(frame, [0, 45], [30, 0], EX);
  const pineOpacity = interpolate(frame, [0, 45], [0, 0.11], EX);

  // Cup fades + lifts in
  const cupY       = interpolate(frame, [5, 22], [28, 0], EX);
  const cupOpacity = interpolate(frame, [5, 22], [0, 1], EX);

  // SVG stroke draw — pathLength={1} means dashoffset 1→0 = fully drawn
  const draw = (s: number, e: number) => interpolate(frame, [s, e], [1, 0], EX);

  // Headline
  const titleY       = interpolate(frame, [22, 40], [44, 0], EX);
  const titleOpacity = interpolate(frame, [22, 40], [0, 1], EX);

  // Subline
  const subX       = interpolate(frame, [38, 54], [-32, 0], EX);
  const subOpacity = interpolate(frame, [38, 54], [0, 1], EX);

  // CTA button — spring pop
  const ctaProgress = spring({
    frame: frame - 54,
    fps,
    config: { damping: 14, stiffness: 180 },
    durationInFrames: 22,
  });
  const ctaOpacity = interpolate(frame, [54, 64], [0, 1], EX);

  // Footer
  const footerY       = interpolate(frame, [72, 86], [20, 0], EX);
  const footerOpacity = interpolate(frame, [72, 86], [0, 1], EX);

  // Amber glow orb behind cup
  const orbOpacity = interpolate(frame, [8, 30], [0, 0.13], EX);

  return (
    <SceneWrapper totalFrames={dur}>
      {/* Warm amber radial glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 560,
          height: 560,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(217,119,6,0.22), rgba(217,119,6,0))`,
          transform: "translate(-50%, -62%)",
          opacity: orbOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Pine silhouette */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 180,
          opacity: pineOpacity,
          transform: `translateY(${pineY}px)`,
        }}
      >
        <Img
          src={staticFile("assets/pine-silhouette.svg")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {/* Centered stack */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          paddingBottom: 24,
        }}
      >
        {/* Coffee cup SVG — draws stroke by stroke */}
        <div
          style={{
            width: 154,
            height: 118,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: cupOpacity,
            transform: `translateY(${cupY}px)`,
          }}
        >
          <svg
            viewBox="0 0 200 160"
            width={138}
            fill="none"
            stroke={C.ink}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M40 60c0-3 3-6 8-6h70c5 0 8 3 8 6"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: draw(6, 26) }}
            />
            <ellipse
              cx={83}
              cy={60}
              rx={43}
              ry={6}
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: draw(10, 30) }}
            />
            <path
              d="M40 60v40c0 14 12 26 26 26h34c14 0 26-12 26-26V60"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: draw(13, 35) }}
            />
            <path
              d="M126 70h12c10 0 18 8 18 18v0c0 10-8 18-18 18h-12"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: draw(17, 37) }}
            />
            <path
              d="M70 28c-3 6 3 12 0 18"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: draw(21, 39) }}
            />
            <path
              d="M83 22c-3 6 3 12 0 18"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: draw(23, 41) }}
            />
            <path
              d="M96 28c-3 6 3 12 0 18"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: draw(25, 43) }}
            />
          </svg>
        </div>

        {/* Wordmark */}
        <h1
          style={{
            margin: 0,
            fontSize: 112,
            lineHeight: 0.9,
            fontWeight: 800,
            color: C.ink,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          Kaffeelisten
        </h1>

        {/* Tagline */}
        <p
          style={{
            margin: 0,
            fontSize: 36,
            lineHeight: 1.2,
            fontWeight: 500,
            color: C.stone6,
            opacity: subOpacity,
            transform: `translateX(${subX}px)`,
          }}
        >
          Kaffee, Getränke, Snacks — in 15 Sekunden.
        </p>

        {/* English subtitle */}
        <p
          style={{
            margin: 0,
            fontSize: 22,
            lineHeight: 1.2,
            fontWeight: 400,
            color: C.muted,
            opacity: subOpacity,
            transform: `translateX(${subX}px)`,
          }}
        >
          Coffee. Drinks. Snacks. Logged in seconds.
        </p>

        {/* CTA */}
        <div
          style={{
            minWidth: 280,
            minHeight: 76,
            padding: "0 42px",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: C.amber,
            color: C.white,
            fontSize: 28,
            fontWeight: 800,
            lineHeight: 1,
            boxShadow: "0 18px 36px rgba(180,83,9,0.20)",
            opacity: ctaOpacity,
            transform: `scale(${ctaProgress})`,
          }}
        >
          Eintrag starten
        </div>
      </AbsoluteFill>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 38,
          display: "flex",
          justifyContent: "center",
          color: C.stone6,
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: footerOpacity,
          transform: `translateY(${footerY}px)`,
        }}
      >
        ITC1 Deggendorf · B4Y3RW4LD
      </div>
    </SceneWrapper>
  );
};
