import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, EX } from "../constants";

interface Props {
  /** Scene-relative frame when metric counters begin */
  metricsStartFrame?: number;
  /** Scene-relative frame when table rows start shimmering in */
  tableStartFrame?: number;
  /** Whether to highlight the "Bericht senden" button */
  highlightSend?: boolean;
  /** Whether the "Bericht senden" button is in a pressed state */
  sendTapped?: boolean;
}

const NAV_ITEMS = [
  { label: "Übersicht", active: true },
  { label: "Einträge", active: false },
  { label: "Unternehmen", active: false },
  { label: "Mitarbeitende", active: false },
  { label: "Items", active: false },
];

// Real companies + members from supabase/seed.sql
const TABLE_ROWS = [
  { time: "09:14", person: "ALEXANDER R.", company: "Movemaster GmbH",    item: "Cappuccino",      qty: 1, amount: "0,50 €" },
  { time: "09:22", person: "JONAS W.",     company: "DEGDEV UG",          item: "Filterkaffee",    qty: 2, amount: "0,40 €" },
  { time: "09:51", person: "TOBIAS M.",    company: "INN.KUBATOR",        item: "Espresso",        qty: 1, amount: "0,30 €" },
  { time: "10:03", person: "LUKAS F.",     company: "Level51 e.V.",       item: "Latte Macchiato", qty: 1, amount: "0,50 €" },
  { time: "10:18", person: "FARES B.",     company: "Movemaster GmbH",    item: "Filterkaffee",    qty: 1, amount: "0,20 €" },
  { time: "10:35", person: "EMMA S.",      company: "THD Startup Campus", item: "Cappuccino",      qty: 1, amount: "0,50 €" },
];

const MetricCard: React.FC<{
  label: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  startFrame: number;
}> = ({ label, value, prefix = "", suffix = "", decimals = 0, startFrame }) => {
  const frame = useCurrentFrame();
  const countOpacity = interpolate(frame, [startFrame, startFrame + 16], [0, 1], EX);

  let displayed: string;
  if (typeof value === "string") {
    displayed = value;
  } else {
    const progress = interpolate(frame, [startFrame + 8, startFrame + 52], [0, value], EX);
    displayed =
      decimals > 0
        ? progress.toFixed(decimals).replace(".", ",")
        : String(Math.round(progress));
  }

  return (
    <div
      style={{
        flex: 1,
        padding: "20px 22px",
        borderRadius: 16,
        background: C.white,
        border: `1px solid ${C.border}`,
        boxShadow: "0 4px 16px rgba(28,25,23,0.07)",
        opacity: countOpacity,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: typeof value === "string" ? 28 : 42,
          lineHeight: 1,
          fontWeight: 900,
          color: C.ink,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {prefix}{displayed}{suffix}
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC<Props> = ({
  metricsStartFrame = 30,
  tableStartFrame = 120,
  highlightSend = false,
  sendTapped = false,
}) => {
  const frame = useCurrentFrame();

  const sendBg = highlightSend
    ? sendTapped
      ? C.amberDk
      : C.amber
    : C.stone6;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#f8f7f5",
        fontFamily: "inherit",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: 230,
          height: "100%",
          background: C.white,
          borderRight: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          padding: "28px 0",
          flexShrink: 0,
        }}
      >
        {/* Brand */}
        <div
          style={{
            padding: "0 24px 28px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <svg
            viewBox="0 0 200 160"
            width={32}
            fill="none"
            stroke={C.ink}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M40 60c0-3 3-6 8-6h70c5 0 8 3 8 6" />
            <ellipse cx={83} cy={60} rx={43} ry={6} />
            <path d="M40 60v40c0 14 12 26 26 26h34c14 0 26-12 26-26V60" />
            <path d="M126 70h12c10 0 18 8 18 18v0c0 10-8 18-18 18h-12" />
          </svg>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>Kaffeelisten</span>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: item.active ? C.amberWsh : "transparent",
                color: item.active ? C.amber : C.stone6,
                fontSize: 15,
                fontWeight: item.active ? 700 : 500,
                border: item.active ? `1px solid rgba(217,119,6,0.2)` : "1px solid transparent",
              }}
            >
              {item.label}
            </div>
          ))}
        </div>

        {/* Send button in sidebar */}
        <div style={{ padding: "0 12px 8px" }}>
          <div
            style={{
              padding: "11px 14px",
              borderRadius: 10,
              background: highlightSend ? C.amberWsh : C.stone,
              border: `1px solid ${highlightSend ? C.amber : C.border}`,
              color: highlightSend ? C.amber : C.stone6,
              fontSize: 14,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>↗</span>
            Bericht senden
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div
          style={{
            height: 76,
            padding: "0 32px",
            background: C.white,
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: C.muted,
              }}
            >
              MAI 2026
            </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>
              Übersicht
            </span>
          </div>

          {/* Bericht senden button — this is the one the cursor targets */}
          <div
            style={{
              padding: "12px 22px",
              borderRadius: 10,
              background: sendBg,
              color: C.white,
              fontSize: 15,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: highlightSend && !sendTapped
                ? "0 6px 20px rgba(217,119,6,0.32)"
                : "none",
              transform: sendTapped ? "scale(0.96)" : "scale(1)",
              border: `1px solid ${highlightSend ? C.amber : "transparent"}`,
            }}
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Bericht senden
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: "28px 32px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Metric cards */}
          <div style={{ display: "flex", gap: 16 }}>
            <MetricCard label="Einträge" value={368} startFrame={metricsStartFrame} />
            {/* Umsatz: 368 entries × avg ~0,38 € (real seed prices) */}
            <MetricCard label="Umsatz" value={142.5} prefix="€ " decimals={2} startFrame={metricsStartFrame + 10} />
            <MetricCard label="Beliebtestes Item" value="Filterkaffee" startFrame={metricsStartFrame + 16} />
            <MetricCard label="Unternehmen" value={5} startFrame={metricsStartFrame + 22} />
          </div>

          {/* Table */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 12 }}>
              Letzte Einträge
            </div>
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "90px 1fr 1.2fr 1fr 60px 90px",
                gap: 0,
                padding: "10px 18px",
                background: C.stone,
                borderRadius: "10px 10px 0 0",
                border: `1px solid ${C.border}`,
                borderBottom: "none",
              }}
            >
              {["ZEITPUNKT", "PERSON", "UNTERNEHMEN", "ITEM", "MENGE", "BETRAG"].map((col) => (
                <div
                  key={col}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.muted,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {col}
                </div>
              ))}
            </div>
            {/* Table rows */}
            {TABLE_ROWS.map((row, i) => {
              const rowOpacity = interpolate(
                frame,
                [tableStartFrame + i * 8, tableStartFrame + i * 8 + 16],
                [0, 1],
                EX
              );
              const rowY = interpolate(
                frame,
                [tableStartFrame + i * 8, tableStartFrame + i * 8 + 16],
                [12, 0],
                EX
              );
              return (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "90px 1fr 1.2fr 1fr 60px 90px",
                    gap: 0,
                    padding: "13px 18px",
                    background: C.white,
                    borderLeft: `1px solid ${C.border}`,
                    borderRight: `1px solid ${C.border}`,
                    borderBottom: `1px solid ${C.border}`,
                    borderRadius: i === TABLE_ROWS.length - 1 ? "0 0 10px 10px" : 0,
                    opacity: rowOpacity,
                    transform: `translateY(${rowY}px)`,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>{row.time}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{row.person}</div>
                  <div style={{ fontSize: 14, color: C.stone6 }}>{row.company}</div>
                  <div style={{ fontSize: 14, color: C.stone6 }}>{row.item}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{row.qty}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{row.amount}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
