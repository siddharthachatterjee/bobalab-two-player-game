import { usePlayer, useRound } from "@empirica/core/player/classic/react";
import React from "react";
import { demandPct, otherRole } from "../../../shared/model.js";
import { TriangleDown, TriangleUp } from "./Icons";
import { roleInfo, useDay } from "./ui";

// Today's facts, each with a sentence on what it means for your sweet spot.
export function Brief() {
  const player = usePlayer();
  const round = useRound();
  const day = useDay();
  const role = roleInfo(player.get("role"));
  const partner = roleInfo(otherRole(player.get("role")));
  const X = player.round.get(`X${day}`);
  const T = player.round.get("type");
  const bonus = role.bonus?.[T];
  const signal = round.get(`forecast${day}`);

  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {X !== undefined && (
        <Fact
          kicker="Today's condition"
          title={
            <span className={`inline-flex items-center gap-1.5 ${X === 1 ? "text-up" : "text-down"}`}>
              {X === 1 ? <TriangleUp /> : <TriangleDown />}
              {role.condition[X]}
            </span>
          }
        >
          The company wants {X === 1 ? "more" : "fewer"} crates from your plant today, so your sweet spot is{" "}
          {X === 1 ? "above" : "below"} normal.
        </Fact>
      )}
      {bonus && (
        <Fact kicker="Your situation · secret" title={bonus.name}>
          {T === 1
            ? "Bigger changes pay you more, so your sweet spot is pushed further from normal."
            : "Smaller changes pay you more, so your sweet spot stays closer to normal."}{" "}
          The {partner.name} can't see this.
        </Fact>
      )}
      {signal && (
        <Fact kicker="AI demand forecast" title={<Forecast signal={signal} />}>
          {signal.kind === "exact" && "Higher demand moves both plants' sweet spots further from normal."}
          {signal.kind === "range" && "The AI only says demand is somewhere in this range today."}
          {signal.kind === "hidden" && "The AI isn't sharing a forecast today. Sweet spots assume average demand."}
        </Fact>
      )}
    </div>
  );
}

function Fact({ kicker, title, children }) {
  return (
    <div className="border-l-2 border-line pl-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{kicker}</div>
      <div className="mt-1 text-[15px] font-medium text-ink">{title}</div>
      <p className="mt-1 text-[13px] leading-snug text-muted">{children}</p>
    </div>
  );
}

function Forecast({ signal }) {
  if (signal.kind === "hidden") return <span className="text-faint">No forecast</span>;
  const lo = signal.kind === "range" ? demandPct(signal.lo) : 0;
  const hi = signal.kind === "range" ? demandPct(signal.hi) : demandPct(signal.value);
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative inline-block w-24 h-1.5 rounded-full bg-line overflow-hidden">
        <span
          className="absolute inset-y-0 bg-ink rounded-full transition-all duration-700"
          style={{ left: `${lo}%`, width: `${hi - lo}%` }}
        />
      </span>
      <span className="font-mono tabular-nums">
        Demand {signal.kind === "range" ? `${lo}–${hi}%` : `${hi}%`}
      </span>
    </span>
  );
}
