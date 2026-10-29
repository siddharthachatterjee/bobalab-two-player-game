import { ClassicListenersCollector } from "@empirica/core/admin/classic";
import {
  GAME,
  PARAMS,
  ROLE_KEYS,
  clampAction,
  firmLoss,
  forecastSignal,
  ownTarget,
  firmTarget,
  messageAim,
  otherRole,
  recommendedRule,
  toPoints,
  workerLoss,
} from "../../shared/model.js";
export const Empirica = new ClassicListenersCollector();

// True demand stays in server memory, off every attribute clients can read,
// until the shift results. If the server restarts mid-shift it falls back to
// the forecast mean.
const hiddenDemand = new Map(); // `${round.id}:${day}` -> theta

const coin = () => (Math.random() < 0.5 ? 1 : -1);
const drawDemand = () => PARAMS.thetaL + Math.random() * (PARAMS.thetaH - PARAMS.thetaL);

Empirica.onGameStart(({ game }) => {
  const roles = Math.random() < 0.5 ? ROLE_KEYS : [...ROLE_KEYS].reverse();
  game.players.forEach((player, i) => {
    player.set("role", roles[i % 2]);
    player.set("coins", 0);
  });
  game.set("teamStars", 0);

  for (let s = 1; s <= GAME.shifts; s++) {
    const round = game.addRound({ name: `Day ${s}`, shift: s });
    for (let day = 1; day <= GAME.daysPerShift; day++) {
      round.addStage({ name: `Day ${day} · Message`, step: "message", day, duration: GAME.seconds.message });
      round.addStage({ name: `Day ${day} · Decide`, step: "decide", day, duration: GAME.seconds.decide });
    }
    round.addStage({ name: "Shift results", step: "results", duration: GAME.seconds.results });
  }
});

// Bonus types are persistent within a shift (one two-period task, Sec 6).
Empirica.onRoundStart(({ round }) => {
  for (const player of round.currentGame.players) {
    player.round.set("type", coin());
  }
});

Empirica.onStageStart(({ stage }) => {
  if (stage.get("step") === "message") startDay(stage);
});

Empirica.onStageEnded(({ stage }) => {
  const step = stage.get("step");
  if (step === "message") relayMessages(stage);
  if (step === "decide") lockActions(stage);
  if (step === "decide" && stage.get("day") === GAME.daysPerShift) scoreShift(stage);
});

Empirica.onRoundEnded(({ round }) => {
  for (let day = 1; day <= GAME.daysPerShift; day++) hiddenDemand.delete(`${round.id}:${day}`);
});

Empirica.onGameEnded(({ game }) => {});

// AI observes demand and sends its committed public signal;
// each player privately learns today's local condition.
function startDay(stage) {
  const round = stage.round;
  const day = stage.get("day");
  const { disclosure } = round.currentGame.get("treatment");
  const g = PARAMS.gamma;

  const theta = drawDemand();
  hiddenDemand.set(`${round.id}:${day}`, theta);

  const signal = forecastSignal(disclosure, theta, g);
  round.set(`forecast${day}`, signal);
  round.set(`rule${day}`, recommendedRule(signal.mean, g));

  for (const player of round.currentGame.players) {
    player.round.set(`X${day}`, coin());
  }
}

// The AI forwards both replies unchanged (baseline protocol, Sec 2.2).
function relayMessages(stage) {
  const round = stage.round;
  const day = stage.get("day");
  const messages = {};
  for (const player of round.currentGame.players) {
    const msg = player.round.get(`msg${day}`);
    if (msg === undefined) player.round.set(`msgTimedOut${day}`, true);
    messages[player.get("role")] = msg ?? null;
  }
  round.set(`messages${day}`, messages);
}

function lockActions(stage) {
  const round = stage.round;
  const day = stage.get("day");
  const mu = round.get(`forecast${day}`).mean;
  const messages = round.get(`messages${day}`) || {};
  for (const player of round.currentGame.players) {
    // Guess about the partner's call. Untouched guesses keep the on-screen default.
    if (player.round.get(`guess${day}`) === undefined) {
      const partnerMsg = messages[otherRole(player.get("role"))];
      player.round.set(`guess${day}`, partnerMsg ? messageAim(partnerMsg, mu) : 0);
      player.round.set(`guessUntouched${day}`, true);
    }

    const a = player.round.get(`action${day}`);
    if (a === undefined) {
      player.round.set(`action${day}`, 0);
      player.round.set(`actionTimedOut${day}`, true);
    } else {
      player.round.set(`action${day}`, clampAction(a));
    }
  }
}

// No feedback between the two days (Sec 6): everything is revealed at shift end.
function scoreShift(stage) {
  const round = stage.round;
  const game = round.currentGame;
  const g = PARAMS.gamma;
  const players = game.players;
  const days = [];

  for (let day = 1; day <= GAME.daysPerShift; day++) {
    const theta = hiddenDemand.get(`${round.id}:${day}`) ?? round.get(`forecast${day}`).mean;
    const rows = players.map((p) => ({
      p,
      role: p.get("role"),
      T: p.round.get("type"),
      X: p.round.get(`X${day}`),
      a: p.round.get(`action${day}`) ?? 0,
      msg: p.round.get(`msg${day}`) ?? null,
    }));
    const [r1, r2 = r1] = rows;
    const stars = toPoints(firmLoss({ a1: r1.a, a2: r2.a, theta, X1: r1.X, X2: r2.X, gamma: g }));

    const byRole = {};
    for (const r of rows) {
      const partner = rows.find((o) => o !== r) ?? r;
      const coins = toPoints(workerLoss({ a: r.a, aPartner: partner.a, theta, T: r.T, X: r.X, gamma: g }));
      byRole[r.role] = {
        T: r.T,
        X: r.X,
        msg: r.msg,
        action: r.a,
        target: ownTarget(theta, r.T, r.X),
        firmTarget: firmTarget(theta, r.X),
        coins,
      };
      r.p.set("coins", (r.p.get("coins") || 0) + coins);
    }
    game.set("teamStars", (game.get("teamStars") || 0) + stars);
    days.push({ day, theta, stars, players: byRole });
  }

  round.set("results", days);
}
