// The shipping game's rules, shared by the 1-player (Qualtrics) and 2-player
// (Empirica) versions. Every number comes from one row of shared/arms/arms.csv
// (an "arm") plus the tables keyed by its arm_id; see shared/arms/SPEC.md.
// Pure functions only; callers draw the randomness and own the session shape.
//
// Round fields are from one player's point of view:
//   situation, sent            this player's situation and message
//   partnerSituation, partnerSent
//   toPartner                  this player's message as delivered to the partner
//   fromPartner                the partner's message as delivered to this player
//   ship, partnerShip          the two shipments

export const MARKETS = ["low", "high"];
export const MARKET_NAMES = { low: "Low", high: "High" };

// ---------------------------------------------------------------- CSV loading

// Minimal CSV parser for these files (no quoted fields). Numbers become numbers.
export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const head = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    head.forEach((h, i) => {
      const v = cells[i];
      row[h] = v !== "" && Number.isFinite(Number(v)) ? Number(v) : v;
    });
    return row;
  });
}

// tables: { arms, targets, messageRules, forwardingRules, opponentShipments }, each parsed rows.
export const armIds = (tables) => tables.arms.map((a) => a.arm_id);

// Everything one arm needs, checked for completeness.
export function buildArm(tables, armId) {
  const row = tables.arms.find((a) => a.arm_id === armId);
  if (!row) throw new Error(`Unknown arm ${armId}`);
  const need = (v, what) => {
    if (v === undefined) throw new Error(`${armId}: missing ${what}`);
    return v;
  };

  const situations = [0, 1, 2, 3].map((id) => {
    const t = need(
      tables.targets.find((r) => r.block_id === row.block_id && r.situation_id === id),
      `target for situation ${id}`,
    );
    return { id, name: t.name, prob: t.probability, low: t.target_low, high: t.target_high, order: t.display_order };
  });

  const messageRule = [0, 1, 2, 3].map(
    (s) => need(tables.messageRules.find((r) => r.arm_id === armId && r.situation_id === s), `message rule ${s}`).message_id,
  );

  const forward = {};
  for (const m of MARKETS)
    forward[m] = [0, 1, 2, 3].map(
      (sent) =>
        need(
          tables.forwardingRules.find((r) => r.arm_id === armId && r.market === m && r.original_message_id === sent),
          `forwarding ${m}/${sent}`,
        ).delivered_message_id,
    );

  const programmed = [0, 1, 2, 3].map((s) =>
    [0, 1, 2, 3].map(
      (rcv) =>
        need(
          tables.opponentShipments.find((r) => r.arm_id === armId && r.situation_id === s && r.received_message_id === rcv),
          `programmed shipment ${s}/${rcv}`,
        ).shipment,
    ),
  );

  return {
    id: armId,
    block: row.block_id,
    forwarding: row.forwarding, // "unchanged" | "selective"
    recommend: row.recommendation_on === 1,
    zL: row.z_L,
    zH: row.z_H,
    p: row.p,
    b: row.b,
    q: row.q,
    gamma: row.gamma,
    c: row.c,
    base: row.base_points,
    min: row.action_min,
    max: row.action_max,
    situations, // indexed by situation/message id
    displayOrder: [...situations].sort((a, b) => a.order - b.order).map((s) => s.id),
    messageRule, // situation id -> message id (the AI suggestion, and the programmed partner's report)
    forward, // market -> sent id -> delivered id
    programmed, // programmed partner: its situation -> message it received -> its shipment
  };
}

// True when this arm's forwarding table changes at least one message.
export const forwardingChangesAnything = (arm) =>
  MARKETS.some((m) => arm.forward[m].some((d, sent) => d !== sent));

// ---------------------------------------------------------------- the round

export const target = (arm, situation, market) => arm.situations[situation][market];
export const situationName = (arm, id) => arm.situations[id].name;

export function drawMarket(arm, rand = Math.random) {
  return rand() < arm.p ? "high" : "low";
}

export function drawSituation(arm, rand = Math.random) {
  let u = rand();
  for (const s of arm.situations) {
    u -= s.prob;
    if (u < 0) return s.id;
  }
  return arm.situations.length - 1;
}

export const forwardMessage = (arm, market, sent) => (arm.forwarding === "unchanged" ? sent : arm.forward[market][sent]);
export const suggestion = (arm, situation) => (arm.recommend ? arm.messageRule[situation] : null);

// Both reports go through the same forwarding rule (spec Sec 3).
export const forwardBoth = (arm, market, sent, partnerSent) => ({
  toPartner: forwardMessage(arm, market, sent),
  fromPartner: forwardMessage(arm, market, partnerSent),
});

// ---------------------------------------------------------------- programmed partner
// Spec Sec 4: it reports by the arm's message rule, before reading anything,
// then ships by lookup on the message delivered to it.

export const programmedMessage = (arm, situation) => arm.messageRule[situation];
export const programmedShipment = (arm, situation, received) => arm.programmed[situation][received];

// Everything that follows from the player's report when the partner is programmed.
export function playProgrammedPartner(arm, { market, partnerSituation, sent }) {
  const partnerSent = programmedMessage(arm, partnerSituation);
  const { toPartner, fromPartner } = forwardBoth(arm, market, sent, partnerSent);
  return { partnerSent, toPartner, fromPartner, partnerShip: programmedShipment(arm, partnerSituation, toPartner) };
}

// ---------------------------------------------------------------- points

// The two point losses, shown separately on the results screen.
export const targetLoss = (arm, a, d) => arm.c * (1 - arm.gamma) * (a - d) ** 2;
export const partnerLoss = (arm, a, aPartner) => arm.c * arm.gamma * (a - aPartner) ** 2;

// Spec Sec 2: actual points.
export const points = (arm, a, d, aPartner) => arm.base - targetLoss(arm, a, d) - partnerLoss(arm, a, aPartner);

// Spec Sec 2: calculator points, averaged over the market at the configured p.
export function expectedPoints(arm, a, situation, guess) {
  const dL = target(arm, situation, "low");
  const dH = target(arm, situation, "high");
  const miss = (1 - arm.p) * (a - dL) ** 2 + arm.p * (a - dH) ** 2;
  return arm.base - arm.c * ((1 - arm.gamma) * miss + arm.gamma * (a - guess) ** 2);
}

// The shipment that maximizes expected points for a given guess.
export function bestExpected(arm, situation, guess) {
  const dMean = (1 - arm.p) * target(arm, situation, "low") + arm.p * target(arm, situation, "high");
  return (1 - arm.gamma) * dMean + arm.gamma * guess;
}

export const clampShip = (arm, a) => Math.max(arm.min, Math.min(arm.max, Math.round(a)));

// ---------------------------------------------------------------- formatting

// "+7", "−21", "0"; digits = decimals to keep (trailing zeros dropped).
export function formatCrates(a, digits = 0) {
  const r = Number(Math.abs(a).toFixed(digits));
  if (r === 0) return "0";
  return `${a > 0 ? "+" : "−"}${r}`;
}
export const formatPoints = (pts) => pts.toFixed(2);
export const formatDollars = (d) => `$${d.toFixed(2)}`;
export const pct = (x) => `${Math.round(x * 100)}%`;
// A loss coefficient like 0.0004, without float noise.
export const formatCoef = (x) => String(Number(x.toPrecision(6)));
