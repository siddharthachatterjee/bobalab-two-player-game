import React from "react";

// The setup at a glance: your plant, the AI relay, the other plant.
// Message bubbles ride the wires: `outgoing` (yours) and `incoming` (theirs).
export function Scene({ you, partner, outgoing, incoming }) {
  return (
    <div className="flex items-end gap-2">
      <Plant name={you} sub="you" mine />
      <Wire bubble={outgoing} mine />
      <Relay />
      <Wire bubble={incoming} />
      <Plant name={partner} sub="other branch" />
    </div>
  );
}

function Plant({ name, sub, mine }) {
  const glow = mine ? "#e2571e" : "#dcd6c8";
  return (
    <div className="flex flex-col items-center shrink-0 w-28">
      <svg width="84" height="60" viewBox="0 0 84 60" aria-hidden="true">
        <rect x="60" y="6" width="9" height="22" fill="#fbfaf7" stroke="#1d1c1a" strokeWidth="1.5" />
        <path d="M4 58V28l18-12v12l18-12v12l18-12v42z" fill="#fbfaf7" stroke="#1d1c1a" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="58" y="28" width="22" height="30" fill="#fbfaf7" stroke="#1d1c1a" strokeWidth="1.5" />
        {[12, 28, 44].map((x) => (
          <rect key={x} x={x} y="38" width="9" height="8" fill={glow} stroke="#1d1c1a" strokeWidth="1" />
        ))}
        <rect x="64" y="44" width="10" height="14" fill="#1d1c1a" />
      </svg>
      <div className="mt-1.5 text-[14px] font-medium text-ink leading-tight">{name}</div>
      <div className="text-[12px] text-faint">{sub}</div>
    </div>
  );
}

function Relay() {
  return (
    <div className="flex flex-col items-center shrink-0 w-16 pb-9">
      <svg width="40" height="34" viewBox="0 0 40 34" aria-hidden="true">
        <line x1="20" y1="2" x2="20" y2="8" stroke="#1d1c1a" strokeWidth="1.5" />
        <circle cx="20" cy="2.5" r="2.5" fill="#e2571e" />
        <rect x="3" y="8" width="34" height="24" rx="6" fill="#fbfaf7" stroke="#1d1c1a" strokeWidth="1.5" />
        <circle cx="14" cy="20" r="2.5" fill="#1d1c1a" />
        <circle cx="26" cy="20" r="2.5" fill="#1d1c1a" />
      </svg>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">AI</div>
    </div>
  );
}

function Wire({ bubble, mine }) {
  return (
    <div className="relative flex-1 mb-[62px] border-t border-dashed border-faint">
      {bubble && (
        <span
          key={bubble}
          className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-3 h-7 inline-flex items-center font-mono text-[13px] tabular-nums ${
            mine ? "bg-accent border-ink text-white anim-from-left" : "bg-surface border-ink text-ink anim-from-right"
          }`}
        >
          {bubble}
        </span>
      )}
    </div>
  );
}
