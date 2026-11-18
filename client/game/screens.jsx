// One round, from one player's point of view: send a message, read the partner's
// message and choose a shipment, see the results. Works for either plant and for a
// programmed or human partner (see ./context.js). Practice rounds add <Guide> notes.
import React, { useEffect, useRef, useState } from "react";
import {
  MARKET_NAMES,
  clampShip,
  expectedCost,
  formatCost,
  formatCrates,
  partnerCost,
  pct,
  situationName,
  targetCost,
} from "../../shared/rules.js";
import {
  Box,
  Button,
  ForwardingModal,
  H1,
  LinkButton,
  P,
  CostModal,
  Section,
  SituationTable,
  Targets,
  Kicker,
  forwardingLabel,
} from "./parts";
import { useRoles } from "./context";

const useStartTime = () => useRef(performance.now()).current;
const secondsSince = (t) => Math.round(performance.now() - t) / 1000;
const dist = (a, b) => Number(Math.abs(a - b).toFixed(1));

// Counts how often each help modal is opened, for the data.
function useHelp() {
  const [open, setOpen] = useState(null);
  const counts = useRef({ forwarding: 0, cost: 0 });
  const show = (k) => {
    counts.current[k] += 1;
    setOpen(k);
  };
  return { open, show, close: () => setOpen(null), counts: counts.current };
}

function HelpModals({ arm, help }) {
  if (help.open === "forwarding") return <ForwardingModal arm={arm} onClose={help.close} />;
  if (help.open === "cost") return <CostModal arm={arm} onClose={help.close} />;
  return null;
}

function Guide({ children }) {
  return (
    <div className="flex gap-3 rounded-lg bg-ink px-5 py-4 text-[15px] leading-relaxed text-surface">
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent pt-1 shrink-0">Practice</span>
      <div>{children}</div>
    </div>
  );
}

// Your situation and both targets, marked as private.
function YourSituation({ arm, situation }) {
  const me = arm.situations[situation];
  return (
    <div className="border-l-2 border-accent pl-3">
      <Kicker>Your situation · secret</Kicker>
      <div className="mt-1 text-[20px] font-semibold text-ink">{me.name}</div>
      <div className="mt-0.5 flex flex-wrap gap-x-5 text-[14px] text-muted">
        <span>
          Target if low <span className="font-mono text-[18px] font-medium text-ink">{formatCrates(me.low)}</span> (
          {pct(1 - arm.p)})
        </span>
        <span>
          if high <span className="font-mono text-[18px] font-medium text-ink">{formatCrates(me.high)}</span> ({pct(arm.p)})
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, note, tone = "text-ink" }) {
  return (
    <div className="border-l-2 border-line pl-3">
      <div className="text-[13px] text-muted">{label}</div>
      <div className={`font-mono text-2xl font-medium tabular-nums ${tone}`}>{value}</div>
      {note && <div className="text-[12px] text-muted">{note}</div>}
    </div>
  );
}

function Footer({ children }) {
  return <div className="border-t border-line pt-6 flex flex-wrap items-center gap-x-6 gap-y-4">{children}</div>;
}

// ---------------------------------------------------------------- 1. Send

export function Send({ arm, round, onDone }) {
  const roles = useRoles();
  const [sent, setSent] = useState(null);
  const help = useHelp();
  const started = useStartTime();
  return (
    <div className="space-y-10">
      {round.practice && (
        <Guide>
          Your situation and targets are private. Choose the description the mediator will pass to {roles.partner}. You can send
          any of the four. Your cost always uses your real targets.
        </Guide>
      )}
      <H1>Send your message.</H1>

      <section className="space-y-3">
        <div>
          <Section>Situations and probabilities</Section>
          <P>Each plant faces one of these situations, drawn separately, with the probabilities below.</P>
        </div>
        <SituationTable arm={arm} />
      </section>

      {round.suggestion !== null && (
        <div className="max-w-2xl rounded-lg border border-line bg-surface px-5 py-4">
          <Kicker>AI suggestion</Kicker>
          <div className="mt-1 text-[17px] text-ink">
            Send <span className="font-semibold">{situationName(arm, round.suggestion)}</span>.
          </div>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-3">
          <YourSituation arm={arm} situation={round.situation} />
          <P>Only you can see your targets.</P>
        </div>
        <div className="space-y-3">
          <Section>What message will you send?</Section>
          <P>You may choose any of the four descriptions.</P>
          <div role="radiogroup" aria-label="Message to send" className="space-y-2.5">
            {arm.displayOrder.map((id) => {
              const on = sent === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSent(id)}
                  className={`w-full flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-[15px] text-ink transition-colors ${
                    on ? "border-accent bg-surface font-semibold" : "border-line bg-transparent font-medium hover:border-ink/40"
                  }`}
                >
                  <span className={`grid place-items-center h-4 w-4 rounded-full border-2 ${on ? "border-ink" : "border-faint"}`}>
                    {on && <span className="h-2 w-2 rounded-full bg-ink" />}
                  </span>
                  {situationName(arm, id)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Footer>
        <span className="text-[14px] text-ink">{forwardingLabel(arm)}</span>
        <LinkButton onClick={() => help.show("forwarding")}>What does the mediator send?</LinkButton>
        <span className="flex-1" />
        <Button
          disabled={sent === null}
          onClick={() => onDone({ sent, secSend: secondsSince(started), helpSend: { ...help.counts } })}
        >
          {sent === null ? "Choose a message" : "Send selected message"}
        </Button>
        <LinkButton onClick={() => help.show("cost")}>How cost works</LinkButton>
      </Footer>
      <HelpModals arm={arm} help={help} />
    </div>
  );
}

// ---------------------------------------------------------------- 2. Read & ship

// A signed number box that accepts typing and arrow keys, clamped to [min, max].
function CrateInput({ value, onChange, min, max, label }) {
  const [text, setText] = useState(formatCrates(value).replace("−", "-"));
  useEffect(() => {
    setText((t) => (Number(t) === value ? t : formatCrates(value).replace("−", "-")));
  }, [value]);
  const commit = (t) => {
    const v = Number(t.replace("−", "-"));
    if (t.trim() !== "" && Number.isFinite(v)) onChange(Math.max(min, Math.min(max, Math.round(v))));
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        commit(e.target.value);
      }}
      onBlur={() => setText(formatCrates(value).replace("−", "-"))}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          onChange(Math.max(min, Math.min(max, value + (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : 1))));
        }
      }}
      className="h-12 w-28 rounded-md border border-ink/30 bg-surface px-3 font-mono text-[20px] tabular-nums text-ink focus:border-accent focus:outline-none"
    />
  );
}

// Expected cost for every shipment, with the current one marked. Click or drag to set it.
function CostChart({ arm, situation, guess, ship, onShip }) {
  const W = 420;
  const H = 210;
  const pad = { l: 44, r: 22, t: 26, b: 34 };
  const xs = [];
  for (let a = arm.min; a <= arm.max; a += 5) xs.push(a);
  const ys = xs.map((a) => expectedCost(arm, a, situation, guess));
  const yLow = 0;
  const yHigh = Math.ceil(Math.max(...ys) / 20) * 20;
  const X = (a) => pad.l + ((a - arm.min) / (arm.max - arm.min)) * (W - pad.l - pad.r);
  const Y = (v) => pad.t + (1 - (Math.min(yHigh, v) - yLow) / (yHigh - yLow)) * (H - pad.t - pad.b);
  const path = xs.map((a, i) => `${i ? "L" : "M"}${X(a).toFixed(1)},${Y(ys[i]).toFixed(1)}`).join("");
  const now = expectedCost(arm, ship, situation, guess);
  const yTicks = [yLow, (yLow + yHigh) / 2, yHigh];
  const half = Math.round(arm.max / 50) * 25; // a round number near the middle
  const xTicks = [arm.min, -half, 0, half, arm.max].filter((a) => a >= arm.min && a <= arm.max);
  const svg = useRef(null);
  const dragging = useRef(false);
  const setFromEvent = (e) => {
    const r = svg.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    onShip(clampShip(arm, arm.min + ((x - pad.l) / (W - pad.l - pad.r)) * (arm.max - arm.min)));
  };
  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full select-none touch-none cursor-pointer"
      role="img"
      aria-label={`Expected cost chart. At ${formatCrates(ship)} crates you expect a cost of ${formatCost(now)}.`}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        setFromEvent(e);
      }}
      onPointerMove={(e) => dragging.current && setFromEvent(e)}
      onPointerUp={() => (dragging.current = false)}
    >
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} stroke="#dcd6c8" strokeDasharray={v === yLow ? "" : "3 3"} />
          <text x={pad.l - 6} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="#77705f">
            {v}
          </text>
        </g>
      ))}
      {xTicks.map((a) => (
        <text key={a} x={X(a)} y={H - pad.b + 16} textAnchor="middle" fontSize="11" fill="#77705f">
          {formatCrates(a)}
        </text>
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="#1d1c1a" />
      <text x={(pad.l + W - pad.r) / 2} y={H - 2} textAnchor="middle" fontSize="11" fill="#77705f">
        Your shipment
      </text>
      <path d={path} fill="none" stroke="#1d1c1a" strokeWidth="2" />
      <line x1={X(ship)} x2={X(ship)} y1={Y(now)} y2={H - pad.b} stroke="#e2571e" strokeDasharray="2 3" />
      <circle cx={X(ship)} cy={Y(now)} r="6" fill="#e2571e" />
      <text x={Math.min(W - 40, Math.max(pad.l + 30, X(ship)))} y={Math.max(14, Y(now) - 11)} textAnchor="middle" fontSize="13" fontWeight="600" fill="#1d1c1a">
        {formatCost(now)}
      </text>
    </svg>
  );
}

export function Ship({ arm, round, onDone }) {
  const roles = useRoles();
  const started = useStartTime();
  const help = useHelp();
  const [ship, setShip] = useState(0);
  const [guess, setGuess] = useState(0);
  const touched = useRef({ ship: false, guess: false, chart: 0 });
  const got = arm.situations[round.fromPartner];
  const setS = (v) => {
    touched.current.ship = true;
    setShip(v);
  };
  const setG = (v) => {
    touched.current.guess = true;
    setGuess(v);
  };
  const now = expectedCost(arm, ship, round.situation, guess);

  return (
    <div className="space-y-6">
      {round.practice && (
        <Guide>
          This is the description the mediator delivered from {roles.partner}. {roles.partner} has already decided its shipment. Try
          shipments and a guess of {roles.partner}'s shipment: the chart shows your expected cost for each shipment. Lower is better.
        </Guide>
      )}
      <H1>Choose your shipment</H1>
      <YourSituation arm={arm} situation={round.situation} />

      <div className="grid gap-10 md:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <div className="space-y-3">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Your shipment</h3>
            <div className="flex flex-wrap items-center gap-4">
              <CrateInput value={ship} onChange={setS} min={arm.min} max={arm.max} label="Your shipment in crates" />
              <span className="text-[16px] text-ink">crates</span>
              <input
                type="range"
                min={arm.min}
                max={arm.max}
                step="1"
                value={ship}
                onChange={(e) => setS(Number(e.target.value))}
                aria-label="Your shipment slider"
                className="flex-1 min-w-48 accent-[#e2571e]"
              />
            </div>
          </div>
          <div className="space-y-3 border-t border-line pt-5">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Your estimate</h3>
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-[16px] text-ink whitespace-nowrap">{roles.partner}'s shipment</span>
              <CrateInput value={guess} onChange={setG} min={arm.min} max={arm.max} label={`Your guess of ${roles.partner}'s shipment`} />
              <span className="text-[16px] text-ink">crates</span>
            </div>
            <div className="text-[15px] text-muted">
              Market chances: Low {pct(1 - arm.p)} | High {pct(arm.p)}
            </div>
          </div>
          <div className="space-y-2 border-t border-line pt-5">
            <div className="flex items-baseline justify-between">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Expected cost</h3>
              <span className="font-mono text-[22px] font-semibold text-accent tabular-nums">{formatCost(now)}</span>
            </div>
            <CostChart
              arm={arm}
              situation={round.situation}
              guess={guess}
              ship={ship}
              onShip={(v) => {
                touched.current.chart += 1;
                setS(v);
              }}
            />
            <p className="text-[13px] italic text-muted">
              The preview uses the market chances and your estimate of {roles.partner}'s shipment.
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <div className="space-y-2">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Message from {roles.partner}</h3>
            <div className="border-l-2 border-ink pl-3">
              <div className="text-[20px] font-semibold text-ink">{got.name}</div>
              <Targets arm={arm} situation={round.fromPartner} className="text-[14px] text-muted" />
              <div className="mt-1">
                <LinkButton onClick={() => help.show("forwarding")}>Forwarding rule</LinkButton>
              </div>
            </div>
            <P>
              {roles.partner} can choose any description.
              {arm.forwarding === "selective" && " The mediator may have changed it, depending on the market."}
            </P>
          </div>
          <div className="space-y-2 border-t border-line pt-4">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Possible situations</h3>
            <ul className="divide-y divide-line">
              {arm.displayOrder.map((id) => {
                const s = arm.situations[id];
                return (
                  <li key={id} className={`flex items-center gap-4 px-3 py-2.5 ${id === round.fromPartner ? "rounded-lg bg-surface" : ""}`}>
                    <div className="flex-1">
                      <div className="text-[15px] font-medium text-ink">{s.name}</div>
                      <Targets arm={arm} situation={id} className="text-[14px] text-muted" />
                    </div>
                    <span className="text-[13px] text-muted whitespace-nowrap">{pct(s.prob)} chance</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <Footer>
        <Button
          onClick={() =>
            onDone({
              ship,
              guess,
              expectedCostAtShip: now,
              shipTouched: touched.current.ship,
              guessTouched: touched.current.guess,
              chartUses: touched.current.chart,
              secShip: secondsSince(started),
              helpShip: { ...help.counts },
            })
          }
        >
          Confirm {formatCrates(ship)} crates
        </Button>
        <LinkButton onClick={() => help.show("cost")}>How cost works</LinkButton>
      </Footer>
      <HelpModals arm={arm} help={help} />
    </div>
  );
}

// ---------------------------------------------------------------- 3. Results

// A number line with your target, your shipment and the partner's.
function ResultLine({ target, ship, partner }) {
  const roles = useRoles();
  const vals = [target, ship, partner];
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const span = Math.max(20, hi - lo);
  lo -= span * 0.15;
  hi += span * 0.15;
  const x = (v) => `${((v - lo) / (hi - lo)) * 100}%`;
  const Mark = ({ v, above, label, cls, labelCls = "text-ink" }) => (
    <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center" style={{ left: x(v) }}>
      {above && <span className={`absolute bottom-6 whitespace-nowrap text-[13px] ${labelCls}`}>{label}</span>}
      <span className={`h-4 w-4 rounded-full border-2 ${cls}`} />
      {!above && <span className={`absolute top-6 whitespace-nowrap text-[13px] ${labelCls}`}>{label}</span>}
    </div>
  );
  return (
    <div className="relative mx-10 my-12 h-px bg-ink" aria-hidden="true">
      <Mark v={target} above label={`Your target ${formatCrates(target)}`} cls="border-ink bg-paper" />
      <Mark v={partner} above={Math.abs(partner - target) > (hi - lo) * 0.25} label={`${roles.partner} ${formatCrates(partner, 1)}`} cls="border-ink bg-ink" />
      <Mark v={ship} label={`You ${formatCrates(ship)}`} cls="border-accent bg-accent" labelCls="text-accent" />
    </div>
  );
}

export function Results({ arm, round, last, onNext }) {
  const roles = useRoles();
  const help = useHelp();
  const costT = targetCost(arm, round.ship, round.target);
  const costS = partnerCost(arm, round.ship, round.partnerShip);
  const changedToPartner = round.toPartner !== round.sent;
  const changedFromPartner = round.fromPartner !== round.partnerSent;
  const n = (id) => situationName(arm, id);
  return (
    <div className="space-y-10">
      {round.practice && (
        <Guide>
          Now the market is known. Your cost comes from how far you shipped from your real target and from {roles.partner}'s
          shipment. Lower is better.
        </Guide>
      )}
      <div>
        <Kicker>{round.practice ? "Practice round · not paid" : `Round ${round.n}`}</Kicker>
        <h2 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">
          Your cost: <span className="font-mono text-accent tabular-nums">{formatCost(round.cost)}</span>
          <span className="text-faint font-normal"> (lower is better)</span>
        </h2>
        <P className="mt-1">
          The market was <span className="text-ink">{MARKET_NAMES[round.market].toLowerCase()}</span>.
        </P>
      </div>

      <div className="grid max-w-2xl grid-cols-3 gap-4">
        <Stat label="Your target" value={formatCrates(round.target)} note={`${n(round.situation)}, ${round.market} market`} />
        <Stat label="You shipped" value={formatCrates(round.ship)} note={`${dist(round.ship, round.target)} from your target`} tone="text-accent" />
        <Stat label={`${roles.partner} shipped`} value={formatCrates(round.partnerShip, 1)} note={`${dist(round.ship, round.partnerShip)} from you`} />
      </div>

      <div className="px-2">
        <ResultLine target={round.target} ship={round.ship} partner={round.partnerShip} />
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="space-y-3">
          <Section>How your cost was calculated</Section>
          <dl className="font-mono text-[14px] text-ink tabular-nums">
            <Row label={`${dist(round.ship, round.target)} crates from your target`} value={formatCost(costT)} />
            <Row label={`${dist(round.ship, round.partnerShip)} crates from ${roles.partner}`} value={`+ ${formatCost(costS)}`} />
            <div className="mt-2 flex justify-between border-t border-line pt-2 font-semibold">
              <dt>Cost</dt>
              <dd>{formatCost(round.cost)}</dd>
            </div>
          </dl>
          <p className="text-[13px] text-muted">
            Your target: {n(round.situation)} in a {round.market} market = {formatCrates(round.target)}.
          </p>
        </div>
        <div className="space-y-3">
          <Section>Messages this round</Section>
          <div className="space-y-2 text-[15px] text-ink">
            <div>
              You sent: <b>{n(round.sent)}</b>
              {changedToPartner && (
                <>
                  {" "}
                  → {roles.partner} received: <b>{n(round.toPartner)}</b>
                </>
              )}
            </div>
            <div>
              {roles.partner} sent: <b>{n(round.partnerSent)}</b>
              {changedFromPartner && (
                <>
                  {" "}
                  → You received: <b>{n(round.fromPartner)}</b>
                </>
              )}
            </div>
          </div>
          <P>
            {changedToPartner || changedFromPartner
              ? "The mediator changed a message this round, following the forwarding rule."
              : "The mediator passed both messages unchanged."}
          </P>
        </div>
      </div>

      <Footer>
        <LinkButton onClick={() => help.show("cost")}>How cost works</LinkButton>
        <span className="flex-1" />
        <Button onClick={onNext}>{last ? "Continue" : "Next round"}</Button>
      </Footer>
      <HelpModals arm={arm} help={help} />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
