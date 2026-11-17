// Study 1: one participant runs the North plant against a programmed South
// plant, as a static page for Qualtrics. Rules: shared/rules.js and shared/arms/.
// Screens: client/game/ (shared with the 2-player version).
// URL parameters:
//   arm         an arm_id from arms.csv, e.g. B019_selective_R1; random if missing or unknown
//   pid         participant id, echoed back in the data
//   return      URL to send the participant to when done, with results appended
//   researcher  1 = open the researcher page (arm browser and preview links)
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@unocss/reset/tailwind-compat.css";
import "virtual:uno.css";
import "../src/index.css";
import {
  armIds,
  buildArm,
  drawMarket,
  drawSituation,
  formatDollars,
  formatPoints,
  playProgrammedPartner,
  points,
  programmedMessage,
  suggestion,
  target,
} from "../../shared/rules.js";
import { GameContext, makeRoles } from "../game/context";
import { Attention, Instructions, Note, Quiz } from "../game/instructions";
import { Button, H2, Kicker, P, Page, RoundHeader } from "../game/parts";
import { Results, Send, Ship } from "../game/screens";
import { TABLES } from "../game/tables";
import { Researcher } from "./researcher";

// Session shape. One paid round is picked at random for the bonus; points sit
// mostly in 95-100 at c = 0.0008, so the rate is a placeholder.
const SESSION = { practice: 2, paid: 8, dollarsPerPoint: 0.02 };
const ATTENTION_AFTER = [4]; // attention check after these paid rounds
const GAME = { roles: makeRoles("north", "program"), session: SESSION };

const params = new URLSearchParams(window.location.search);
const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];

const ids = armIds(TABLES);
const armParam = params.get("arm");
const settings = {
  armId: ids.includes(armParam) ? armParam : pickRandom(ids),
  armRandom: !ids.includes(armParam),
  pid: params.get("pid") || "",
  returnUrl: params.get("return"),
};
const arm = buildArm(TABLES, settings.armId);

// Market and both situations are drawn fresh and independently every round.
function makeRound(n, practice) {
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
const makeRounds = () => [
  ...Array.from({ length: SESSION.practice }, (_, i) => makeRound(i + 1, true)),
  ...Array.from({ length: SESSION.paid }, (_, i) => makeRound(i + 1, false)),
];

function App() {
  const [phase, setPhase] = useState("instructions");
  const [i, setI] = useState(0);
  const [step, setStep] = useState("send");
  const [rounds, setRounds] = useState(makeRounds);
  const [result, setResult] = useState(null);
  const log = useRef({ startedAt: new Date().toISOString(), quiz: [], attention: [] });
  const scroller = useRef(null);
  const round = rounds[i];

  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [phase, i, step]);

  const update = (patch) => setRounds((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  const onSend = (choice) => {
    update({
      ...choice,
      ...playProgrammedPartner(arm, { market: round.market, partnerSituation: round.partnerSituation, sent: choice.sent }),
    });
    setStep("ship");
  };

  const onShip = (choice) => {
    const d = target(arm, round.situation, round.market);
    update({ ...choice, target: d, points: points(arm, choice.ship, d, round.partnerShip) });
    setStep("results");
  };

  const nextRound = () => {
    if (i + 1 >= rounds.length) return finish(false);
    setI(i + 1);
    setStep("send");
    setPhase("round");
  };

  const onNext = () => {
    if (round.practice && round.n === SESSION.practice) return setPhase("quizIntro");
    if (!round.practice && ATTENTION_AFTER.includes(round.n)) return setPhase("attention");
    nextRound();
  };

  function finish(screenedOut) {
    const played = rounds.filter((r) => r.points !== undefined);
    const paid = played.filter((r) => !r.practice);
    const pick = screenedOut ? null : pickRandom(paid);
    const { situations, displayOrder, messageRule, forward, programmed, ...armParams } = arm;
    const data = {
      game: "crate-factory-study1",
      version: 3,
      role: GAME.roles.me,
      pid: settings.pid,
      armId: arm.id,
      armRandom: settings.armRandom,
      arm: armParams,
      startedAt: log.current.startedAt,
      finishedAt: new Date().toISOString(),
      screenedOut,
      quiz: log.current.quiz,
      attention: log.current.attention,
      rounds: played.map((r) => ({
        round: r.n,
        practice: r.practice,
        market: r.market,
        situation: r.situation,
        suggestion: r.suggestion,
        sent: r.sent,
        truthful: r.sent === r.situation,
        followedSuggestion: r.suggestion === null ? null : r.sent === r.suggestion,
        toPartner: r.toPartner,
        partnerSituation: r.partnerSituation,
        partnerSent: r.partnerSent,
        fromPartner: r.fromPartner,
        partnerShip: r.partnerShip,
        ship: r.ship,
        guess: r.guess,
        guessTouched: r.guessTouched,
        shipTouched: r.shipTouched,
        chartUses: r.chartUses,
        expectedAtShip: r.expectedAtShip,
        target: r.target,
        points: r.points,
        secSend: r.secSend,
        secShip: r.secShip,
        helpSend: r.helpSend,
        helpShip: r.helpShip,
      })),
      paidRound: pick?.n ?? null,
      totalEarned: pick ? Number(pick.points.toFixed(2)) : 0,
      bonusDollars: pick ? Number((pick.points * SESSION.dollarsPerPoint).toFixed(2)) : 0,
    };
    // Rounded to 4 decimals to keep the data small.
    setResult(JSON.parse(JSON.stringify(data, (k, v) => (typeof v === "number" ? Math.round(v * 1e4) / 1e4 : v))));
    setPhase(screenedOut ? "screened" : "done");
  }

  let screen;
  if (phase === "instructions") screen = <Instructions arm={arm} onDone={() => setPhase("round")} />;
  else if (phase === "quizIntro")
    screen = (
      <Note kicker="Practice done" title="Now five quick questions" button="Start the quiz" onDone={() => setPhase("quiz")}>
        They check the rules before the paid rounds. You need all five right, and you get two tries.
      </Note>
    );
  else if (phase === "quiz")
    screen = (
      <Quiz
        arm={arm}
        onDone={({ passed, attempts }) => {
          log.current.quiz = attempts;
          if (passed) setPhase("paidIntro");
          else finish(true);
        }}
      />
    );
  else if (phase === "paidIntro")
    screen = (
      <Note kicker="Quiz passed" title={`${SESSION.paid} paid rounds start now`} button="Start round 1" onDone={nextRound}>
        Same rules as practice. At the end, one of these rounds is picked at random for your bonus.
      </Note>
    );
  else if (phase === "attention")
    screen = (
      <Attention
        arm={arm}
        onDone={(a) => {
          log.current.attention.push({ afterRound: round.n, ...a });
          nextRound();
        }}
      />
    );
  else if (phase === "round") {
    const last = i === rounds.length - 1;
    screen = (
      <>
        <RoundHeader round={round} step={step} />
        <Page>
          <div key={`${i}-${step}`} className="anim-fade-up">
            {step === "send" && <Send arm={arm} round={round} onDone={onSend} />}
            {step === "ship" && <Ship arm={arm} round={round} onDone={onShip} />}
            {step === "results" && <Results arm={arm} round={round} last={last} onNext={onNext} />}
          </div>
        </Page>
      </>
    );
  } else screen = <Done data={result} />;

  return (
    <GameContext.Provider value={GAME}>
      <div ref={scroller} data-scroller className="h-screen overflow-auto bg-paper">
        {screen}
      </div>
    </GameContext.Provider>
  );
}

// Hands the results to Qualtrics: a message to the parent page when embedded
// in an iframe, and/or a redirect to ?return=. Standalone, it offers a download.
function Done({ data }) {
  const embedded = window.parent !== window;
  const { returnUrl } = settings;

  useEffect(() => {
    if (embedded) window.parent.postMessage({ source: "crate-factory", data }, "*");
    if (returnUrl) {
      const url = new URL(returnUrl);
      url.searchParams.set("cf_total", data.totalEarned);
      url.searchParams.set("cf_screened", data.screenedOut ? 1 : 0);
      url.searchParams.set("cf_data", JSON.stringify(data));
      window.location.assign(url.toString());
    }
  }, []);

  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `crate-factory-${data.pid || "test"}.json`;
    a.click();
  };

  return (
    <Page width="max-w-xl">
      {data.screenedOut ? (
        <div>
          <Kicker>Quiz</Kicker>
          <H2>Thanks for your time</H2>
          <P className="mt-2">The quiz answers weren't all correct after two tries, so the study ends here.</P>
        </div>
      ) : (
        <div>
          <Kicker>All done</Kicker>
          <H2>
            Round {data.paidRound} was picked: {formatPoints(data.totalEarned)} points = {formatDollars(data.bonusDollars)}
          </H2>
          <P className="mt-2">Thanks for playing.</P>
        </div>
      )}
      <P>{embedded || returnUrl ? "Continuing the survey…" : ""}</P>
      {!embedded && !returnUrl && <Button onClick={download}>Download data</Button>}
    </Page>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(params.get("researcher") ? <Researcher tables={TABLES} /> : <App />);
