import {
  usePlayer,
  useStage,
} from "@empirica/core/player/classic/react";
import React from "react";
import { Pending } from "./components/ui";
import { Decide } from "./stages/Decide";
import { Message } from "./stages/Message";
import { ShiftResults } from "./stages/ShiftResults";

export function Stage() {
  const player = usePlayer();
  const stage = useStage();

  if (player.stage.get("submit")) {
    return (
      <div className="pt-24">
        <Pending>Waiting for your partner</Pending>
      </div>
    );
  }

  const screen = { message: Message, decide: Decide, results: ShiftResults }[stage.get("step")];
  if (!screen) return <div>Unknown stage</div>;
  // Keyed by stage so each new screen fades in.
  return (
    <div key={stage.id} className="anim-fade-up w-full flex justify-center">
      {React.createElement(screen)}
    </div>
  );
}
