// Intro step: instructions, solo practice and the quiz, from client/game/onboarding.
// The game (and so the arm) is assigned before intro steps run; roles are not,
// so the instructions show the North plant and say roles are random.
import { useGame, usePlayer } from "@empirica/core/player/classic/react";
import React, { useEffect, useState } from "react";
import { loadArm } from "../../../shared/arms/index.js";
import { PAIR_SESSION } from "../../../shared/pair.js";
import { roundRecord } from "../../../shared/record.js";
import { GameContext, makeRoles } from "../../game/context";
import { Onboarding } from "../../game/onboarding";
import { H2, Kicker, P, Page } from "../../game/parts";
import { ensurePlayerKey } from "./vault";

const INTRO = { roles: makeRoles("north", "person"), session: PAIR_SESSION };

export function PairIntro({ next }) {
  const game = useGame();
  const player = usePlayer();
  const [screened, setScreened] = useState(false);
  const arm = loadArm(game.get("treatment").arm);
  // The key pair for sealed values; made now so it's published before the game starts.
  useEffect(() => {
    ensurePlayerKey(player);
  }, []);

  if (screened)
    return (
      <Page width="max-w-xl">
        <div>
          <Kicker>Quiz</Kicker>
          <H2>Thanks for your time</H2>
          <P className="mt-2">The quiz answers weren't all correct after two tries, so the study ends here.</P>
        </div>
      </Page>
    );

  return (
    <GameContext.Provider value={INTRO}>
      <Onboarding
        arm={arm}
        onDone={({ passed, practice, quiz }) => {
          player.set("onboarding", { passed, quiz, practice: practice.map(roundRecord) });
          if (passed) next();
          else {
            player.set("screenedOut", true);
            setScreened(true);
          }
        }}
      />
    </GameContext.Provider>
  );
}
