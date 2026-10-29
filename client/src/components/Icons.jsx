import React from "react";

// Line icons, drawn on a 24px grid with a 2px stroke.
function Svg({ size = 20, className = "", children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// One or two chevrons for a message key (up1, up2, down1, down2).
export function Chevrons({ msg, size = 20, className = "" }) {
  const up = msg.startsWith("up");
  const double = msg.endsWith("2");
  const rows = double ? [-3.5, 3.5] : [0];
  return (
    <Svg size={size} className={`${up ? "text-up" : "text-down"} ${className}`}>
      {rows.map((dy) => (
        <polyline
          key={dy}
          points={up ? `5,${15 + dy} 12,${8 + dy} 19,${15 + dy}` : `5,${9 + dy} 12,${16 + dy} 19,${9 + dy}`}
        />
      ))}
    </Svg>
  );
}

// Both players run a plant, so both get the factory glyph.
export function RoleIcon({ size = 20, className = "" }) {
  return (
    <Svg size={size} className={className}>
      <path d="M3 21V10l5 3v-3l5 3v-3l5 3V4h3v17z" />
    </Svg>
  );
}

export function TargetIcon({ size = 16, className = "" }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </Svg>
  );
}

export function TriangleUp({ size = 12, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" className={className} aria-hidden="true">
      <path d="M6 1.5 11 10.5H1z" fill="currentColor" />
    </svg>
  );
}

export function TriangleDown({ size = 12, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" className={className} aria-hidden="true">
      <path d="M6 10.5 1 1.5h10z" fill="currentColor" />
    </svg>
  );
}
