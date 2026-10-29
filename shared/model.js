// Game model, following Sinchaisri & Wang, "Information Exchange through AI"
// (working paper). Equation numbers refer to that paper.
// Pure functions only: callers draw the randomness.

export const PARAMS = {
  h: 1.0, // how strongly the firm's target follows demand
  beta: 0.5, // size of the private bonus bias
  thetaL: 0.55, // demand prior U[thetaL, thetaH]; h*thetaL >= beta keeps targets aligned (Sec 4.1)
  thetaH: 1.5,
  q: 0.5, // prior chance a player has the Big-moves bonus
  gamma: 0.35, // coordination weight; below sqrt(2)-1 ≈ 0.414, so pooling can help the firm
};

export const GAME = {
  // Each shift is one task with fresh types. One day per shift is the static
  // model (Secs 2-4) that the disclosure conditions and tips are derived for;
  // two days would be the Sec 6 two-period task, whose optimal policy differs.
  shifts: 8,
  daysPerShift: 1,
  seconds: { message: 45, decide: 45, results: 40 },
};

// Coins are shown as game dollars: up to $100 per day.
// k sets the stakes: picking well instead of just taking your sweet spot is worth
// roughly $7-30 a day. Pay stays above the $0 floor around the best pick; only
// picks far from both your sweet spot and your partner reach it.
export const SCORING = { perDay: 100, k: 60 };

export const ACTION = { min: -2.5, max: 2.5, step: 0.05, unitsPerStep: 100 };

export const MESSAGES = {
  up2: { arrow: "⬆⬆", label: "Big up", T: 1, X: 1 },
  up1: { arrow: "⬆", label: "Up a bit", T: -1, X: 1 },
  down1: { arrow: "⬇", label: "Down a bit", T: -1, X: -1 },
  down2: { arrow: "⬇⬇", label: "Big down", T: 1, X: -1 },
};
export const MESSAGE_KEYS = ["up2", "up1", "down1", "down2"];

// Two branches of one company, with identical rules.
// condition: today's local signal X. bonus: the private type T for a shift,
// told as a factory situation that makes bigger (T=1) or smaller (T=-1) changes pay.
export const ROLES = {
  north: {
    name: "North plant",
    condition: { 1: "Big order came in", "-1": "Supplier delay" },
    bonus: {
      1: { name: "Overtime crew on call", pay: "Bigger changes pay you more" },
      "-1": { name: "Retooling is expensive", pay: "Smaller changes pay you more" },
    },
  },
  south: {
    name: "South plant",
    condition: { 1: "Machines running great", "-1": "Power outage" },
    bonus: {
      1: { name: "Night shift available", pay: "Bigger changes pay you more" },
      "-1": { name: "Warehouse nearly full", pay: "Smaller changes pay you more" },
    },
  },
};
export const ROLE_KEYS = ["north", "south"];
export const otherRole = (role) => (role === "north" ? "south" : "north");

// Eq. 2: firm target H and the player's preferred target D.
export const firmTarget = (theta, X) => theta * PARAMS.h * X;
export const ownTarget = (theta, T, X) => (theta * PARAMS.h + PARAMS.beta * T) * X;

// Eq. 3 and 4
export function workerLoss({ a, aPartner, theta, T, X, gamma }) {
  return (1 - gamma) * (a - ownTarget(theta, T, X)) ** 2 + gamma * (a - aPartner) ** 2;
}

export function firmLoss({ a1, a2, theta, X1, X2, gamma }) {
  return (
    ((1 - gamma) / 2) * ((a1 - firmTarget(theta, X1)) ** 2 + (a2 - firmTarget(theta, X2)) ** 2) +
    gamma * (a1 - a2) ** 2
  );
}

export const toPoints = (loss) =>
  Math.max(0, Math.round(SCORING.perDay - SCORING.k * loss));

// A player's coins for picking a, if the partner picks b and the sweet spot is D (Eq. 3).
export const payoff = (a, b, D, g = PARAMS.gamma) =>
  toPoints((1 - g) * (a - D) ** 2 + g * (a - b) ** 2);

// The two costs behind payoff, in dollars: missing your sweet spot, and being
// apart from your partner. total matches payoff.
export function payParts(a, b, D, g = PARAMS.gamma) {
  const miss = SCORING.k * (1 - g) * (a - D) ** 2;
  const apart = SCORING.k * g * (a - b) ** 2;
  return { miss, apart, total: Math.max(0, Math.round(SCORING.perDay - miss - apart)) };
}

// Best reply to a partner at b: part of the way from D toward b.
export const bestReply = (b, D, g = PARAMS.gamma) => (1 - g) * D + g * b;

export const formatMoney = (coins) => `$${Math.round(coins)}`;

// Eq. 20, 21, 26, 27
export const bGamma = (g) => ((1 - g) * g * g * (1 - 2 * g - g * g)) / (2 * (1 + g) ** 2);
export const aGamma = (g) => ((1 - g) * (1 + g * g)) / (1 + g) ** 2;
export const muC = (g) => ((1 + g) * PARAMS.beta) / PARAMS.h;

export function poolInterval(g) {
  const b = bGamma(g);
  if (b <= 0) return null; // high coordination: full disclosure is optimal (Prop 2)
  const uncertainty = 2 * PARAMS.q * (1 - PARAMS.q);
  const w = (PARAMS.beta / PARAMS.h) * Math.sqrt(((2 * b) / aGamma(g)) * uncertainty);
  const c = muC(g);
  return { lo: c - w, hi: c + w, mean: c };
}

export const priorMean = () => (PARAMS.thetaL + PARAMS.thetaH) / 2;

// The AI's public signal under each disclosure condition.
//   direct:  no forecast (Sec 4.5)
//   full:    exact demand
//   optimal: firm-optimal policy, exact except a pooled band around mu_c (Eq. 28)
export function forecastSignal(disclosure, theta, g) {
  if (disclosure === "direct") return { kind: "hidden", mean: priorMean() };
  if (disclosure === "optimal") {
    const pool = poolInterval(g);
    if (pool && theta >= pool.lo && theta <= pool.hi) {
      return { kind: "range", lo: pool.lo, hi: pool.hi, mean: pool.mean };
    }
  }
  return { kind: "exact", value: theta, mean: theta };
}

// Sec 4.4: the firm-preferred reporting rule after a signal.
// "full" reveals bonus and direction, "direction" reveals direction only.
export function recommendedRule(mu, g) {
  return bGamma(g) > 0 && mu <= muC(g) + 1e-9 ? "full" : "direction";
}

// The honest message: the one whose (T, X) is the sender's own.
export const honestMessage = (T, X) =>
  X === 1 ? (T === 1 ? "up2" : "up1") : T === 1 ? "down2" : "down1";

export function recommendedMessages(rule, T, X) {
  if (rule === "full") return [honestMessage(T, X)];
  return [X === 1 ? "up1" : "down1"];
}

// Messages are shown as the sweet spot they claim, given today's forecast mean.
export function messageAim(key, mu) {
  const m = MESSAGES[key];
  return ownTarget(mu, m.T, m.X);
}

export const clampAction = (a) =>
  Math.max(ACTION.min, Math.min(ACTION.max, Math.round(a / ACTION.step) * ACTION.step));

// Signed crate count, e.g. "+120" or "−80". round rounds to that many crates.
export function formatUnits(a, round = 1) {
  const n = Math.round(Math.abs(a * ACTION.unitsPerStep) / round) * round;
  return n === 0 ? "0" : `${a > 0 ? "+" : "−"}${n}`;
}
export const formatAim = (a) => formatUnits(a, 10);

// Demand shown as a 0-100 meter across the prior support.
export const demandPct = (theta) =>
  Math.round(((theta - PARAMS.thetaL) / (PARAMS.thetaH - PARAMS.thetaL)) * 100);
