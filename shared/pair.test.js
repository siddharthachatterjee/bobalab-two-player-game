// The 2-player round logic, checked against the SPEC.md worked example.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadArm } from "./arms/index.js";
import { drawPairRound, nextTimeouts, resolveSends, resolveShips, startView } from "./pair.js";

const arm = loadArm("B019_selective_R1");
// SPEC worked example: market high, North Small increase (1), South Large increase (0).
const draw = { market: "high", situation: { north: 1, south: 0 } };

test("each player sees only their own situation and the suggestion", () => {
  assert.deepEqual(startView(arm, 1), { situation: 1, suggestion: 0 });
  assert.deepEqual(startView(loadArm("B019_selective_R0"), 1), { situation: 1, suggestion: null });
});

test("both reports go through the forwarding rule, from each side", () => {
  const m = resolveSends(arm, draw, { north: 1, south: 0 });
  // High market: Small increase is delivered as Large increase.
  assert.deepEqual(m.north, { sent: 1, sentAuto: false, toPartner: 0, partnerSent: 0, fromPartner: 0 });
  assert.deepEqual(m.south, { sent: 0, sentAuto: false, toPartner: 0, partnerSent: 1, fromPartner: 0 });
  const low = resolveSends(arm, { ...draw, market: "low" }, { north: 1, south: 0 });
  assert.equal(low.north.fromPartner, 1); // Large increase arrives as Small increase when low
});

test("a missing report is filled in by the programmed rule and flagged", () => {
  const m = resolveSends(arm, draw, { north: undefined, south: 0 });
  assert.equal(m.north.sent, 0); // rule: Small increase -> send Large increase
  assert.equal(m.north.sentAuto, true);
  assert.equal(m.south.partnerSent, 0);
});

test("points match the worked example", () => {
  const m = resolveSends(arm, draw, { north: 0, south: 0 });
  const r = resolveShips(arm, draw, m, { north: 35, south: 85 });
  assert.equal(Number(r.north.points.toFixed(2)), 98.96);
  assert.equal(r.north.target, 25);
  assert.equal(r.north.partnerShip, 85);
  assert.equal(r.south.partnerShip, 35);
  assert.equal(r.south.partnerSituation, 1);
});

test("a missing shipment uses the programmed lookup and is flagged", () => {
  const m = resolveSends(arm, draw, { north: 0, south: 0 });
  const r = resolveShips(arm, draw, m, { north: 35, south: undefined });
  assert.ok(Math.abs(r.south.ship - 85) < 1e-9); // the spec's programmed South shipment
  assert.equal(r.south.shipAuto, true);
  assert.equal(r.north.shipAuto, false);
});

test("shipments are clamped to the arm's bounds", () => {
  const m = resolveSends(arm, draw, { north: 0, south: 0 });
  const r = resolveShips(arm, draw, m, { north: 999, south: -999 });
  assert.equal(r.north.ship, 175);
  assert.equal(r.south.ship, -175);
});

test("draws use the arm's situations and markets", () => {
  const d = drawPairRound(arm, () => 0.05);
  assert.deepEqual(d, { market: "high", situation: { north: 0, south: 0 } });
});

test("timeouts count consecutive misses", () => {
  assert.equal(nextTimeouts(0, false), 1);
  assert.equal(nextTimeouts(1, false), 2);
  assert.equal(nextTimeouts(2, true), 0);
});
