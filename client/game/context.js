// What the shared screens need to know about the session they run in:
// which plant the player runs, who the partner is, and the session shape.
// The 1-player and 2-player apps each wrap their screens in <GameContext.Provider>.
import { createContext, useContext } from "react";

const PLANTS = {
  north: { plant: "North plant", short: "North" },
  south: { plant: "South plant", short: "South" },
};

// me: "north" | "south". partnerKind: "program" (1-player) | "person" (2-player).
export function makeRoles(me = "north", partnerKind = "program") {
  const other = me === "north" ? "south" : "north";
  return {
    me,
    partnerKind,
    you: PLANTS[me].short, // "North"
    youPlant: PLANTS[me].plant, // "North plant"
    partner: PLANTS[other].short, // "South"
    partnerPlant: PLANTS[other].plant, // "South plant"
  };
}

// rounds: how many practice and paid rounds. dollarsPerPoint: bonus rate for one random paid round.
export const DEFAULT_SESSION = { practice: 2, paid: 8, dollarsPerPoint: 0.02 };

export const GameContext = createContext({ roles: makeRoles(), session: DEFAULT_SESSION });
export const useGame = () => useContext(GameContext);
export const useRoles = () => useContext(GameContext).roles;
