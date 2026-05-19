import React from "react";
import { C } from "../constants";

interface Props {
  selectedCompany?: string;
}

// Real companies from supabase/seed.sql
const COMPANIES = [
  "Movemaster GmbH",
  "DEGDEV UG",
  "INN.KUBATOR",
  "Level51 e.V.",
  "THD Startup Campus",
];

export const CompanyScreen: React.FC<Props> = ({ selectedCompany }) => (
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
              width: i === 0 ? 22 : 8,
              height: 8,
              borderRadius: 4,
              background: i === 0 ? C.amber : C.border,
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: C.muted,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
        }}
      >
        ITC1 · Kaffeelisten
      </span>
    </div>

    {/* Heading */}
    <div style={{ padding: "28px 24px 20px", flexShrink: 0 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 36,
          fontWeight: 800,
          color: C.ink,
          lineHeight: 1.1,
        }}
      >
        Wer bist du?
      </h2>
      <p
        style={{
          margin: "7px 0 0",
          fontSize: 17,
          fontWeight: 500,
          color: C.muted,
        }}
      >
        Select your company
      </p>
    </div>

    {/* Company list */}
    <div
      style={{
        flex: 1,
        padding: "0 16px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        overflow: "hidden",
      }}
    >
      {COMPANIES.map((company) => {
        const isSelected = selectedCompany === company;
        return (
          <div
            key={company}
            style={{
              padding: "18px 20px",
              borderRadius: 16,
              border: `${isSelected ? 2 : 1}px solid ${isSelected ? C.amber : C.border}`,
              borderLeft: `${isSelected ? 6 : 1}px solid ${isSelected ? C.amber : C.border}`,
              background: isSelected ? C.amberWsh : C.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: isSelected
                ? "0 4px 18px rgba(217,119,6,0.14)"
                : "0 2px 8px rgba(28,25,23,0.05)",
            }}
          >
            <span
              style={{
                fontSize: 19,
                fontWeight: isSelected ? 700 : 500,
                color: isSelected ? C.amber : C.ink,
              }}
            >
              {company}
            </span>
            {isSelected && (
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  background: C.amber,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width={13}
                  height={13}
                  viewBox="0 0 13 13"
                  fill="none"
                  stroke="white"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="2,6.5 5.5,10 11,3" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);
