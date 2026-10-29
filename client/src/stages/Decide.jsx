import { usePlayer, useRound } from "@empirica/core/player/classic/react";
import React from "react";
import {
  formatAim,
  formatMoney,
  formatUnits,
  messageAim,
  otherRole,
  ownTarget,
  payParts,
  payoff,
} from "../../../shared/model.js";
import { Brief } from "../components/Brief";
import { Scene } from "../components/Scene";
import { Axis, Marker, PayCurve, nudge, useLineDrag } from "../components/Scale";
import { Truck } from "../components/Truck";
import { Pending, PrimaryButton, possessive, roleInfo, useDay } from "../components/ui";

export function Decide() {
  const player = usePlayer();
  const round = useRound();
  const day = useDay();
  const set = (name, value) => player.round.set(`${name}${day}`, value);
  const drag = useLineDrag(set, "action");

  const role = player.get("role");
  const me = roleInfo(role);
  const partner = roleInfo(otherRole(role));
  const signal = round.get(`forecast${day}`);
  const messages = round.get(`messages${day}`);
  const T = player.round.get("type");
  const X = player.round.get(`X${day}`);

  if (!messages || !signal) return <Pending>Delivering messages</Pending>;

  // Estimates from the forecast: the player can't see true demand.
  const sweetSpot = ownTarget(signal.mean, T, X);
  const claim = (key) => (key ? messageAim(key, signal.mean) : null);
  const said = claim(messages[otherRole(role)]);
  const mine = claim(messages[role]);
  const guess = player.round.get(`guess${day}`) ?? said ?? 0;
  const action = player.round.get(`action${day}`) ?? 0;
  const payAt = (a) => payoff(a, guess, sweetSpot);
  // Rounded so the lines add up to the total shown (and paid).
  const parts = payParts(action, guess, sweetSpot);
  const miss = Math.min(100, Math.round(parts.miss));
  const apart = 100 - parts.total - miss;
  const crates = (a) => Math.round(Math.abs(a) * 100);

  return (
    <div className="w-full max-w-4xl space-y-12">
      <Scene
        you={me.name}
        partner={partner.name}
        outgoing={mine === null ? "—" : formatAim(mine)}
        incoming={said === null ? "—" : formatAim(said)}
      />
      <Brief />

      <div className="flex flex-wrap items-end justify-between gap-8">
        <div className="max-w-md">
          <h2 className="text-[28px] font-semibold tracking-tight text-ink">
            {said === null ? `The ${partner.name} said nothing` : `The ${partner.name} says ${formatAim(said)}`}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            Now load your truck. Each plant ships its own truck, and nothing is averaged. You earn the most at your
            sweet spot, but you also lose money the further your truck is from the {possessive(partner.name)}. So
            the best pick is usually between the two, closer to your sweet spot.
          </p>
        </div>
        <div className="flex items-end gap-5">
          <Truck value={action} width={180} />
          <div className="text-right pb-2">
            <div className="font-mono text-4xl font-medium tabular-nums text-ink">{formatUnits(action)}</div>
            <div className="text-[13px] text-muted">crates vs. normal</div>
          </div>
        </div>
      </div>

      <div {...drag} className="relative select-none touch-none cursor-pointer pb-12">
        <PayCurve payAt={payAt} at={action} />
        <Axis>
          <Marker value={sweetSpot} kind="target" label={`your sweet spot ${formatAim(sweetSpot)}`} />
          <Marker
            value={guess}
            kind="partner"
            handle="guess"
            row={1}
            label={`${partner.name} ${formatAim(guess)}`}
            onKeyDown={nudge(set, "guess", guess)}
            aria-label={`Where you think the ${partner.name} will ship`}
          />
          <Marker value={action} kind="you" handle="action" onKeyDown={nudge(set, "action", action)} aria-label="Your crates" />
        </Axis>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Your pay today</div>
          <dl className="mt-2 font-mono text-[14px] tabular-nums">
            <Line amount="$100" text="if you hit your sweet spot and match them" />
            <Line amount={`−${formatMoney(miss)}`} text={`${crates(action - sweetSpot)} crates off your sweet spot`} />
            <Line amount={`−${formatMoney(apart)}`} text={`${crates(action - guess)} crates apart from the ${partner.name}`} />
            <Line amount={formatMoney(parts.total)} text="today" strong />
          </dl>

        </div>
        <p className="text-[13px] leading-relaxed text-muted">
          The diamond is where you think the {partner.name} will ship. It starts at what they told you. If you think
          they're bluffing, drag it, and the curve shows your pay for that case. The real pay uses what they actually
          ship.
        </p>
      </div>

      <PrimaryButton onClick={() => player.stage.set("submit", true)}>Ship {formatUnits(action)} crates</PrimaryButton>
    </div>
  );
}

function Line({ amount, text, strong }) {
  return (
    <div className={`grid grid-cols-[64px_1fr] gap-3 py-0.5 ${strong ? "mt-1 pt-1.5 border-t border-line text-accent font-medium" : "text-ink"}`}>
      <dt className="text-right">{amount}</dt>
      <dd className={`font-sans text-[13px] ${strong ? "" : "text-muted"}`}>{text}</dd>
    </div>
  );
}
