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

export const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = SCENES.CTA.dur;

  // Ghost screenshots recede in background
  const ghostOpacity = interpolate(frame, [0, 22], [0, 0.16], EX);

  // Logo mark
  const logoScale   = spring({ frame: frame - 18, fps, config: { damping: 12, stiffness: 180 }, durationInFrames: 22 });
  const logoOpacity = interpolate(frame, [18, 32], [0, 1], EX);

  // Wordmark
  const titleY       = interpolate(frame, [28, 44], [36, 0], EX);
  const titleOpacity = interpolate(frame, [28, 44], [0, 1], EX);

  // URL
  const urlY       = interpolate(frame, [50, 64], [34, 0], EX);
  const urlOpacity = interpolate(frame, [50, 64], [0, 1], EX);

  // Amber underline
  const lineScaleX = interpolate(frame, [64, 82], [0, 1], EX);

  // Tagline
  const tagOpacity = interpolate(frame, [84, 98], [0, 1], EX);
  const tagY       = interpolate(frame, [84, 98], [30, 0], EX);

  // Logo breathe
  const breathe = spring({ frame: frame - 110, fps, config: { damping: 18, stiffness: 80 }, durationInFrames: 20 });
  const logoBreath = 1 + (breathe - 1) * 0.025;

  // Final fade-out
  const finalFade = interpolate(frame, [dur - 16, dur], [1, 0], EX);

  return (
    <SceneWrapper totalFrames={dur}>
      {/* Ghost product screenshots in background */}
      <div style={{ position: "absolute", inset: 0, opacity: ghostOpacity }}>
        <div
          style={{
            position: "absolute",
            left: 96,
            top: 130,
            width: 480,
            height: 340,
            border: `1px solid ${C.border}`,
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 20px 48px rgba(28,25,23,0.10)",
          }}
        >
          <Img src={staticFile("assets/member-company.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div
          style={{
            position: "absolute",
            right: 80,
            top: 148,
            width: 590,
            height: 420,
            border: `1px solid ${C.border}`,
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 20px 48px rgba(28,25,23,0.10)",
          }}
        >
          <Img src={staticFile("assets/admin-dashboard.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 280,
            bottom: 80,
            width: 640,
            height: 450,
            border: `1px solid ${C.border}`,
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 20px 48px rgba(28,25,23,0.10)",
          }}
        >
          <Img src={staticFile("assets/member-item-selection.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </div>

      {/* Pine silhouette */}
      <Img
        src={staticFile("assets/pine-silhouette-final.svg")}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: 180,
          objectFit: "cover",
          opacity: 0.09,
        }}
      />

      {/* Center lockup */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          opacity: finalFade,
        }}
      >
        {/* Logo mark + wordmark */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            opacity: logoOpacity,
            transform: `scale(${logoScale * logoBreath})`,
          }}
        >
          <svg
            viewBox="0 0 200 160"
            width={110}
            fill="none"
            stroke={C.ink}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M40 60c0-3 3-6 8-6h70c5 0 8 3 8 6" />
            <ellipse cx={83} cy={60} rx={43} ry={6} />
            <path d="M40 60v40c0 14 12 26 26 26h34c14 0 26-12 26-26V60" />
            <path d="M126 70h12c10 0 18 8 18 18v0c0 10-8 18-18 18h-12" />
            <path d="M70 28c-3 6 3 12 0 18" />
            <path d="M83 22c-3 6 3 12 0 18" />
            <path d="M96 28c-3 6 3 12 0 18" />
          </svg>
        </div>

        {/* Wordmark */}
        <h2
          style={{
            margin: 0,
            fontSize: 118,
            lineHeight: 0.9,
            fontWeight: 900,
            color: C.ink,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          Kaffeelisten
        </h2>

        {/* URL */}
        <div
          style={{
            fontSize: 52,
            lineHeight: 1,
            fontWeight: 800,
            color: C.ink,
            fontVariantLigatures: "none",
            opacity: urlOpacity,
            transform: `translateY(${urlY}px)`,
          }}
        >
          kaffeelisten.de
        </div>

        {/* Amber underline */}
        <div
          style={{
            width: 600,
            height: 9,
            borderRadius: 999,
            background: C.amber,
            transformOrigin: "left center",
            transform: `scaleX(${lineScaleX})`,
          }}
        />

        {/* Tagline */}
        <p
          style={{
            margin: 0,
            fontSize: 40,
            lineHeight: 1.2,
            fontWeight: 700,
            color: C.stone6,
            opacity: tagOpacity,
            transform: `translateY(${tagY}px)`,
          }}
        >
          Kurz tippen, fertig.
        </p>

        {/* English tagline */}
        <p
          style={{
            margin: 0,
            fontSize: 26,
            lineHeight: 1.2,
            fontWeight: 400,
            color: C.muted,
            opacity: tagOpacity,
            transform: `translateY(${tagY}px)`,
          }}
        >
          Just tap and go.
        </p>
      </AbsoluteFill>
    </SceneWrapper>
  );
};
