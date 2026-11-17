// The 2-player game on Empirica. The rules live in shared/ (rules.js, pair.js);
// this file only moves values between Empirica attributes and those functions.
//
// Privacy: Empirica sends every attribute in a game to both players, so values
// a player must not see yet are sealed (shared/secure.js, ./vault.js): to one
// player ("for N/S"), or to the server only. Once a round is scored nothing in
// it is secret, so its data row and outcome are stored in plain text for export.
//
//   round.draw               market + both situations       sealed, server
//   round.messages           both sides' messages            sealed, server
//   round.outcome            market + both situations       plain, after scoring
//   player.round.view        { n, situation, suggestion }    sealed, for player
//   player.round.send        { sent, secSend, ... }          sealed by client, for server
//   player.round.messages    { sent, sentAuto, fromPartner } sealed, for player
//   player.round.ship        { ship, guess, ... }            sealed by client, for server
//   player.round.result      the scored round, both sides    plain, after scoring
//   player.round.record      the data row (shared/record.js) plain, after scoring
//   player.round.done        true when they leave results    plain, client
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
import { openFrom, openServer, sealFor, sealServer, serverPublicKey } from "./vault";

export const Empirica = new ClassicListenersCollector();

const armOf = (game) => loadArm(game.get("armId"));
const byRole = (game) => Object.fromEntries(game.players.map((p) => [p.get("role"), p]));
const report = (where) => (err) => console.error(`[crate-factory] ${where}:`, err);

Empirica.onGameStart(({ game }) => {
  const { arm: armId } = game.get("treatment");
  loadArm(armId); // throws early on a bad treatment
  game.set("armId", armId);
  serverPublicKey().then((k) => game.set("serverKey", k), report("serverKey"));

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
  startRound(round).catch(report("round start"));
});

async function startRound(round) {
  const game = round.currentGame;
  const draw = drawPairRound(armOf(game));
  round.set("draw", await sealServer(draw));
  for (const player of game.players) await sendView(player, round, draw);
}

async function sendView(player, round, draw) {
  const view = { n: round.get("n"), ...startView(armOf(round.currentGame), draw.situation[player.get("role")]) };
  player.round.set("view", await sealFor(player, view));
}

// If a browser lost its key and published a new one, re-seal what it should see now.
Empirica.on("player", "pubKey", (ctx, { player }) => {
  const round = player.currentRound;
  if (!round?.get("draw") || !player.get("role")) return;
  (async () => {
    await sendView(player, round, await openServer(round.get("draw")));
    if (round.get("messages")) await sendMessages(player, round, await openServer(round.get("messages")));
  })().catch(report("reseal"));
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
  if (step === "send") endSend(stage.round, game).catch(report("send"));
  if (step === "ship") endShip(stage.round, game).catch(report("ship"));
});

// Each player's sealed choices, opened; missing ones stay undefined.
async function choices(game, key) {
  const players = byRole(game);
  const out = {};
  for (const role of ROLES) out[role] = players[role] ? await openFrom(players[role], players[role].round.get(key)) : undefined;
  return out;
}

async function endSend(round, game) {
  const sends = await choices(game, "send");
  const sent = Object.fromEntries(ROLES.map((r) => [r, sends[r]?.sent]));
  const msgs = resolveSends(armOf(game), await openServer(round.get("draw")), sent);
  round.set("messages", await sealServer(msgs));
  for (const player of game.players) await sendMessages(player, round, msgs);
}

// Before results, a player learns only their own message and what was delivered to them.
async function sendMessages(player, round, msgs) {
  const { sent, sentAuto, fromPartner } = msgs[player.get("role")];
  player.round.set("messages", await sealFor(player, { sent, sentAuto, fromPartner }));
}

async function endShip(round, game) {
  const arm = armOf(game);
  const draw = await openServer(round.get("draw"));
  const sends = await choices(game, "send");
  const ships = await choices(game, "ship");
  const ship = Object.fromEntries(ROLES.map((r) => [r, ships[r]?.ship]));
  const results = resolveShips(arm, draw, await openServer(round.get("messages")), ship);
  const n = round.get("n");
  round.set("outcome", draw);

  for (const player of game.players) {
    const role = player.get("role");
    const view = startView(arm, draw.situation[role]);
    const result = { n, practice: false, suggestion: view.suggestion, ...results[role] };
    player.round.set("result", result);
    player.round.set("record", roundRecord({ ...sends[role], ...ships[role], ...result }));
    const history = [...(player.get("paidRounds") || []), { n, points: result.points }];
    player.set("paidRounds", history);
    if (n === PAIR_SESSION.paid) setBonus(player, history);
  }
}

// One paid round is picked at random for the bonus.
function setBonus(player, history) {
  const pick = history[Math.floor(Math.random() * history.length)];
  player.set("bonus", {
    round: pick.n,
    points: Number(pick.points.toFixed(2)),
    dollars: Number((pick.points * PAIR_SESSION.dollarsPerPoint).toFixed(2)),
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
