import React, { useRef, useState } from "react";
import { ACTION, clampAction, formatAim, formatMoney } from "../../../shared/model.js";

// Every screen uses the same crate line, from ACTION.min to ACTION.max.
export const pct = (a) =>
  ((Math.max(ACTION.min, Math.min(ACTION.max, a)) - ACTION.min) / (ACTION.max - ACTION.min)) * 100;

const TICKS = Array.from({ length: 11 }, (_, i) => ACTION.min + i * 0.5);

// Pointer dragging along the line. Grabbing an element with data-handle drags
// that handle; pressing anywhere else moves the default handle there.
export function useLineDrag(onSet, defaultHandle) {
  const ref = useRef(null);
  const [dragging, setDragging] = useState(null);
  const valueAt = (clientX) => {
    const r = ref.current.getBoundingClientRect();
    return clampAction(ACTION.min + ((clientX - r.left) / r.width) * (ACTION.max - ACTION.min));
  };
  const stop = () => setDragging(null);
  return {
    ref,
    onPointerDown: (e) => {
      const which = e.target.closest("[data-handle]")?.dataset.handle || defaultHandle;
      setDragging(which);
      ref.current.setPointerCapture(e.pointerId);
      if (which === defaultHandle) onSet(which, valueAt(e.clientX));
    },
    onPointerMove: (e) => dragging && onSet(dragging, valueAt(e.clientX)),
    onPointerUp: stop,
    onPointerCancel: stop,
  };
}

// Arrow keys nudge a focused handle.
export const nudge = (onSet, name, value) => (e) => {
  const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
  if (d) onSet(name, clampAction(value + d * ACTION.step));
};

// The line itself, with tick labels underneath. Children are positioned on it.
export function Axis({ children }) {
  return (
    <div className="relative">
      <div className="relative h-px bg-ink">
        {TICKS.map((t) => (
          <span
            key={t}
            className={`absolute top-0 w-px bg-ink ${t === 0 ? "h-3 -translate-y-1.5" : "h-1.5"}`}
            style={{ left: `${pct(t)}%` }}
          />
        ))}
        {children}
      </div>
      <div className="relative h-5 mt-2 font-mono text-[10px] text-faint">
        {TICKS.filter((t) => Math.abs(t) % 1 === 0).map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: `${pct(t)}%` }}>
            {t === 0 ? "normal" : formatAim(t)}
          </span>
        ))}
      </div>
    </div>
  );
}

// A marker sitting on the line, with its label in a row below the tick labels.
// kind: "target" (ring), "partner" (diamond), "you" (filled orange dot)
export function Marker({ value, kind, label, row = 0, handle, ...props }) {
  const Tag = handle ? "button" : "div";
  return (
    <Tag
      {...props}
      data-handle={handle}
      className={`absolute top-0 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center ${
        handle ? "h-9 w-9 bg-transparent cursor-ew-resize touch-none focus:outline-none group" : "h-5 w-5 pointer-events-none"
      }`}
      style={{ left: `${pct(value)}%` }}
    >
      {kind === "target" && <span className="h-4 w-4 rounded-full border-2 border-ink bg-paper" />}
      {kind === "partner" && (
        <span className="h-3.5 w-3.5 rotate-45 border-2 border-muted bg-paper group-focus-visible:ring-2 ring-accent/40" />
      )}
      {kind === "you" && (
        <span className="h-5 w-5 rounded-full bg-accent border-2 border-ink group-focus-visible:ring-4 ring-accent/30" />
      )}
      {label && (
        <span
          className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[12px] pointer-events-none ${
            kind === "you" ? "text-accent font-medium" : kind === "target" ? "text-ink" : "text-muted"
          }`}
          style={{ top: `${(handle ? 46 : 38) + row * 18}px` }}
        >
          {label}
        </span>
      )}
    </Tag>
  );
}

// Pay for every possible pick, drawn above the line.
// payAt(a) gives the pay for a pick; `at` (optional) marks the current pick.
const VW = 1000;
const VH = 160;
const yOf = (coins) => 12 + (1 - coins / 100) * (VH - 12);

export function PayCurve({ payAt, best, at, height = "h-40" }) {
  const pts = [];
  for (let a = ACTION.min; a <= ACTION.max + 1e-9; a += ACTION.step) {
    pts.push(`${((pct(a) / 100) * VW).toFixed(1)},${yOf(payAt(a)).toFixed(1)}`);
  }
  const curve = `M${pts.join("L")}`;
  const hasPick = at !== undefined && at !== null;
  const showBest = best !== undefined && (!hasPick || Math.abs(best - at) > 0.5);

  return (
    <div className={`relative ${height}`}>
      <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <line x1="0" x2={VW} y1={yOf(100)} y2={yOf(100)} stroke="#dcd6c8" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        <path d={`${curve}L${VW},${VH}L0,${VH}Z`} fill="#e2571e" fillOpacity="0.08" />
        <path d={curve} fill="none" stroke="#1d1c1a" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {hasPick && (
          <line
            x1={(pct(at) / 100) * VW}
            x2={(pct(at) / 100) * VW}
            y1={yOf(payAt(at))}
            y2={VH}
            stroke="#e2571e"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <span className="absolute left-0 font-mono text-[10px] text-faint -translate-y-full" style={{ top: `${(yOf(100) / VH) * 100}%` }}>
        $100
      </span>
      {showBest && (
        <CurveDot at={best} coins={payAt(best)} label={`best ${formatAim(best)}: ${formatMoney(payAt(best))}`} dot="bg-ink" tone="text-muted" />
      )}
      {hasPick && (
        <CurveDot at={at} coins={payAt(at)} label={formatMoney(payAt(at))} dot="bg-accent" tone="text-accent font-medium text-[14px]" />
      )}
    </div>
  );
}

function CurveDot({ at, coins, label, dot, tone }) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-[left,top] duration-200 ease-out"
      style={{ left: `${pct(at)}%`, top: `${(yOf(coins) / VH) * 100}%` }}
    >
      <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap font-mono text-[12px] tabular-nums ${tone}`}>
        {label}
      </span>
      <span className={`block h-2.5 w-2.5 rounded-full ring-2 ring-paper ${dot}`} />
    </div>
  );
}
