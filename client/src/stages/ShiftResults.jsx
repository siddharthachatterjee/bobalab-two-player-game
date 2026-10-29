import { usePlayer, useRound } from "@empirica/core/player/classic/react";
import React, { useEffect, useState } from "react";
import {
  GAME,
  demandPct,
  formatAim,
  formatMoney,
  honestMessage,
  messageAim,
  otherRole,
  payParts,
} from "../../../shared/model.js";
import { Axis, Marker } from "../components/Scale";
import { Truck } from "../components/Truck";
import { Label, Pending, PrimaryButton, possessive, roleInfo } from "../components/ui";

export function ShiftResults() {
  const player = usePlayer();
  const round = useRound();
  const days = round.get("results");
  const role = player.get("role");
  const earned = (days || []).reduce((s, d) => s + (d.players[role]?.coins || 0), 0);
  const shown = useCountUp(earned);

  if (!days) return <Pending>Counting crates</Pending>;

  const other = otherRole(role);
  const partner = roleInfo(other);
  const partnerBonus = partner.bonus?.[days[0].players[other]?.T];

  return (
    <div className="w-full max-w-4xl space-y-12">
      <div>
        <Label>{round.get("name")} done</Label>
        <h2 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">
          You earned <span className="font-mono text-accent tabular-nums">{formatMoney(shown)}</span>
          <span className="text-faint font-normal"> of {formatMoney(days.length * 100)}</span>
        </h2>
        {partnerBonus && (
          <p className="mt-1 text-[15px] text-muted">
            The {possessive(partner.name)} situation was <span className="text-ink">{partnerBonus.name}</span>.
          </p>
        )}
      </div>

      {days.map((d) => {
        const mine = d.players[role];
        const theirs = d.players[other];
        if (!mine) return null;
        const mu = round.get(`forecast${d.day}`)?.mean;
        const said = (msg) => (msg ? formatAim(messageAim(msg, mu)) : "nothing");
        return (
          <section key={d.day} className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                {days.length > 1 && (
                  <div className="text-[17px] font-medium text-ink">
                    Day {d.day} <span className="ml-2 font-mono text-accent">+{formatMoney(mine.coins)}</span>
                  </div>
                )}
                <div className="mt-1 text-[15px] text-muted">
                  Real demand {demandPct(d.theta)}% · you said {said(mine.msg)} · they said {said(theirs?.msg)}
                </div>
                {theirs && <Honesty theirs={theirs} mu={mu} partner={partner.name} />}
                {theirs && <Breakdown mine={mine} theirs={theirs} partner={partner.name} />}
              </div>
              <div className="flex items-end gap-6">
                <TruckWithLabel value={mine.action} label={`You ${formatAim(mine.action)}`} />
                {theirs && <TruckWithLabel value={theirs.action} tone="partner" label={`${partner.name} ${formatAim(theirs.action)}`} />}
              </div>
            </div>
            <div className="pt-3 pb-14">
              <Axis>
                <Marker value={mine.target} kind="target" label={`real sweet spot ${formatAim(mine.target)}`} />
                {theirs && <Marker value={theirs.action} kind="partner" row={1} label={`${partner.name} ${formatAim(theirs.action)}`} />}
                <Marker value={mine.action} kind="you" row={2} label={`you ${formatAim(mine.action)}`} />
              </Axis>
            </div>
          </section>
        );
      })}

      <PrimaryButton onClick={() => player.stage.set("submit", true)}>
        {round.get("shift") === GAME.shifts ? "Finish" : "Next day"}
      </PrimaryButton>
    </div>
  );
}

function TruckWithLabel({ value, tone, label }) {
  return (
    <div className="flex flex-col items-center">
      <Truck value={value} tone={tone} width={120} />
      <span className="text-[12px] text-muted">{label}</span>
    </div>
  );
}

// Where the day's pay went, using the real sweet spot and the partner's real pick.
function Breakdown({ mine, theirs, partner }) {
  const parts = payParts(mine.action, theirs.action, mine.target);
  const miss = Math.min(100, Math.round(parts.miss));
  const apart = 100 - mine.coins - miss;
  const crates = (a) => Math.round(Math.abs(a) * 100);
  return (
    <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted">
      You were {crates(mine.action - mine.target)} crates off your real sweet spot (−{formatMoney(miss)}) and{" "}
      {crates(mine.action - theirs.action)} crates apart from the {partner} (−{formatMoney(apart)}).
    </p>
  );
}

// Counts up to value over about half a second.
function useCountUp(value) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 600);
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

// Was the partner's message their honest one? Both numbers use the forecast
// they saw when sending, so "their sweet spot" is what they knew then.
function Honesty({ theirs, mu, partner }) {
  if (!theirs.msg) return <Verdict tone="muted">The {partner} didn't send a message.</Verdict>;
  const said = messageAim(theirs.msg, mu);
  const real = messageAim(honestMessage(theirs.T, theirs.X), mu);
  const gap = Math.round(Math.abs(said - real) * 100);
  const lead = `The ${partner} said ${formatAim(said)}, and their sweet spot was ${formatAim(real)}.`;
  if (gap === 0) return <Verdict tone="ink">{lead} They told the truth.</Verdict>;
  if (Math.sign(said) !== Math.sign(real)) return <Verdict tone="accent">{lead} They pointed the wrong way.</Verdict>;
  return Math.abs(said) > Math.abs(real) ? (
    <Verdict tone="accent">{lead} They exaggerated by {gap} crates.</Verdict>
  ) : (
    <Verdict tone="accent">{lead} They played it down by {gap} crates.</Verdict>
  );
}

function Verdict({ tone, children }) {
  const color = { ink: "text-ink", accent: "text-accent", muted: "text-muted" }[tone];
  return <p className={`mt-3 max-w-md text-[15px] font-medium leading-snug anim-fade-up ${color}`}>{children}</p>;
}
