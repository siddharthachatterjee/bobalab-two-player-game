// Exit step: the bonus round, and a link back to the survey when the
// participant arrived with ?return=<url> (e.g. from Qualtrics).
import { usePlayer } from "@empirica/core/player/classic/react";
import React from "react";
import { formatDollars, formatPoints } from "../../../shared/rules.js";
import { Button, H2, Kicker, P, Page } from "../../game/parts";

export function Bonus({ next }) {
  const player = usePlayer();
  const bonus = player.get("bonus");
  const returnUrl = player.get("urlParams")?.return;

  const toSurvey = () => {
    const url = new URL(returnUrl);
    url.searchParams.set("cf_player", player.id);
    url.searchParams.set("cf_total", bonus?.points ?? 0);
    window.location.assign(url.toString());
  };

  return (
    <Page width="max-w-xl">
      <div>
        <Kicker>All done</Kicker>
        {bonus ? (
          <H2>
            Round {bonus.round} was picked: {formatPoints(bonus.points)} points = {formatDollars(bonus.dollars)}
          </H2>
        ) : (
          <H2>The game ended early</H2>
        )}
        <P className="mt-2">
          {player.get("dropped")
            ? "A computer program played your plant after you were away, so your bonus may be reduced. "
            : ""}
          Thanks for playing. Your completion code is <span className="font-mono text-ink">{player.id}</span>.
        </P>
      </div>
      {returnUrl ? <Button onClick={toSurvey}>Back to the survey</Button> : <Button onClick={next}>Continue</Button>}
    </Page>
  );
}
