// The 2-player game on Empirica. The rules live in shared/ (rules.js, pair.js);
// this file only moves values between Empirica attributes and those functions.
//
// Note: Empirica 1.12 sends every attribute in a game to both players, so the
// values below are hidden on screen but readable in a browser's devtools.
//
//   round.draw               market + both situations       server
//   round.messages           both sides' messages            server, after both send
//   player.round.view        { n, situation, suggestion }    server, at round start
//   player.round.send        { sent, secSend, ... }          client, Send stage
//   player.round.messages    { sent, sentAuto, fromPartner } server, after both send
//   player.round.ship        { ship, guess, ... }            client, Ship stage
//   player.round.result      the scored round, both sides    server, after both ship
//   player.round.record      the data row (shared/record.js) server, after both ship
//   player.round.done        true when they leave results    client, Results stage
import { ClassicListenersCollector } from "@empirica/core/admin/classic";
import { loadArm } from "../../shared/arms/index.js";
import {
  PAIR_SESSION,
  ROLES,
  drawPairRound,
  nextTimeouts,
  resolveSends,
  resolveShips,
  startView,
} from "../../shared/pair.js";
import { roundRecord } from "../../shared/record.js";
import { bonusDollars } from "../../shared/rules.js";

export const Empirica = new ClassicListenersCollector();

const armOf = (game) => loadArm(game.get("armId"));
const byRole = (game) => Object.fromEntries(game.players.map((p) => [p.get("role"), p]));
// Each role's value of a player.round attribute; missing roles and values stay undefined.
const fromRoles = (game, key) => {
  const players = byRole(game);
  return Object.fromEntries(ROLES.map((r) => [r, players[r]?.round.get(key)]));
};

Empirica.onGameStart(({ game }) => {
  const { arm: armId } = game.get("treatment");
  loadArm(armId); // throws early on a bad treatment
  game.set("armId", armId);

  const roles = Math.random() < 0.5 ? ROLES : [...ROLES].reverse();
  game.players.forEach((player, i) => {
    player.set("role", roles[i % 2]);
    player.set("timeouts", 0);
  });

  const { paid, seconds } = PAIR_SESSION;
  for (let n = 1; n <= paid; n++) {
    const round = game.addRound({ name: `Round ${n}`, n });
    round.addStage({ name: "Send", step: "send", duration: seconds.send });
    round.addStage({ name: "Ship", step: "ship", duration: seconds.ship });
    round.addStage({ name: "Results", step: "results", duration: seconds.results });
  }
});

Empirica.onRoundStart(({ round }) => {
  const game = round.currentGame;
  const arm = armOf(game);
  const draw = drawPairRound(arm);
  round.set("draw", draw);
  for (const player of game.players) {
    const situation = draw.situation[player.get("role")];
    player.round.set("view", { n: round.get("n"), ...startView(arm, situation) });
  }
});

// A player who has dropped out is played by the program: submit for them at once.
Empirica.onStageStart(({ stage }) => {
  for (const player of stage.currentGame.players) {
    if (player.get("dropped")) player.stage.set("submit", true);
  }
});

Empirica.onStageEnded(({ stage }) => {
  const game = stage.currentGame;
  const step = stage.get("step");
  trackTimeouts(game, step);
  if (step === "send") endSend(stage.round, game);
  if (step === "ship") endShip(stage.round, game);
});

function endSend(round, game) {
  const sends = fromRoles(game, "send");
  const sent = Object.fromEntries(ROLES.map((r) => [r, sends[r]?.sent]));
  const msgs = resolveSends(armOf(game), round.get("draw"), sent);
  round.set("messages", msgs);
  for (const player of game.players) {
    // Before results, a player is shown only their own message and what was delivered to them.
    const { sent: mine, sentAuto, fromPartner } = msgs[player.get("role")];
    player.round.set("messages", { sent: mine, sentAuto, fromPartner });
  }
}

function endShip(round, game) {
  const arm = armOf(game);
  const draw = round.get("draw");
  const sends = fromRoles(game, "send");
  const ships = fromRoles(game, "ship");
  const ship = Object.fromEntries(ROLES.map((r) => [r, ships[r]?.ship]));
  const results = resolveShips(arm, draw, round.get("messages"), ship);
  const n = round.get("n");

  for (const player of game.players) {
    const role = player.get("role");
    const { suggestion } = startView(arm, draw.situation[role]);
    const result = { n, practice: false, suggestion, ...results[role] };
    player.round.set("result", result);
    player.round.set("record", roundRecord({ ...sends[role], ...ships[role], ...result }));
    const history = [...(player.get("paidRounds") || []), { n, cost: result.cost }];
    player.set("paidRounds", history);
    if (n === PAIR_SESSION.paid) setBonus(player, history);
  }
}

// One paid round is picked at random for the bonus.
function setBonus(player, history) {
  const pick = history[Math.floor(Math.random() * history.length)];
  player.set("bonus", {
    round: pick.n,
    cost: Number(pick.cost.toFixed(2)),
    dollars: Number(bonusDollars(PAIR_SESSION.pay, pick.cost).toFixed(2)),
  });
}

// What the client writes when a player finishes each stage.
const STAGE_OUTPUT = { send: "send", ship: "ship", results: "done" };

// After enough missed stages in a row, the program plays for that player.
function trackTimeouts(game, step) {
  for (const player of game.players) {
    if (player.get("dropped")) continue;
    const submitted = player.round.get(STAGE_OUTPUT[step]) !== undefined;
    const count = nextTimeouts(player.get("timeouts") || 0, submitted);
    player.set("timeouts", count);
    if (count >= PAIR_SESSION.dropAfter) player.set("dropped", true);
  }
}
