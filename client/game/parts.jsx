// Shared pieces of the Study 1 screens: layout, the situations table, the
// forwarding rule and points modals, and the round header.
import React, { useEffect, useRef } from "react";
import { RoleIcon } from "../src/components/Icons";
import { useGame, useRoles } from "./context";
import { MARKETS, formatCoef, formatCrates, formatPoints, pct, situationName } from "../../shared/rules.js";

// ---------------------------------------------------------------- layout

// Scrolls the app's scrolling container (marked data-scroller) back to the top.
export function scrollToTop() {
  document.querySelector("[data-scroller]")?.scrollTo(0, 0);
}

export function Page({ children, width = "max-w-4xl" }) {
  return <div className={`w-full ${width} mx-auto px-4 sm:px-6 py-10 sm:py-12 space-y-10 anim-fade-up`}>{children}</div>;
}

export function H1({ children }) {
  return <h1 className="text-[28px] font-semibold tracking-tight text-ink leading-tight">{children}</h1>;
}

export function H2({ children, className = "" }) {
  return <h2 className={`text-[28px] font-semibold tracking-tight text-ink ${className}`}>{children}</h2>;
}

// A small label above a block (mono, uppercase).
export function Section({ children, className = "" }) {
  return (
    <h3 className={`font-mono text-[11px] font-normal uppercase tracking-[0.12em] text-muted ${className}`}>{children}</h3>
  );
}

export function Kicker({ children }) {
  return <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{children}</div>;
}

export function P({ children, className = "", strong = false }) {
  return (
    <p className={`max-w-2xl text-[15px] leading-relaxed ${strong ? "text-ink" : "text-muted"} ${className}`}>{children}</p>
  );
}

export function Box({ label, children, tone = "plain" }) {
  const look = tone === "warm" ? "border-l-4 border-l-accent border-line bg-surface" : "border-line bg-surface";
  return (
    <div className={`max-w-2xl rounded-lg border px-5 py-4 ${look}`}>
      {label && <Kicker>{label}</Kicker>}
      <div className={`${label ? "mt-2" : ""} text-[15px] leading-relaxed text-ink`}>{children}</div>
    </div>
  );
}

export function Button({ children, onClick, disabled = false, kind = "primary", className = "" }) {
  const look =
    kind === "primary"
      ? "bg-ink text-surface hover:bg-accent disabled:bg-line disabled:text-faint"
      : "bg-transparent border border-ink/30 text-ink hover:border-ink";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-12 px-8 rounded-full text-[15px] font-medium transition-colors disabled:cursor-not-allowed ${look} ${className}`}
    >
      {children}
    </button>
  );
}

// An underlined text link that opens something.
export function LinkButton({ children, onClick }) {
  return (
    <button type="button" onClick={onClick} className="text-[14px] text-muted underline underline-offset-4 hover:text-ink">
      {children}
    </button>
  );
}

export function Progress({ at, of }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={`h-1 flex-1 rounded-full ${i <= at ? "bg-accent" : "bg-line"}`} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- header

export function TopBar({ children, right = null }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto max-w-4xl h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-[14px] text-ink">
          <RoleIcon size={18} />
          {children}
        </div>
        {right}
      </div>
    </header>
  );
}

const STEPS = { send: "Send", ship: "Read & ship", results: "Results" };

export function RoundHeader({ round, step }) {
  const { session, roles } = useGame();
  const where = round.practice ? `Practice ${round.n} of ${session.practice}` : `Round ${round.n} of ${session.paid}`;
  const keys = Object.keys(STEPS);
  const at = keys.indexOf(step);
  return (
    <TopBar
      right={
        <ol className="flex items-center gap-1 text-[13px]">
          {keys.map((k, i) => (
            <li key={k} className="flex items-center gap-1">
              {i > 0 && <span className="hidden sm:block w-4 h-px bg-line" />}
              <span
                className={`rounded-full px-2.5 py-0.5 whitespace-nowrap ${
                  i === at ? "bg-ink text-surface" : at > i ? "text-ink" : "text-faint"
                }`}
              >
                {i + 1}
                <span className={i === at ? "" : "hidden sm:inline"}>. {STEPS[k]}</span>
              </span>
            </li>
          ))}
        </ol>
      }
    >
      <span className="font-medium">{roles.youPlant}</span>
      <span className="text-faint">·</span>
      <span className="font-medium">{where}</span>
      {round.practice && <span className="hidden sm:inline text-muted">· not paid</span>}
    </TopBar>
  );
}

// ---------------------------------------------------------------- situations

export function Targets({ arm, situation, className = "" }) {
  const s = arm.situations[situation];
  return (
    <span className={className}>
      <span className="whitespace-nowrap">
        Low {formatCrates(s.low)} ({pct(1 - arm.p)})
      </span>
      <span className="text-line mx-2">|</span>
      <span className="whitespace-nowrap">
        High {formatCrates(s.high)} ({pct(arm.p)})
      </span>
    </span>
  );
}

// All four situations with targets and probabilities, in display order.
// highlight: a situation id to tint.
export function SituationTable({ arm, highlight = null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[15px]">
        <thead>
          <tr className="text-left text-[13px] text-muted">
            <th className="px-3 sm:px-4 py-2 font-medium">Situation</th>
            <th className="px-3 sm:px-4 py-2 font-medium">
              <span className="hidden sm:inline">Target </span>if low ({pct(1 - arm.p)})
            </th>
            <th className="px-3 sm:px-4 py-2 font-medium">
              <span className="hidden sm:inline">Target </span>if high ({pct(arm.p)})
            </th>
            <th className="px-3 sm:px-4 py-2 font-medium text-right">
              <span className="hidden sm:inline">Probability</span>
              <span className="sm:hidden">Chance</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {arm.displayOrder.map((id) => {
            const s = arm.situations[id];
            return (
              <tr key={id} className={`border-t border-line ${highlight === id ? "bg-surface" : ""}`}>
                <td className="px-3 sm:px-4 py-2 font-medium text-ink">{s.name}</td>
                <td className="px-3 sm:px-4 py-2 font-mono tabular-nums">{formatCrates(s.low)}</td>
                <td className="px-3 sm:px-4 py-2 font-mono tabular-nums">{formatCrates(s.high)}</td>
                <td className="px-3 sm:px-4 py-2 text-right tabular-nums">{pct(s.prob)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- modals

export function Modal({ title, onClose, children, closeLabel = "Back to the game" }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-3 sm:p-6" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[92vh] overflow-auto rounded-lg bg-paper p-5 sm:p-8 shadow-2xl outline-none anim-fade-up space-y-5"
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-3 text-[28px] leading-none text-muted hover:text-ink">
          ×
        </button>
        <h2 className="pr-8 text-[24px] font-semibold tracking-tight text-ink">{title}</h2>
        {children}
        <div className="flex justify-end">
          <Button onClick={onClose}>{closeLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export const forwardingLabel = (arm) =>
  arm.forwarding === "unchanged" ? "Mediator passes messages unchanged" : "Mediator may change messages";

// The forwarding rule: what is delivered for each message sent, in each market.
export function ForwardingTable({ arm }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[15px] text-center">
        <thead>
          <tr className="text-[13px] text-muted">
            <th className="px-3 py-2 text-left font-semibold">Message sent</th>
            {MARKETS.map((m) => (
              <th key={m} className="px-3 py-2 font-medium">
                Delivered if market is {m} ({pct(m === "high" ? arm.p : 1 - arm.p)})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {arm.displayOrder.map((sent) => (
            <tr key={sent} className="border-t border-line">
              <td className="px-3 py-2 text-left font-medium text-ink">{situationName(arm, sent)}</td>
              {MARKETS.map((m) => {
                const d = arm.forwarding === "unchanged" ? sent : arm.forward[m][sent];
                return (
                  <td key={m} className={`px-3 py-2 ${d !== sent ? "font-semibold text-accent" : "text-ink"}`}>
                    {situationName(arm, d)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ForwardingModal({ arm, onClose, closeLabel }) {
  const roles = useRoles();
  const unchanged = arm.forwarding === "unchanged";
  return (
    <Modal title="What the mediator passes between plants" onClose={onClose} closeLabel={closeLabel}>
      <Section>{unchanged ? "Messages passed unchanged" : "Messages can change with the market"}</Section>
      <P strong>
        {unchanged
          ? `The mediator passes the description you send to ${roles.partner} without changing it.`
          : `The mediator may change the description it passes on. The rule depends on the market, as shown below. Changed descriptions are marked in orange.`}
      </P>
      <ForwardingTable arm={arm} />
      <ul className="space-y-1 text-[14px] text-muted list-disc pl-5">
        <li>The same rule applies to both plants: your message to {roles.partner}, and {roles.partner}'s message to you.</li>
        <li>The mediator knows the market, but does not see either plant's targets.</li>
        {!unchanged && <li>This table shows both markets. You don't see which one happened until the results.</li>}
        <li>Your targets stay the same, whatever message you send.</li>
      </ul>
    </Modal>
  );
}

// "How points work": the formula with this arm's numbers and an example.
export function PointsModal({ arm, onClose }) {
  const roles = useRoles();
  const kT = arm.c * (1 - arm.gamma);
  const kS = arm.c * arm.gamma;
  const ex = { target: 20, ship: 40, partner: 60 };
  const lossT = kT * (ex.ship - ex.target) ** 2;
  const lossS = kS * (ex.ship - ex.partner) ** 2;
  return (
    <Modal title="How points work" onClose={onClose}>
      <P strong>Start with {arm.base} points each round. Two gaps reduce your points.</P>
      <div className="grid gap-4 sm:grid-cols-2">
        <Box>
          <div className="font-semibold">1. Distance from your target</div>
          You are given two targets. The market decides which one counts.
        </Box>
        <Box>
          <div className="font-semibold">2. Distance from {roles.partner}</div>
          The two actual shipments decide this gap.
        </Box>
      </div>
      <Box>
        <div className="font-mono text-[14px] sm:text-[15px] leading-7 text-ink">
          Points = {arm.base}
          <br />− {formatCoef(kT)} × (your shipment − your target)²
          <br />− {formatCoef(kS)} × (your shipment − {roles.partner}'s shipment)²
        </div>
      </Box>
      <Box label="Example">
        Your target is +{ex.target}, you ship +{ex.ship}, and {roles.partner} ships +{ex.partner}.
        <div className="mt-2 font-mono text-[14px] leading-7">
          {ex.ship - ex.target} crates from your target: −{formatPoints(lossT)} points
          <br />
          {ex.partner - ex.ship} crates from {roles.partner}: −{formatPoints(lossS)} points
          <br />
          Total: {arm.base} − {formatPoints(lossT)} − {formatPoints(lossS)} = {formatPoints(arm.base - lossT - lossS)} points
        </div>
      </Box>
      <ul className="space-y-1 text-[14px] text-muted list-disc pl-5">
        <li>The preview before you ship uses the market chances and your estimate of {roles.partner}'s shipment.</li>
        <li>Final points use the actual market and the actual shipments.</li>
        <li>The message you send does not change your targets.</li>
      </ul>
    </Modal>
  );
}
