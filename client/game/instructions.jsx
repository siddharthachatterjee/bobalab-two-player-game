// Instructions, comprehension quiz, attention check and the screens between them.
// All arm-specific text and quiz answers come from the arm.
import React, { useEffect, useMemo, useState } from "react";
import { cost, formatCost, formatCrates, formatDollars, pct, situationName } from "../../shared/rules.js";
import {
  Box,
  Button,
  ForwardingTable,
  H1,
  H2,
  Kicker,
  LinkButton,
  P,
  Page,
  CostFormula,
  CostModal,
  Progress,
  Section,
  SituationTable,
  forwardingLabel,
  scrollToTop,
} from "./parts";
import { useGame, useRoles } from "./context";

const steps = (roles) => [
  { title: "Send a message", text: "Choose one of four descriptions." },
  { title: `Read ${roles.partner}'s message`, text: `See what ${roles.partner} says about its situation.` },
  { title: "Choose your shipment", text: "Your shipment is a separate choice." },
];

// One labelled fact, for short lists.
function Fact({ label, children }) {
  return (
    <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[140px_1fr] gap-4 py-3 border-t border-line text-[15px] leading-relaxed">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

function Overview({ arm, onCost }) {
  const roles = useRoles();
  const ex = arm.situations[arm.displayOrder[1]];
  return (
    <>
      <H1>Run the {roles.youPlant}</H1>
      {roles.partnerKind === "person" && (
        <P strong>
          You'll be paired with another participant and assigned the North or South plant at random. Both plants play by
          the same rules; these instructions show the North plant.
        </P>
      )}
      <Box label="The game in one line">
        You and the {roles.partnerPlant} each choose how many more or fewer crates to ship than normal. Your cost is lower when you ship
        close to your own target and close to the {roles.partnerPlant}.
      </Box>
      <ol className="max-w-2xl border-b border-line">
        {steps(roles).map((st, i) => (
          <li key={st.title} className="flex items-baseline gap-4 py-2.5 border-t border-line text-[15px]">
            <span className="w-5 font-mono text-muted">{i + 1}</span>
            <span className="font-medium text-ink">{st.title}</span>
            <span className="text-muted">{st.text}</span>
          </li>
        ))}
      </ol>
      <dl className="max-w-2xl border-b border-line">
        <Fact label="Your targets">
          You and {roles.partner} are each given targets for a low and a high market. Only you can see yours. For example,{" "}
          <b>{ex.name}</b>: {formatCrates(ex.low)} if low ({pct(1 - arm.p)}), {formatCrates(ex.high)} if high (
          {pct(arm.p)}).
        </Fact>
        <Fact label="The mediator">
          Knows whether the market is low or high. You see the chances, not the outcome. The market is shown after
          shipping.
        </Fact>
        <Fact label="Your cost">
          Each round has a shipping cost: it grows when you miss your target and when you ship a different amount from{" "}
          {roles.partner}. Lower is better. <LinkButton onClick={onCost}>How cost works</LinkButton>
        </Fact>
      </dl>
      <P>
        + means more than normal; − means less than normal. Sending a different description does not change your
        targets.
      </P>
    </>
  );
}

function Rules({ arm, onCost }) {
  const { roles, session } = useGame();
  return (
    <>
      <H1>This session's rules</H1>
      <div className="space-y-3">
        <Section>The situations</Section>
        <P strong>
          Each round, each plant is dealt one situation, separately, with these chances. The market is low{" "}
          {pct(1 - arm.p)} of the time and high {pct(arm.p)} of the time. All of these are drawn fresh every round.
        </P>
        <SituationTable arm={arm} />
      </div>
      <div className="space-y-3">
        <Section>The other plant</Section>
        <P strong>
          {roles.partnerKind === "program"
            ? `The ${roles.partnerPlant} is run by a computer program, not a person.`
            : `The ${roles.partnerPlant} is run by another participant.`}{" "}
          It gets its own situation the same way you do, sends a message through the same mediator, and chooses its
          shipment after reading the message delivered to it. It does not see your targets or your shipment until the
          results.
          {roles.partnerKind === "person" && " In the practice rounds, the other plant is run by a computer program."}
        </P>
      </div>
      <div className="space-y-3">
        <Section>The mediator: {forwardingLabel(arm).replace("Mediator ", "").toLowerCase()}</Section>
        <P strong>
          {arm.forwarding === "unchanged"
            ? `The mediator passes each message on exactly as sent.`
            : `The mediator knows the market and may change a message before passing it on. This table is the complete rule. It applies to both plants.`}
        </P>
        <ForwardingTable arm={arm} />
      </div>
      {arm.recommend && (
        <div className="space-y-3">
          <Section>AI suggestion</Section>
          <P strong>
            Each round, an AI suggests which message to send, based on your situation. The suggestion is optional: you
            can send any description.
          </P>
        </div>
      )}
      <div className="space-y-3">
        <Section>Cost and bonus</Section>
        <CostFormula arm={arm} />
        <P strong>
          You'll play {session.practice} practice rounds, a short quiz, then {session.paid} paid rounds. One paid round
          is picked at random. Your bonus is {formatDollars(session.pay.max)} minus{" "}
          {Math.round(session.pay.perCost * 100)}¢ for each unit of that round's cost (never below $0), so a lower cost
          pays more.
        </P>
        <LinkButton onClick={onCost}>How cost works, with an example</LinkButton>
      </div>
    </>
  );
}

export function Instructions({ arm, onDone }) {
  const [page, setPage] = useState(0);
  const [costHelp, setCostHelp] = useState(false);
  const pages = [
    { kicker: "Before you begin", body: <Overview arm={arm} onCost={() => setCostHelp(true)} /> },
    { kicker: "This session's rules", body: <Rules arm={arm} onCost={() => setCostHelp(true)} /> },
  ];
  const last = page === pages.length - 1;
  useEffect(scrollToTop, [page]);
  return (
    <>
      <Page width="max-w-3xl">
        <div className="max-w-2xl space-y-3">
          <Progress at={page} of={pages.length} />
          <Kicker>
            Instructions · {page + 1} of {pages.length} · {pages[page].kicker}
          </Kicker>
        </div>
        <div key={page} className="space-y-8 anim-fade-up">
          {pages[page].body}
        </div>
        <div className="flex gap-3">
          {page > 0 && (
            <Button kind="secondary" onClick={() => setPage(page - 1)}>
              Back
            </Button>
          )}
          <Button onClick={() => (last ? onDone() : setPage(page + 1))}>{last ? "Try a practice round" : "Next"}</Button>
        </div>
      </Page>
      {costHelp && <CostModal arm={arm} onClose={() => setCostHelp(false)} />}
    </>
  );
}

// ---------------------------------------------------------------- quiz

// Answers are option indexes. Built from the arm so every answer matches its rules.
function questions(arm, roles) {
  const n = (id) => situationName(arm, id);
  const ex = arm.displayOrder[1];
  const exHigh = arm.situations[ex].high;
  const targetOpts = [...new Set([arm.situations[ex].low, exHigh, arm.situations[arm.displayOrder[0]].high, -exHigh])];

  // Forwarding: the first changed cell, else Large increase in a low market.
  let fw = { market: "low", sent: arm.displayOrder[0] };
  if (arm.forwarding === "selective")
    for (const m of ["low", "high"])
      for (const s of arm.displayOrder) if (arm.forward[m][s] !== s && fw.changed === undefined) fw = { market: m, sent: s, changed: true };
  const delivered = arm.forwarding === "unchanged" ? fw.sent : arm.forward[fw.market][fw.sent];

  const c = cost(arm, 40, 20, 40);
  const costOpts = [0, c, cost(arm, 40, 20, 0), 20];
  const costUnique = [...new Set(costOpts.map((v) => formatCost(v)))];

  return [
    {
      q: `Your situation is ${n(ex)} and the market turns out high. What is your target?`,
      options: targetOpts.map((v) => formatCrates(v)),
      answer: targetOpts.indexOf(exHigh),
    },
    {
      q: `What does ${roles.partner} learn about your situation?`,
      options: ["Your situation and targets", "Only the message the mediator delivers to it", "Nothing at all"],
      answer: 1,
    },
    {
      q: "If you send a different description from your situation, what happens to your targets?",
      options: ["They change to match the message", "They stay the same", "They are averaged"],
      answer: 1,
    },
    {
      q: `You send ${n(fw.sent)} and the market is ${fw.market}. Which description does ${roles.partner} receive?`,
      options: arm.displayOrder.map(n),
      answer: arm.displayOrder.indexOf(delivered),
      fixedOrder: true, // the situations keep their usual order
    },
    {
      q: `Your target is +20, you ship +40, and ${roles.partner} also ships +40. What is your cost?`,
      options: costUnique,
      answer: costUnique.indexOf(formatCost(c)),
    },
  ];
}

// Shuffles a question's options so the right one isn't always in the same place.
function shuffled(q) {
  if (q.fixedOrder) return q;
  const order = q.options.map((_, i) => i).sort(() => Math.random() - 0.5);
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
}

// Two attempts; onDone({ passed, attempts: [{ answers, correct }] }), answers as option text.
export function Quiz({ arm, onDone }) {
  const roles = useRoles();
  const qs = useMemo(() => questions(arm, roles).map(shuffled), [arm, roles]);
  const [answers, setAnswers] = useState(qs.map(() => null));
  const [attempts, setAttempts] = useState([]);
  const [wrong, setWrong] = useState([]);
  const [help, setHelp] = useState(false);

  const submit = () => {
    const bad = qs.map((q, i) => answers[i] !== q.answer);
    const correct = bad.filter((b) => !b).length;
    const all = [...attempts, { answers: answers.map((a, i) => qs[i].options[a]), correct }];
    if (correct === qs.length) return onDone({ passed: true, attempts: all });
    if (all.length >= 2) return onDone({ passed: false, attempts: all });
    setAttempts(all);
    setWrong(bad);
  };

  return (
    <Page width="max-w-3xl">
      <div>
        <Kicker>Quiz · attempt {attempts.length + 1} of 2</Kicker>
        <H2>Five quick questions</H2>
        {attempts.length > 0 ? (
          <P className="mt-2 text-accent">
            {qs.length - attempts[0].correct} answer{qs.length - attempts[0].correct === 1 ? " was" : "s were"} wrong
            (marked below). You have one more try.
          </P>
        ) : (
          <P className="mt-2">You need all five right to continue. You get two tries.</P>
        )}
        <div className="mt-2">
          <LinkButton onClick={() => setHelp(true)}>How cost works</LinkButton>
        </div>
      </div>
      {qs.map((q, i) => (
        <fieldset key={i} className={`border-l-2 pl-4 ${wrong[i] ? "border-accent" : "border-line"}`}>
          <legend className="text-[15px] font-medium text-ink mb-3">
            {i + 1}. {q.q}
          </legend>
          <div className="flex flex-wrap gap-2">
            {q.options.map((o, j) => (
              <button
                key={o}
                type="button"
                onClick={() => setAnswers(answers.map((a, k) => (k === i ? j : a)))}
                className={`h-10 px-4 rounded-full border text-[14px] transition ${
                  answers[i] === j ? "bg-ink border-ink text-surface" : "border-ink/30 text-ink hover:border-ink"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <Button disabled={answers.includes(null)} onClick={submit}>
        Check answers
      </Button>
      {help && <CostModal arm={arm} onClose={() => setHelp(false)} />}
    </Page>
  );
}

export function Attention({ arm, onDone }) {
  const [pick, setPick] = useState(null);
  const want = arm.displayOrder[2];
  return (
    <Page width="max-w-3xl">
      <div>
        <Kicker>Quick check</Kicker>
        <H2>Please select {situationName(arm, want)} below, whatever your situation was.</H2>
      </div>
      <div className="flex flex-wrap gap-2">
        {arm.displayOrder.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setPick(k)}
            className={`h-10 px-4 rounded-full border text-[14px] transition ${
              pick === k ? "bg-ink border-ink text-surface" : "border-ink/30 text-ink hover:border-ink"
            }`}
          >
            {situationName(arm, k)}
          </button>
        ))}
      </div>
      <Button disabled={pick === null} onClick={() => onDone({ chose: pick, passed: pick === want })}>
        Continue
      </Button>
    </Page>
  );
}

export function Note({ kicker, title, children, button, onDone }) {
  return (
    <Page width="max-w-3xl">
      <div>
        <Kicker>{kicker}</Kicker>
        <H2>{title}</H2>
        <P className="mt-2">{children}</P>
      </div>
      <Button onClick={onDone}>{button}</Button>
    </Page>
  );
}
