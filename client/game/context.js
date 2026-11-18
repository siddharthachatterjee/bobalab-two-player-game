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

// practice/paid: round counts. pay: one random paid round pays pay.max − pay.perCost × its cost (see shared/rules.js bonusDollars).
export const DEFAULT_SESSION = { practice: 2, paid: 8, pay: { max: 2, perCost: 0.02 } };

export const GameContext = createContext({ roles: makeRoles(), session: DEFAULT_SESSION });
export const useGame = () => useContext(GameContext);
export const useRoles = () => useContext(GameContext).roles;
