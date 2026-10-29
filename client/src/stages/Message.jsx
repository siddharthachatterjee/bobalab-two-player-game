import {
  useGame,
  usePlayer,
  useRound,
} from "@empirica/core/player/classic/react";
import React from "react";
import {
  MESSAGE_KEYS,
  formatAim,
  messageAim,
  otherRole,
  ownTarget,
  payoff,
  recommendedMessages,
} from "../../../shared/model.js";
import { Brief } from "../components/Brief";
import { Scene } from "../components/Scene";
import { Axis, Marker, PayCurve, pct } from "../components/Scale";
import { Pending, PrimaryButton, roleInfo, useDay } from "../components/ui";

export function Message() {
  const game = useGame();
  const player = usePlayer();
  const round = useRound();
  const day = useDay();

  const signal = round.get(`forecast${day}`);
  const X = player.round.get(`X${day}`);
  const T = player.round.get("type");
  const selected = player.round.get(`msg${day}`);

  if (!signal || X === undefined) return <Pending>AI is checking demand</Pending>;

  const mu = signal.mean;
  const role = player.get("role");
  const me = roleInfo(role);
  const partner = roleInfo(otherRole(role));
  const sweetSpot = ownTarget(mu, T, X);
  const tips = game.get("treatment").tips === "on";
  const tipped = tips ? recommendedMessages(round.get(`rule${day}`), T, X) : [];

  // Replies are public history (Sec 6), so day 2 recalls day 1's messages.
  const yesterday = day > 1 ? round.get(`messages${day - 1}`) : null;
  const yesterdayMu = day > 1 ? round.get(`forecast${day - 1}`)?.mean : null;
  const said = (key) => (key ? formatAim(messageAim(key, yesterdayMu)) : "nothing");

  return (
    <div className="w-full max-w-4xl space-y-12">
      <Scene you={me.name} partner={partner.name} outgoing={selected ? formatAim(messageAim(selected, mu)) : "?"} />
      <Brief />

      <div>
        <h2 className="text-[28px] font-semibold tracking-tight text-ink">What will you tell the {partner.name}?</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Pick one of the four flags. The AI passes that number to the {partner.name} as what you're aiming for.
          It's only a message: you choose your actual crates on the next screen, and you can bluff.
        </p>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Your sweet spot ({formatAim(sweetSpot)}) is the pick that pays you the most if the {partner.name} matches
          you. The curve shows your pay if both plants end up on the same number.
        </p>
        {yesterday && (
          <p className="mt-1 text-[13px] text-faint">
            Yesterday you said {said(yesterday[role])}, they said {said(yesterday[otherRole(role)])}.
          </p>
        )}
      </div>

      <div className="relative pb-12">
        <PayCurve payAt={(a) => payoff(a, a, sweetSpot)} height="h-32" />
        <div className="absolute inset-x-0 top-0 h-32">
          {MESSAGE_KEYS.map((key) => (
            <Flag
              key={key}
              value={messageAim(key, mu)}
              tall={key.endsWith("2")}
              selected={selected === key}
              tipped={tipped.includes(key)}
              onClick={() => player.round.set(`msg${day}`, key)}
            />
          ))}
        </div>
        <Axis>
          <Marker value={sweetSpot} kind="target" label={`your sweet spot ${formatAim(sweetSpot)}`} />
        </Axis>
      </div>

      <PrimaryButton disabled={!selected} onClick={() => player.stage.set("submit", true)}>
        {selected ? `Tell the ${partner.name} ${formatAim(messageAim(selected, mu))}` : "Pick a flag"}
      </PrimaryButton>
    </div>
  );
}

// One of the four messages: a pole standing on the line with its number on top.
function Flag({ value, tall, selected, tipped, onClick }) {
  return (
    <div className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center" style={{ left: `${pct(value)}%` }}>
      {tipped && <span className="mb-1 font-mono text-[10px] uppercase tracking-wider text-accent">AI pick</span>}
      <button
        onClick={onClick}
        className={`h-9 px-3.5 rounded-full border font-mono text-[15px] font-medium tabular-nums transition ${
          selected ? "bg-accent border-ink text-white" : "bg-surface border-ink/40 text-ink hover:border-ink"
        }`}
      >
        {formatAim(value)}
      </button>
      <span className={`w-0.5 ${tall ? "h-14" : "h-5"} ${selected ? "bg-accent" : "bg-ink/25"}`} />
    </div>
  );
}
