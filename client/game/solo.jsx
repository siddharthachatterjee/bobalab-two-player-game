// A round against the programmed partner, run entirely in the browser.
// Used for every round of the 1-player study and for practice in the 2-player game.
import React, { useEffect, useState } from "react";
import {
  drawMarket,
  drawSituation,
  playProgrammedPartner,
  cost,
  points,
  programmedMessage,
  suggestion,
  target,
} from "../../shared/rules.js";
import { Page, RoundHeader, scrollToTop } from "./parts";
import { Results, Send, Ship } from "./screens";

// Market and both situations are drawn fresh and independently every round.
export function makeSoloRound(arm, n, practice) {
  const situation = drawSituation(arm);
  const partnerSituation = drawSituation(arm);
  return {
    n,
    practice,
    market: drawMarket(arm),
    situation,
    partnerSituation,
    suggestion: suggestion(arm, situation),
    // The programmed partner's message is fixed before the player reports (spec Sec 4).
    partnerSent: programmedMessage(arm, partnerSituation),
  };
}

// Plays one round: Send, Read & ship, Results. onDone(round) with every field filled in.
export function SoloRound({ arm, round: start, last = false, onDone }) {
  const [round, setRound] = useState(start);
  const [step, setStep] = useState("send");
  useEffect(scrollToTop, [step]);

  const onSend = (choice) => {
    const partner = playProgrammedPartner(arm, {
      market: round.market,
      partnerSituation: round.partnerSituation,
      sent: choice.sent,
    });
    setRound({ ...round, ...choice, ...partner });
    setStep("ship");
  };
  const onShip = (choice) => {
    const d = target(arm, round.situation, round.market);
    setRound({ ...round, ...choice, target: d, cost: cost(arm, choice.ship, d, round.partnerShip), points: points(arm, choice.ship, d, round.partnerShip) });
    setStep("results");
  };

  return (
    <>
      <RoundHeader round={round} step={step} />
      <Page>
        <div key={step} className="anim-fade-up">
          {step === "send" && <Send arm={arm} round={round} onDone={onSend} />}
          {step === "ship" && <Ship arm={arm} round={round} onDone={onShip} />}
          {step === "results" && <Results arm={arm} round={round} last={last} onNext={() => onDone(round)} />}
        </div>
      </Page>
    </>
  );
}
