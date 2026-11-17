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
import { ARM_IDS, TABLES, loadArm } from "../../shared/arms/index.js";
import { armSummary, roundNumbers, roundRecord } from "../../shared/record.js";
import { formatDollars, formatPoints } from "../../shared/rules.js";
import { GameContext, makeRoles } from "../game/context";
import { Attention, Note } from "../game/instructions";
import { Onboarding } from "../game/onboarding";
import { Button, H2, Kicker, P, Page, scrollToTop } from "../game/parts";
import { SoloRound, makeSoloRound } from "../game/solo";
import { Researcher } from "./researcher";

// Session shape. One paid round is picked at random for the bonus; points sit
// mostly in 95-100 at c = 0.0008, so the rate is a placeholder.
const SESSION = { practice: 2, paid: 8, dollarsPerPoint: 0.02 };
const ATTENTION_AFTER = [4]; // attention check after these paid rounds
const GAME = { roles: makeRoles("north", "program"), session: SESSION };

const params = new URLSearchParams(window.location.search);
const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];

const armParam = params.get("arm");
const settings = {
  armId: ARM_IDS.includes(armParam) ? armParam : pickRandom(ARM_IDS),
  armRandom: !ARM_IDS.includes(armParam),
  pid: params.get("pid") || "",
  returnUrl: params.get("return"),
};
const arm = loadArm(settings.armId);

function App() {
  const [phase, setPhase] = useState("onboarding");
  const [rounds] = useState(() => Array.from({ length: SESSION.paid }, (_, k) => makeSoloRound(arm, k + 1, false)));
  const [i, setI] = useState(0);
  const [result, setResult] = useState(null);
  const log = useRef({ startedAt: new Date().toISOString(), practice: [], quiz: [], attention: [], paid: [] });
  useEffect(scrollToTop, [phase, i]);

  const nextRound = () => {
    if (i + 1 >= rounds.length) return finish(false);
    setI(i + 1);
    setPhase("round");
  };

  function finish(screenedOut) {
    const paid = log.current.paid;
    const pick = screenedOut ? null : pickRandom(paid);
    const data = {
      game: "crate-factory-study1",
      version: 3,
      role: GAME.roles.me,
      pid: settings.pid,
      armId: arm.id,
      armRandom: settings.armRandom,
      arm: armSummary(arm),
      startedAt: log.current.startedAt,
      finishedAt: new Date().toISOString(),
      screenedOut,
      quiz: log.current.quiz,
      attention: log.current.attention,
      rounds: [...log.current.practice, ...paid].map(roundRecord),
      paidRound: pick?.n ?? null,
      totalEarned: pick ? Number(pick.points.toFixed(2)) : 0,
      bonusDollars: pick ? Number((pick.points * SESSION.dollarsPerPoint).toFixed(2)) : 0,
    };
    setResult(roundNumbers(data));
    setPhase("done");
  }

  let screen;
  if (phase === "onboarding")
    screen = (
      <Onboarding
        arm={arm}
        onDone={({ passed, practice, quiz }) => {
          Object.assign(log.current, { practice, quiz });
          if (passed) setPhase("paidIntro");
          else finish(true);
        }}
      />
    );
  else if (phase === "paidIntro")
    screen = (
      <Note kicker="Quiz passed" title={`${SESSION.paid} paid rounds start now`} button="Start round 1" onDone={() => setPhase("round")}>
        Same rules as practice. At the end, one of these rounds is picked at random for your bonus.
      </Note>
    );
  else if (phase === "attention")
    screen = (
      <Attention
        arm={arm}
        onDone={(a) => {
          log.current.attention.push({ afterRound: rounds[i].n, ...a });
          nextRound();
        }}
      />
    );
  else if (phase === "round")
    screen = (
      <SoloRound
        key={i}
        arm={arm}
        round={rounds[i]}
        last={i === rounds.length - 1}
        onDone={(r) => {
          log.current.paid.push(r);
          if (ATTENTION_AFTER.includes(r.n)) setPhase("attention");
          else nextRound();
        }}
      />
    );
  else screen = <Done data={result} />;

  return (
    <GameContext.Provider value={GAME}>
      <div data-scroller className="h-screen overflow-auto bg-paper">
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
