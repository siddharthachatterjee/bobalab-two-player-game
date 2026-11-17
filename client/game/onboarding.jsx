// Everything before the paid rounds: instructions, practice rounds against the
// programmed partner, and the comprehension quiz. Shared by both versions.
//
// onDone({ passed, practice, quiz }): practice is the played practice rounds,
// quiz the attempts. On a failed quiz the caller decides what happens next.
import React, { useEffect, useMemo, useState } from "react";
import { GameContext, makeRoles, useGame } from "./context";
import { Instructions, Note, Quiz } from "./instructions";
import { scrollToTop } from "./parts";
import { SoloRound, makeSoloRound } from "./solo";

export function Onboarding({ arm, onDone }) {
  const game = useGame();
  const { session } = game;
  const [phase, setPhase] = useState("instructions");
  const [i, setI] = useState(0);
  const [played, setPlayed] = useState([]);
  const rounds = useMemo(() => Array.from({ length: session.practice }, (_, k) => makeSoloRound(arm, k + 1, true)), [arm]);
  useEffect(scrollToTop, [phase, i]);

  // Practice is always against the programmed partner, as the North plant.
  const practiceGame = useMemo(() => ({ ...game, roles: makeRoles("north", "program") }), [game]);

  if (phase === "instructions") return <Instructions arm={arm} onDone={() => setPhase("practice")} />;

  if (phase === "practice")
    return (
      <GameContext.Provider value={practiceGame}>
        <SoloRound
          key={i}
          arm={arm}
          round={rounds[i]}
          onDone={(r) => {
            setPlayed([...played, r]);
            if (i + 1 < rounds.length) setI(i + 1);
            else setPhase("quizIntro");
          }}
        />
      </GameContext.Provider>
    );

  if (phase === "quizIntro")
    return (
      <Note kicker="Practice done" title="Now five quick questions" button="Start the quiz" onDone={() => setPhase("quiz")}>
        They check the rules before the paid rounds. You need all five right, and you get two tries.
      </Note>
    );

  return <Quiz arm={arm} onDone={({ passed, attempts }) => onDone({ passed, practice: played, quiz: attempts })} />;
}
