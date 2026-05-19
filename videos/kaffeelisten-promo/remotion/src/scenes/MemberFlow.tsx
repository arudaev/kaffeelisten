import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, EX, SCENES } from "../constants";
import { SceneWrapper } from "../components/SceneWrapper";
import { AppFrame } from "../components/AppFrame";
import { AnimatedCursor } from "../components/AnimatedCursor";
import { Callout } from "../components/Callout";
import { CompanyScreen } from "../app-screens/CompanyScreen";
import { MemberScreen } from "../app-screens/MemberScreen";
import { ItemScreen } from "../app-screens/ItemScreen";
import { ConfirmScreen } from "../app-screens/ConfirmScreen";
import { SuccessScreen } from "../app-screens/SuccessScreen";

// ─── HomeScreen ───────────────────────────────────────────────────────────────

const HomeScreen: React.FC = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background: C.stone,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      fontFamily: "inherit",
    }}
  >
    <svg
      viewBox="0 0 200 160"
      width={76}
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
    </svg>
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.ink }}>Kaffeelisten</div>
      <div style={{ fontSize: 14, color: C.muted, marginTop: 4, letterSpacing: "0.05em" }}>
        ITC1 Deggendorf
      </div>
    </div>
    <div
      style={{
        marginTop: 28,
        padding: "17px 40px",
        borderRadius: 14,
        background: C.amber,
        color: C.white,
        fontSize: 20,
        fontWeight: 700,
        boxShadow: "0 8px 24px rgba(217,119,6,0.28)",
      }}
    >
      Eintrag starten
    </div>
    <div style={{ fontSize: 13, color: C.muted }}>Tap to log your order</div>
  </div>
);

// ─── MemberFlow Scene ─────────────────────────────────────────────────────────
//
//  Canvas:       1920 × 1080
//  AppFrame:      720 ×  960  →  left=600, top=60
//  Inner screen:  680 ×  920  →  left=620, top=80
//
//  Sub-scenes (scene-relative frames):
//    Intro    0– 72   Home screen, callout
//    Company 66–209   Pick Movemaster GmbH
//    Member 199–336   Pick Alexander R.
//    Items  326–561   Pick Cappuccino + Espresso, cart
//    Confirm 551–681  Review & confirm
//    Success 671–750  Done

export const MemberFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = SCENES.MEMBER_FLOW.dur;

  // App frame slides up into view
  const frameY = interpolate(frame, [0, 38], [70, 0], EX);
  const frameOpacity = interpolate(frame, [0, 32], [0, 1], EX);

  // ── Screen cross-fades (14-frame dissolve windows) ──
  const s0 = interpolate(frame, [8,  20,  62,  76], [0, 1, 1, 0], EX); // Home
  const s1 = interpolate(frame, [66, 80, 200, 214], [0, 1, 1, 0], EX); // Company
  const s2 = interpolate(frame, [200, 214, 327, 341], [0, 1, 1, 0], EX); // Member
  const s3 = interpolate(frame, [331, 345, 553, 567], [0, 1, 1, 0], EX); // Items
  const s4 = interpolate(frame, [557, 571, 673, 687], [0, 1, 1, 0], EX); // Confirm
  const s5 = interpolate(frame, [677, 691], [0, 1], EX);                 // Success

  // ── State driven by cursor taps ──
  const selectedCompany = frame >= 137 ? "Movemaster GmbH" : undefined;
  const selectedMember  = frame >= 262 ? "Alexander R."    : undefined;
  const cappSelected    = frame >= 404;
  const espSelected     = frame >= 444;
  const showCart        = frame >= 468;
  const tapBest         = frame >= 638;

  return (
    <SceneWrapper totalFrames={dur}>
      <AbsoluteFill>
        {/* ── App frame – centered ── */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) translateY(${frameY}px)`,
            opacity: frameOpacity,
          }}
        >
          <AppFrame width={720} height={960}>
            {/* Home */}
            <div style={{ position: "absolute", inset: 0, opacity: s0, zIndex: s0 > 0.01 ? 5 : 0 }}>
              <HomeScreen />
            </div>

            {/* Company selection */}
            <div style={{ position: "absolute", inset: 0, opacity: s1, zIndex: s1 > 0.5 ? 5 : 0 }}>
              <CompanyScreen selectedCompany={selectedCompany} />
            </div>

            {/* Member selection */}
            <div style={{ position: "absolute", inset: 0, opacity: s2, zIndex: s2 > 0.5 ? 5 : 0 }}>
              <MemberScreen
                companyName="Movemaster GmbH"
                selectedMember={selectedMember}
              />
            </div>

            {/* Item selection */}
            <div style={{ position: "absolute", inset: 0, opacity: s3, zIndex: s3 > 0.5 ? 5 : 0 }}>
              <ItemScreen
                selectedItems={[
                  ...(cappSelected ? ["Cappuccino"] : []),
                  ...(espSelected  ? ["Espresso"]   : []),
                ]}
                quantities={{ Cappuccino: 1, Espresso: 1 }}
                showCart={showCart}
              />
            </div>

            {/* Confirmation */}
            <div style={{ position: "absolute", inset: 0, opacity: s4, zIndex: s4 > 0.5 ? 5 : 0 }}>
              <ConfirmScreen tapBestätigen={tapBest} />
            </div>

            {/* Success */}
            <div style={{ position: "absolute", inset: 0, opacity: s5, zIndex: s5 > 0.5 ? 5 : 0 }}>
              <SuccessScreen startFrame={677} />
            </div>
          </AppFrame>
        </div>

        {/* ── Callout annotations ─────────────────────────────────────────── */}
        {/* Intro */}
        <Callout
          text="The wall iPad at ITC1 Deggendorf"
          subtext="No login. Anyone can log in 15 seconds."
          x={60} y={390}
          side="left" startFrame={22} endFrame={74}
          accent
        />

        {/* Company */}
        <Callout
          text="Select your company →"
          subtext="Unternehmen wählen"
          x={60} y={360}
          side="left" startFrame={84} endFrame={212}
          accent
        />

        {/* Member */}
        <Callout
          text="Who are you? →"
          subtext="Namen wählen"
          x={60} y={360}
          side="left" startFrame={218} endFrame={338}
          accent
        />

        {/* Items */}
        <Callout
          text="What did you have?"
          subtext="Was hast du genommen?"
          x={60} y={340}
          side="left" startFrame={349} endFrame={460}
          accent
        />

        {/* Cart total */}
        <Callout
          text="2 items · €0.80"
          subtext="2 Artikel · 0,80 €"
          x={60} y={570}
          side="left" startFrame={470} endFrame={563}
          accent
        />

        {/* Confirm */}
        <Callout
          text="Review & confirm"
          subtext="Bestätigen?"
          x={60} y={370}
          side="left" startFrame={575} endFrame={683}
          accent
        />

        {/* Done */}
        <Callout
          text="Done. ✓"
          subtext="Saved to Kaffeelisten"
          x={1360} y={430}
          side="right" startFrame={694}
          accent
        />

        {/* ── Animated cursors ─────────────────────────────────────────────
            Canvas coords: inner screen x=[620,1300], y=[80,1000]
            ─────────────────────────────────────────────────────────────── */}

        {/* A: tap "Eintrag starten" (canvas ≈ 960, 598) */}
        <AnimatedCursor
          fromX={960} fromY={720}
          toX={960}   toY={598}
          moveStart={46} moveEnd={62}
          tapFrame={63}
        />

        {/* B: tap "Movemaster GmbH" — 1st tile (canvas ≈ 960, 302) */}
        <AnimatedCursor
          fromX={900} fromY={560}
          toX={960}   toY={302}
          moveStart={120} moveEnd={136}
          tapFrame={137}
        />

        {/* C: tap "Alexander R." — 1st member tile (canvas ≈ 960, 302) */}
        <AnimatedCursor
          fromX={900} fromY={560}
          toX={960}   toY={302}
          moveStart={245} moveEnd={261}
          tapFrame={262}
        />

        {/* D: tap Cappuccino card (canvas ≈ 795, 356) */}
        <AnimatedCursor
          fromX={960} fromY={540}
          toX={795}   toY={356}
          moveStart={388} moveEnd={403}
          tapFrame={404}
        />

        {/* E: tap Espresso card (canvas ≈ 1125, 356) */}
        <AnimatedCursor
          fromX={795} fromY={356}
          toX={1125}  toY={356}
          moveStart={428} moveEnd={443}
          tapFrame={444}
        />

        {/* F: tap "Weiter →" in cart footer (canvas ≈ 1160, 942) */}
        <AnimatedCursor
          fromX={1125} fromY={356}
          toX={1160}   toY={942}
          moveStart={503} moveEnd={518}
          tapFrame={519}
        />

        {/* G: tap "Bestätigen ✓" button (canvas ≈ 1060, 942) */}
        <AnimatedCursor
          fromX={960} fromY={700}
          toX={1060}  toY={942}
          moveStart={622} moveEnd={637}
          tapFrame={638}
        />
      </AbsoluteFill>
    </SceneWrapper>
  );
};
