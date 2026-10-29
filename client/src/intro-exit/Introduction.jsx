import React from "react";
import { GAME, SCORING, formatMoney } from "../../../shared/model.js";
import { PrimaryButton } from "../components/ui";

const STEPS = [
  "Check today's conditions and the AI forecast.",
  "Tell the other plant how many crates you're aiming for.",
  "Load your truck. You earn more near your sweet spot and near the other plant.",
];

export function Introduction({ next }) {
  return (
    <div className="min-h-full bg-paper flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl">
        <h1 className="text-5xl font-semibold tracking-tight text-ink">Crate Factory</h1>
        <p className="mt-4 text-lg text-muted">
          You and a partner each run a plant for the same company: the North plant and the South plant.
        </p>

        <ol className="mt-10 space-y-4">
          {STEPS.map((s, i) => (
            <li key={s} className="flex gap-4 text-[16px] text-ink">
              <span className="font-mono text-accent">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>

        <p className="mt-10 text-[15px] text-muted">
          Up to <span className="font-mono text-ink">{formatMoney(SCORING.perDay)}</span> a day ·{" "}
          {GAME.shifts} days
        </p>

        <div className="mt-6">
          <PrimaryButton onClick={next}>Start</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
