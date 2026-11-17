// The paid rounds: the shared screens (client/game/screens.jsx) wired to Empirica.
// The server writes each player's view, delivered messages and result
// (server/src/callbacks.js); this component reads them and writes choices.
import { useGame, usePlayer, useRound, useStage } from "@empirica/core/player/classic/react";
import React, { useEffect, useMemo } from "react";
import { loadArm } from "../../../shared/arms/index.js";
import { PAIR_SESSION } from "../../../shared/pair.js";
import { GameContext, makeRoles } from "../../game/context";
import { Kicker, P, Page, RoundHeader, scrollToTop } from "../../game/parts";
import { Results, Send, Ship } from "../../game/screens";
import { Timer } from "../components/Timer";

export function PairRound() {
  const game = useGame();
  const player = usePlayer();
  const round = useRound();
  const stage = useStage();
  const step = stage.get("step");
  const role = player.get("role");
  const ctx = useMemo(() => ({ roles: makeRoles(role, "person"), session: PAIR_SESSION }), [role]);
  useEffect(scrollToTop, [stage.id]);

  const arm = loadArm(game.get("armId"));
  const view = player.round.get("view");
  const messages = player.round.get("messages");
  const result = player.round.get("result");
  const header = { n: round.get("n"), practice: false };

  // Writes this stage's choice and ends the stage for this player.
  const submit = (name, value) => {
    player.round.set(name, value);
    player.stage.set("submit", true);
  };

  let body;
  if (player.get("dropped")) body = <Dropped />;
  else if (player.stage.get("submit")) body = <Waiting text={`Waiting for the ${ctx.roles.partnerPlant}`} />;
  else if (step === "send" && view) body = <Send arm={arm} round={{ ...header, ...view }} onDone={(c) => submit("send", c)} />;
  else if (step === "ship" && view && messages)
    body = <Ship arm={arm} round={{ ...header, ...view, ...messages }} onDone={(c) => submit("ship", c)} />;
  else if (step === "results" && result)
    body = (
      <Results arm={arm} round={result} last={result.n === PAIR_SESSION.paid} onNext={() => submit("done", true)} />
    );
  else body = <Waiting text="Waiting for the mediator" />;

  return (
    <GameContext.Provider value={ctx}>
      <RoundHeader round={header} step={step} />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-3 flex items-center justify-end gap-2 text-[13px] text-muted">
        Time left <Timer />
      </div>
      <Page>
        <div key={`${stage.id}-${Boolean(player.stage.get("submit"))}`} className="anim-fade-up">
          {body}
        </div>
      </Page>
    </GameContext.Provider>
  );
}

function Waiting({ text }) {
  return (
    <div className="pt-16 flex items-center gap-3 text-muted">
      <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
      <Kicker>{text}</Kicker>
    </div>
  );
}

function Dropped() {
  return (
    <div className="space-y-2">
      <Kicker>Away too long</Kicker>
      <P strong>
        You missed {PAIR_SESSION.dropAfter} steps in a row, so a computer program is now playing your plant for the rest
        of the game. Your partner keeps playing.
      </P>
    </div>
  );
}
