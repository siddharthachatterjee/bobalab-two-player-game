// The 2-player game on Empirica. Intro: shared onboarding (instructions, solo
// practice, quiz). Game: the shared round screens, wired in ./pair/.
import { EmpiricaClassic } from "@empirica/core/player/classic";
import { EmpiricaContext } from "@empirica/core/player/classic/react";
import { EmpiricaMenu, EmpiricaParticipant } from "@empirica/core/player/react";
import React from "react";
import { ExitSurvey } from "./intro-exit/ExitSurvey";
import { Bonus } from "./pair/Bonus";
import { PairIntro } from "./pair/PairIntro";
import { PairRound } from "./pair/PairRound";

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const playerKey = urlParams.get("participantKey") || "";

  const { protocol, host } = window.location;
  const url = `${protocol}//${host}/query`;

  const introSteps = () => [PairIntro];
  const exitSteps = () => [Bonus, ExitSurvey];

  return (
    <EmpiricaParticipant url={url} ns={playerKey} modeFunc={EmpiricaClassic}>
      <div className="h-screen relative">
        <EmpiricaMenu position="bottom-left" />
        <div data-scroller className="h-full overflow-auto bg-paper">
          <EmpiricaContext introSteps={introSteps} exitSteps={exitSteps}>
            <PairRound />
          </EmpiricaContext>
        </div>
      </div>
    </EmpiricaParticipant>
  );
}
