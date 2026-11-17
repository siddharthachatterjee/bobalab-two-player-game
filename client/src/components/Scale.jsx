import React, { createContext, useContext, useRef, useState } from "react";
import { ACTION, clampAction, formatAim, formatMoney } from "../../../shared/model.js";

// The number line every screen uses. The default is the 2-player game's scale;
// other games pass their own through <ScaleContext.Provider>.
//   min, max, step   the range of picks
//   ticks            tick positions; labelled ones are in `labels`
//   label(t)         tick label text
//   payMax           top of the pay curve; payLabel(v) formats pay
export const DEFAULT_SCALE = {
  min: ACTION.min,
  max: ACTION.max,
  step: ACTION.step,
  ticks: Array.from({ length: 11 }, (_, i) => ACTION.min + i * 0.5),
  labels: [-2, -1, 0, 1, 2],
  label: (t) => (t === 0 ? "normal" : formatAim(t)),
  clamp: clampAction,
  payMax: 100,
  payLabel: formatMoney,
};
export const ScaleContext = createContext(DEFAULT_SCALE);
export const useScale = () => useContext(ScaleContext);

const pctOn = (s, a) => ((Math.max(s.min, Math.min(s.max, a)) - s.min) / (s.max - s.min)) * 100;
export const pct = (a) => pctOn(DEFAULT_SCALE, a);
export function usePct() {
  const s = useScale();
  return (a) => pctOn(s, a);
}

// Pointer dragging along the line. Grabbing an element with data-handle drags
// that handle; pressing anywhere else moves the default handle there.
// onRelease (optional) runs once at the end of each press or drag.
export function useLineDrag(onSet, defaultHandle, onRelease) {
  const s = useScale();
  const ref = useRef(null);
  const [dragging, setDragging] = useState(null);
  const valueAt = (clientX) => {
    const r = ref.current.getBoundingClientRect();
    return s.clamp(s.min + ((clientX - r.left) / r.width) * (s.max - s.min));
  };
  const stop = () => {
    if (dragging) onRelease?.(dragging);
    setDragging(null);
  };
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
export function useNudge() {
  const s = useScale();
  return (onSet, name, value, onRelease) => (e) => {
    const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!d) return;
    onSet(name, s.clamp(value + d * s.step));
    onRelease?.(name);
  };
}
export const nudge = (onSet, name, value) => (e) => {
  const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
  if (d) onSet(name, clampAction(value + d * ACTION.step));
};

// The line itself, with tick labels underneath. Children are positioned on it.
export function Axis({ children }) {
  const s = useScale();
  const p = usePct();
  return (
    <div className="relative">
      <div className="relative h-px bg-ink">
        {s.ticks.map((t) => (
          <span
            key={t}
            className={`absolute top-0 w-px bg-ink ${t === 0 ? "h-3 -translate-y-1.5" : "h-1.5"}`}
            style={{ left: `${p(t)}%` }}
          />
        ))}
        {children}
      </div>
      <div className="relative h-5 mt-2 font-mono text-[10px] text-faint">
        {s.labels.map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: `${p(t)}%` }}>
            {s.label(t)}
          </span>
        ))}
      </div>
    </div>
  );
}

// A marker sitting on the line, with its label in a row below the tick labels.
// kind: "target" (ring), "partner" (diamond), "you" (filled orange dot)
export function Marker({ value, kind, label, row = 0, handle, faded = false, ...props }) {
  const p = usePct();
  const Tag = handle ? "button" : "div";
  return (
    <Tag
      {...props}
      data-handle={handle}
      className={`absolute top-0 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center ${
        handle ? "h-9 w-9 bg-transparent cursor-ew-resize touch-none focus:outline-none group" : "h-5 w-5 pointer-events-none"
      } ${faded ? "opacity-45" : ""}`}
      style={{ left: `${p(value)}%` }}
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

export function PayCurve({ payAt, best, at, height = "h-40" }) {
  const s = useScale();
  const p = usePct();
  const yOf = (pay) => 12 + (1 - pay / s.payMax) * (VH - 12);
  const pts = [];
  for (let a = s.min; a <= s.max + 1e-9; a += s.step) {
    pts.push(`${((p(a) / 100) * VW).toFixed(1)},${yOf(payAt(a)).toFixed(1)}`);
  }
  const curve = `M${pts.join("L")}`;
  const hasPick = at !== undefined && at !== null;
  const showBest = best !== undefined && (!hasPick || Math.abs(best - at) > (s.max - s.min) / 10);

  return (
    <div className={`relative ${height}`}>
      <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <line x1="0" x2={VW} y1={yOf(s.payMax)} y2={yOf(s.payMax)} stroke="#dcd6c8" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        <path d={`${curve}L${VW},${VH}L0,${VH}Z`} fill="#e2571e" fillOpacity="0.08" />
        <path d={curve} fill="none" stroke="#1d1c1a" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {hasPick && (
          <line
            x1={(p(at) / 100) * VW}
            x2={(p(at) / 100) * VW}
            y1={yOf(payAt(at))}
            y2={VH}
            stroke="#e2571e"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <span className="absolute left-0 font-mono text-[10px] text-faint -translate-y-full" style={{ top: `${(yOf(s.payMax) / VH) * 100}%` }}>
        {s.payLabel(s.payMax)}
      </span>
      {showBest && (
        <CurveDot at={best} y={yOf(payAt(best)) / VH} label={`best ${s.label(best)}: ${s.payLabel(payAt(best))}`} dot="bg-ink" tone="text-muted" />
      )}
      {hasPick && (
        <CurveDot at={at} y={yOf(payAt(at)) / VH} label={s.payLabel(payAt(at))} dot="bg-accent" tone="text-accent font-medium text-[14px]" />
      )}
    </div>
  );
}

function CurveDot({ at, y, label, dot, tone }) {
  const p = usePct();
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-[left,top] duration-200 ease-out"
      style={{ left: `${p(at)}%`, top: `${y * 100}%` }}
    >
      <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap font-mono text-[12px] tabular-nums ${tone}`}>
        {label}
      </span>
      <span className={`block h-2.5 w-2.5 rounded-full ring-2 ring-paper ${dot}`} />
    </div>
  );
}
