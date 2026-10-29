import React from "react";

// A delivery truck whose bed fills with crates as the pick grows.
// Half full (10 of 20 crates) is normal; each crate icon is 25 crates.
const COLS = 5;
const ROWS = 4;
const SLOTS = COLS * ROWS;
const PER_ICON = 0.25;

export const crateIcons = (a) =>
  Math.round(Math.max(0, Math.min(SLOTS, SLOTS / 2 + a / PER_ICON)));

export function Truck({ value, tone = "you", width = 220 }) {
  const n = crateIcons(value ?? 0);
  const cab = tone === "you" ? "#e2571e" : "#a8a293";
  const bedX = 6;
  const bedY = 8;
  const cw = 34;
  const ch = 22;
  const bedW = COLS * cw + 8;
  const bedH = ROWS * ch + 8;

  return (
    <svg width={width} viewBox="0 0 250 132" aria-hidden="true">
      {/* bed */}
      <rect x={bedX} y={bedY} width={bedW} height={bedH} rx="3" fill="#fbfaf7" stroke="#1d1c1a" strokeWidth="1.5" />
      {Array.from({ length: n }, (_, i) => {
        const col = i % COLS;
        const row = ROWS - 1 - Math.floor(i / COLS);
        const x = bedX + 4 + col * cw;
        const y = bedY + 4 + row * ch;
        return (
          <g key={i} className="anim-crate">
            <rect x={x + 1} y={y + 1} width={cw - 2} height={ch - 2} rx="1.5" fill="#c9965f" stroke="#1d1c1a" strokeWidth="1.2" />
            <line x1={x + 4} y1={y + ch / 2} x2={x + cw - 4} y2={y + ch / 2} stroke="#8a5f33" strokeWidth="1.2" />
          </g>
        );
      })}
      {/* "normal" line: half full */}
      <line
        x1={bedX}
        x2={bedX + bedW}
        y1={bedY + 4 + (ROWS / 2) * ch}
        y2={bedY + 4 + (ROWS / 2) * ch}
        stroke="#77705f"
        strokeDasharray="3 3"
      />
      {/* cab */}
      <path
        d={`M${bedX + bedW + 4} ${bedY + bedH} V${bedY + 34} h22 l16 22 V${bedY + bedH} z`}
        fill={cab}
        stroke="#1d1c1a"
        strokeWidth="1.5"
      />
      <path d={`M${bedX + bedW + 10} ${bedY + 40} h14 l10 14 h-24 z`} fill="#fbfaf7" stroke="#1d1c1a" strokeWidth="1.2" />
      {/* chassis and wheels */}
      <line x1={bedX} x2={bedX + bedW + 46} y1={bedY + bedH + 3} y2={bedY + bedH + 3} stroke="#1d1c1a" strokeWidth="2" />
      {[bedX + 30, bedX + bedW - 30, bedX + bedW + 30].map((cx) => (
        <circle key={cx} cx={cx} cy={bedY + bedH + 12} r="9" fill="#1d1c1a" />
      ))}
    </svg>
  );
}
