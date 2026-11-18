// One round of the 2-player game, seen from the server: both plants at once.
// Pure functions; server/src/callbacks.js stores the results in Empirica.
// A missing choice (the player timed out or left) is filled in by the
// programmed partner's policy and flagged as auto.
import {
  clampShip,
  drawMarket,
  drawSituation,
  forwardMessage,
  cost,
  points,
  programmedMessage,
  programmedShipment,
  suggestion,
  target,
} from "./rules.js";

export const ROLES = ["north", "south"];
export const otherRole = (role) => (role === "north" ? "south" : "north");

// Session shape for the paired game.
export const PAIR_SESSION = {
  practice: 2, // solo rounds against the program, during the intro
  paid: 8,
  pay: { max: 2, perCost: 0.02 }, // one paid round picked at random: $max − perCost × its cost; placeholder
  seconds: { send: 120, ship: 180, results: 60 },
  dropAfter: 2, // consecutive timed-out stages before the program takes over for the rest of the game
};

// The hidden draw for a round: market and both situations, independent.
export function drawPairRound(arm, rand = Math.random) {
  return {
    market: drawMarket(arm, rand),
    situation: { north: drawSituation(arm, rand), south: drawSituation(arm, rand) },
  };
}

// What each player may see when the round starts.
export const startView = (arm, situation) => ({ situation, suggestion: suggestion(arm, situation) });

// After both reports: sent[role] is a message id, or undefined if the player didn't send.
// Returns per role { sent, sentAuto, toPartner, fromPartner, partnerSent }.
export function resolveSends(arm, draw, sent) {
  const final = {};
  for (const role of ROLES) {
    const auto = sent[role] === undefined || sent[role] === null;
    final[role] = { sent: auto ? programmedMessage(arm, draw.situation[role]) : sent[role], sentAuto: auto };
  }
  const out = {};
  for (const role of ROLES) {
    const partner = final[otherRole(role)];
    out[role] = {
      ...final[role],
      toPartner: forwardMessage(arm, draw.market, final[role].sent),
      partnerSent: partner.sent,
      fromPartner: forwardMessage(arm, draw.market, partner.sent),
    };
  }
  return out;
}

// After both shipments: ship[role] is a number, or undefined if the player didn't ship.
// msgs is resolveSends' output. Returns per role the full results view.
export function resolveShips(arm, draw, msgs, ship) {
  const final = {};
  for (const role of ROLES) {
    const auto = ship[role] === undefined || ship[role] === null;
    final[role] = {
      ship: auto ? programmedShipment(arm, draw.situation[role], msgs[role].fromPartner) : clampShip(arm, ship[role]),
      shipAuto: auto,
    };
  }
  const out = {};
  for (const role of ROLES) {
    const other = otherRole(role);
    const d = target(arm, draw.situation[role], draw.market);
    out[role] = {
      market: draw.market,
      situation: draw.situation[role],
      partnerSituation: draw.situation[other],
      ...msgs[role],
      ...final[role],
      partnerShip: final[other].ship,
      target: d,
      cost: cost(arm, final[role].ship, d, final[other].ship),
      points: points(arm, final[role].ship, d, final[other].ship),
    };
  }
  return out;
}

// Consecutive timeouts: reset on a submitted stage, count up on a missed one.
export const nextTimeouts = (count, submitted) => (submitted ? 0 : count + 1);
