import React from "react";
import { C } from "../constants";

interface Props {
  tapBestätigen?: boolean;
}

// Prices from supabase/seed.sql
const ORDER_ITEMS = [
  { name: "Cappuccino", price: "0,50 €" },
  { name: "Espresso", price: "0,30 €" },
];

export const ConfirmScreen: React.FC<Props> = ({ tapBestätigen = false }) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background: C.stone,
      display: "flex",
      flexDirection: "column",
      fontFamily: "inherit",
    }}
  >
    {/* Top bar */}
    <div
      style={{
        height: 68,
        padding: "0 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
        background: C.white,
      }}
    >
      <span style={{ fontSize: 15, fontWeight: 600, color: C.stone6 }}>← Zurück</span>
      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 22,
              height: 8,
              borderRadius: 4,
              background: C.amber,
            }}
          />
        ))}
      </div>
      <span style={{ width: 60 }} />
    </div>

    {/* Heading */}
    <div style={{ padding: "28px 24px 20px", flexShrink: 0 }}>
      <h2 style={{ margin: 0, fontSize: 36, fontWeight: 800, color: C.ink }}>
        Bestätigen?
      </h2>
      <p style={{ margin: "7px 0 0", fontSize: 17, fontWeight: 500, color: C.muted }}>
        Review your order
      </p>
    </div>

    {/* Receipt card */}
    <div
      style={{
        margin: "0 16px",
        padding: "22px 22px",
        borderRadius: 20,
        background: C.white,
        border: `1px solid ${C.border}`,
        boxShadow: "0 4px 18px rgba(28,25,23,0.07)",
        flexShrink: 0,
      }}
    >
      {ORDER_ITEMS.map((item, i) => (
        <div
          key={item.name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: i < ORDER_ITEMS.length - 1 ? 14 : 0,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 500, color: C.ink }}>
            1 × {item.name}
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>
            {item.price}
          </span>
        </div>
      ))}
      <div
        style={{
          height: 1,
          background: C.border,
          margin: "16px 0",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 600, color: C.stone6 }}>
          Gesamt / Total
        </span>
        <span style={{ fontSize: 26, fontWeight: 900, color: C.ink }}>
          0,80 €
        </span>
      </div>
    </div>

    <div style={{ flex: 1 }} />

    {/* Buttons */}
    <div
      style={{
        padding: "16px 16px 24px",
        display: "flex",
        gap: 12,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          height: 58,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 17,
          fontWeight: 600,
          color: C.stone6,
          background: C.white,
        }}
      >
        Abbrechen
      </div>
      <div
        style={{
          flex: 1.6,
          height: 58,
          borderRadius: 12,
          background: tapBestätigen ? C.amberDk : C.amber,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 17,
          fontWeight: 700,
          color: C.white,
          boxShadow: tapBestätigen
            ? "none"
            : "0 8px 22px rgba(217,119,6,0.28)",
          transform: tapBestätigen ? "scale(0.97)" : "scale(1)",
        }}
      >
        Bestätigen ✓
      </div>
    </div>
  </div>
);
