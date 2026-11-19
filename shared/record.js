// One round as a data row, the same in both versions. `r` is a round in the
// player's point of view (see shared/rules.js) plus what the screens report.

export function roundRecord(r) {
  return {
    round: r.n,
    practice: r.practice,
    market: r.market,
    situation: r.situation,
    suggestion: r.suggestion,
    sent: r.sent,
    sentAuto: r.sentAuto ?? false, // filled in by the program after a timeout (2-player)
    truthful: r.sent === r.situation,
    followedSuggestion: r.suggestion === null || r.suggestion === undefined ? null : r.sent === r.suggestion,
    toPartner: r.toPartner,
    partnerSituation: r.partnerSituation,
    partnerSent: r.partnerSent,
    fromPartner: r.fromPartner,
    partnerShip: r.partnerShip,
    ship: r.ship,
    shipAuto: r.shipAuto ?? false,
    guess: r.guess,
    guessTouched: r.guessTouched,
    shipTouched: r.shipTouched,
    chartUses: r.chartUses,
    expectedCostAtShip: r.expectedCostAtShip,
    target: r.target,
    cost: r.cost, // what the player saw (lower is better)
    points: r.points, // the spec's points, same ranking: base − c·COST_SCALE·cost
    secSend: r.secSend,
    secShip: r.secShip,
    helpSend: r.helpSend,
    helpShip: r.helpShip,
  };
}

// Rounds numbers to 4 decimals to keep exported data small.
export const roundNumbers = (data) =>
  JSON.parse(JSON.stringify(data, (k, v) => (typeof v === "number" ? Math.round(v * 1e4) / 1e4 : v)));

// The arm's parameters without its lookup tables, for the data header.
export function armSummary(arm) {
  const { situations, displayOrder, messageRule, forward, programmed, ...params } = arm;
  return params;
}
