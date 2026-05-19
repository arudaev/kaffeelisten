import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { C, EX, SCENES } from "../constants";
import { SceneWrapper } from "../components/SceneWrapper";
import { AnimatedCursor } from "../components/AnimatedCursor";
import { Callout } from "../components/Callout";
import { AdminDashboard } from "../app-screens/AdminDashboard";

/*
  Layout
  ──────
  Canvas: 1920 × 1080
  AdminDashboard occupies x=[520,1920], y=[0,1080] (1400 × 1080)
  The "Bericht senden" button is in the dashboard header:
    header height 76px → center y = 38
    button right-aligned, ~196px wide → center x ≈ 1920 - 98 = 1822
  Canvas cursor target: (1822, 38)

  Sub-scenes (scene-relative frames):
    0– 30   (1s)  Kicker / title slides in
   30–120   (3s)  Dashboard slides in, metrics count up
  120–150   (1s)  Table rows shimmer
  150–195  (1.5s) Callout appears, cursor moves to send button
  195–225   (1s)  Cursor taps, paper-plane draws
  225–270  (1.5s) Toast rises
  270–300   (1s)  Hold
*/

export const AdminScene: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = SCENES.ADMIN.dur;

  // ── Kicker ──
  const kickerO = interpolate(frame, [8, 24], [0, 1], EX);
  const kickerX = interpolate(frame, [8, 24], [-54, 0], EX);

  // ── Dashboard slide in from right ──
  const dashX = interpolate(frame, [12, 46], [220, 0], EX);
  const dashO = interpolate(frame, [12, 40], [0, 1], EX);

  // ── Send button state ──
  const highlightSend = frame >= 155;
  const sendTapped = frame >= 205;

  // ── Paper-plane draw ──
  const planeDraw = interpolate(frame, [205, 228], [0, 1], EX);
  const planeDotO = interpolate(frame, [222, 232], [0, 1], EX);

  // ── Toast ──
  const toastVisible = frame >= 225;
  const toastY = interpolate(frame, [225, 241], [58, 0], EX);
  const toastO = interpolate(frame, [225, 241], [0, 1], EX);

  return (
    <SceneWrapper totalFrames={dur}>
      {/* ── AdminDashboard fills the right 1400px ── */}
      <div
        style={{
          position: "absolute",
          left: 520,
          top: 0,
          width: 1400,
          height: 1080,
          opacity: dashO,
          transform: `translateX(${dashX}px)`,
          boxShadow: "-24px 0 64px rgba(28,25,23,0.12)",
          overflow: "hidden",
        }}
      >
        <AdminDashboard
          metricsStartFrame={30}
          tableStartFrame={120}
          highlightSend={highlightSend}
          sendTapped={sendTapped}
        />
      </div>

      {/* ── Left column: kicker + callouts ── */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {/* Kicker */}
        <div
          style={{
            position: "absolute",
            top: 80,
            left: 80,
            opacity: kickerO,
            transform: `translateX(${kickerX}px)`,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: 10,
            }}
          >
            Monthly Report
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: C.ink,
              lineHeight: 1.15,
            }}
          >
            Monatsbericht
            <br />
            bereit.
          </div>
        </div>

        {/* Callout: "One click. All companies notified." */}
        <Callout
          text="One click. All notified."
          subtext="Alle Unternehmen erhalten den Bericht."
          x={60}
          y={380}
          side="left"
          startFrame={155}
          endFrame={225}
          accent
        />

        {/* ── Paper-plane arc (drawn after cursor tap) ── */}
        <svg
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            pointerEvents: "none",
            overflow: "visible",
          }}
          width={1920}
          height={1080}
        >
          {/* pathLength={1} normalises dash arithmetic to avoid early tail visibility */}
          <path
            d="M 820 480 C 1000 120 1400 60 1810 44"
            pathLength={1}
            fill="none"
            stroke={C.amber}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={1}
            strokeDashoffset={1 - planeDraw}
          />
        </svg>

        {/* Dot landing on button */}
        <div
          style={{
            position: "absolute",
            left: 1810,
            top: 30,
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: C.amber,
            opacity: planeDotO,
            boxShadow: "0 4px 16px rgba(217,119,6,0.45)",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Toast */}
        {toastVisible && (
          <div
            style={{
              position: "absolute",
              bottom: 62,
              left: "50%",
              transform: `translateX(-50%) translateY(${toastY}px)`,
              opacity: toastO,
              background: C.ink,
              color: C.white,
              padding: "18px 34px",
              borderRadius: 16,
              fontSize: 26,
              fontWeight: 700,
              boxShadow: "0 20px 48px rgba(0,0,0,0.28)",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 14,
              zIndex: 100,
            }}
          >
            <span style={{ color: C.amber }}>✓</span>
            E-Mail verschickt.
            <span style={{ color: C.muted, fontSize: 20, marginLeft: 6 }}>
              / Email sent.
            </span>
          </div>
        )}
      </AbsoluteFill>

      {/* ── Cursor: moves to "Bericht senden" header button ── */}
      {/* Button canvas coords: x≈1822, y≈38 (38 = header center) */}
      <AnimatedCursor
        fromX={820}
        fromY={480}
        toX={1822}
        toY={38}
        moveStart={168}
        moveEnd={198}
        tapFrame={205}
      />
    </SceneWrapper>
  );
};
