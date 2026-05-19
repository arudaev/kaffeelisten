import React from "react";
import { C } from "../constants";

interface ItemDef {
  name: string;
  price: string;
  priceCents: number;
}

// Real item prices from supabase/seed.sql (price_cents)
const ITEMS: ItemDef[] = [
  { name: "Cappuccino", price: "0,50 €", priceCents: 50 },
  { name: "Espresso", price: "0,30 €", priceCents: 30 },
  { name: "Filterkaffee", price: "0,20 €", priceCents: 20 },
  { name: "Latte Macchiato", price: "0,50 €", priceCents: 50 },
];

interface Props {
  selectedItems?: string[];
  quantities?: Record<string, number>;
  showCart?: boolean;
  activeTab?: string;
}

export const ItemScreen: React.FC<Props> = ({
  selectedItems = [],
  quantities = {},
  showCart = false,
  activeTab = "Kaffee",
}) => {
  const totalCents = selectedItems.reduce((sum, name) => {
    const item = ITEMS.find((i) => i.name === name);
    if (!item) return sum;
    return sum + item.priceCents * (quantities[name] ?? 1);
  }, 0);
  const totalStr =
    (totalCents / 100).toFixed(2).replace(".", ",") + " €";

  return (
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
        <span style={{ fontSize: 15, fontWeight: 600, color: C.stone6 }}>←</span>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: i <= 1 ? 22 : 8,
                height: 8,
                borderRadius: 4,
                background: i <= 1 ? C.amber : C.border,
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: C.muted,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          ALEXANDER R. · MOVEMASTER GMBH
        </span>
      </div>

      {/* Heading */}
      <div style={{ padding: "18px 20px 10px", flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: C.ink }}>
          Was hast du genommen?
        </h2>
        <p style={{ margin: "5px 0 0", fontSize: 15, color: C.muted, fontWeight: 500 }}>
          What did you have?
        </p>
      </div>

      {/* Category tabs */}
      <div
        style={{
          padding: "0 16px 12px",
          display: "flex",
          gap: 8,
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        {["Getränke", "Snacks", "Kaffee", "Speisen"].map((tab) => (
          <div
            key={tab}
            style={{
              padding: "7px 16px",
              borderRadius: 99,
              background: tab === activeTab ? C.amber : C.white,
              color: tab === activeTab ? C.white : C.stone6,
              fontSize: 14,
              fontWeight: tab === activeTab ? 700 : 500,
              border: `1px solid ${tab === activeTab ? C.amber : C.border}`,
            }}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Item grid */}
      <div
        style={{
          flex: 1,
          padding: "0 16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          overflow: "hidden",
          alignContent: "start",
        }}
      >
        {ITEMS.map((item) => {
          const isSelected = selectedItems.includes(item.name);
          const qty = quantities[item.name] ?? 1;
          return (
            <div
              key={item.name}
              style={{
                padding: "18px 16px",
                borderRadius: 18,
                border: `${isSelected ? 2 : 1}px solid ${isSelected ? C.amber : C.border}`,
                background: isSelected ? C.amberWsh : C.white,
                boxShadow: isSelected
                  ? "0 6px 20px rgba(217,119,6,0.14)"
                  : "0 2px 10px rgba(28,25,23,0.06)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: isSelected ? C.amber : C.ink,
                  lineHeight: 1.2,
                }}
              >
                {item.name}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>
                {item.price}
              </div>
              {isSelected && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 4,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      background: C.white,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 700,
                      color: C.stone6,
                    }}
                  >
                    −
                  </div>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: C.ink,
                      minWidth: 14,
                      textAlign: "center",
                    }}
                  >
                    {qty}
                  </span>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: C.amber,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 700,
                      color: C.white,
                    }}
                  >
                    +
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cart footer */}
      {showCart && (
        <div
          style={{
            height: 76,
            padding: "0 16px",
            background: C.white,
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 -6px 20px rgba(28,25,23,0.08)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>
            {selectedItems.length} Artikel · {totalStr}
          </span>
          <div
            style={{
              padding: "11px 22px",
              background: C.amber,
              borderRadius: 10,
              color: C.white,
              fontSize: 17,
              fontWeight: 700,
              boxShadow: "0 6px 16px rgba(217,119,6,0.28)",
            }}
          >
            Weiter →
          </div>
        </div>
      )}
    </div>
  );
};
