import {
  usePlayer,
  useRound,
  useStage,
} from "@empirica/core/player/classic/react";
import React from "react";
import { GAME, formatMoney } from "../../shared/model.js";
import { RoleIcon } from "./components/Icons";
import { Timer } from "./components/Timer";
import { roleInfo } from "./components/ui";

export function Profile() {
  const player = usePlayer();
  const round = useRound();
  const stage = useStage();

  const roleKey = player.get("role");
  const role = roleInfo(roleKey);
  const step = stage?.get("step");
  const where = { message: "Message", decide: "Decide", results: "Results" }[step] ?? "";

  return (
    <header className="border-b border-line">
      <div className="mx-auto max-w-4xl h-16 px-6 grid grid-cols-[1fr_auto_1fr] items-center">
        <div className="flex items-center gap-2.5 text-[14px] text-ink">
          <RoleIcon role={roleKey} size={18} />
          <span className="font-medium">{role.name}</span>
          <span className="text-faint">
            · Day {round?.get("shift") ?? 1} of {GAME.shifts} · {where}
          </span>
        </div>
        <Timer />
        <div className="text-right font-mono text-[15px] tabular-nums text-ink">
          {formatMoney(player.get("coins") || 0)} <span className="text-faint">earned</span>
        </div>
      </div>
    </header>
  );
}
