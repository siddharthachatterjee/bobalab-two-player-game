// Checks the Study 1 rules against the worked example in arms/SPEC.md
// and checks that every arm loads. Run: node --test shared/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  armIds,
  buildArm,
  expectedPoints,
  forwardingChangesAnything,
  parseCsv,
  points,
  forwardBoth,
  playProgrammedPartner,
  suggestion,
  target,
} from "./rules.js";

const read = (f) => parseCsv(readFileSync(new URL(`./arms/${f}.csv`, import.meta.url), "utf8"));
const tables = {
  arms: read("arms"),
  targets: read("targets"),
  messageRules: read("message_rules"),
  forwardingRules: read("forwarding_rules"),
  opponentShipments: read("opponent_shipments"),
};

test("every arm loads and its targets follow the formula", () => {
  const ids = armIds(tables);
  assert.equal(ids.length, 96);
  for (const id of ids) {
    const arm = buildArm(tables, id);
    const { zL, zH, b, q } = arm;
    const want = [
      [zL + b, zH + b, q / 2],
      [zL - b, zH - b, (1 - q) / 2],
      [-(zL - b), -(zH - b), (1 - q) / 2],
      [-(zL + b), -(zH + b), q / 2],
    ];
    arm.situations.forEach((s, i) => {
      assert.equal(s.low, want[i][0]);
      assert.equal(s.high, want[i][1]);
      assert.ok(Math.abs(s.prob - want[i][2]) < 1e-9);
    });
  }
});

test("SPEC worked example: B019_selective_R1", () => {
  const arm = buildArm(tables, "B019_selective_R1");
  // North: Small increase (1). South: Large increase (0). Market high.
  assert.equal(target(arm, 1, "low"), 5);
  assert.equal(target(arm, 1, "high"), 25);
  assert.equal(suggestion(arm, 1), 0); // "Send Large increase"
  const r = playProgrammedPartner(arm, { market: "high", partnerSituation: 0, sent: 0 });
  assert.equal(r.partnerSent, 0);
  assert.equal(r.toPartner, 0);
  assert.equal(r.fromPartner, 0);
  assert.ok(Math.abs(r.partnerShip - 85) < 1e-9);
  assert.equal(Number(expectedPoints(arm, 35, 1, 45).toFixed(2)), 99.66);
  assert.equal(Number(points(arm, 35, 25, r.partnerShip).toFixed(2)), 98.96);
});

test("SPEC: unchanged forwarding benchmark for South is 69", () => {
  const arm = buildArm(tables, "B019_unchanged_R1");
  assert.equal(forwardingChangesAnything(arm), false);
  const r = playProgrammedPartner(arm, { market: "high", partnerSituation: 0, sent: 0 });
  assert.equal(r.partnerShip, 69);
});

test("selective forwarding maps by market", () => {
  const arm = buildArm(tables, "B019_selective_R0");
  assert.equal(suggestion(arm, 1), null);
  assert.deepEqual(arm.forward.low, [1, 1, 2, 3]);
  assert.deepEqual(arm.forward.high, [0, 0, 3, 3]);
});

test("display order differs from situation id in B251", () => {
  const arm = buildArm(tables, "B251_unchanged_R0");
  assert.deepEqual(arm.displayOrder, [0, 2, 1, 3]);
  assert.equal(arm.situations[1].name, "Small decrease");
});

test("forwardBoth applies the same rule in both directions", () => {
  const arm = buildArm(tables, "B019_selective_R1");
  // North sends Large increase, South sends Small increase, low market.
  assert.deepEqual(forwardBoth(arm, "low", 0, 1), { toPartner: 1, fromPartner: 1 });
  // From South's side the same messages swap places.
  assert.deepEqual(forwardBoth(arm, "low", 1, 0), { toPartner: 1, fromPartner: 1 });
  assert.deepEqual(forwardBoth(arm, "high", 1, 2), { toPartner: 0, fromPartner: 3 });
});
