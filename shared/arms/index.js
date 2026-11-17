// The supplied arm tables, parsed. Works in the browser and on the Empirica server.
import { armIds, buildArm, parseCsv } from "../rules.js";
import { CSV } from "./tables.js";

export const TABLES = Object.fromEntries(Object.entries(CSV).map(([k, text]) => [k, parseCsv(text)]));
export const ARM_IDS = armIds(TABLES);

const cache = new Map();
// One arm with every rule it needs; throws on an unknown id.
export function loadArm(id) {
  if (!cache.has(id)) cache.set(id, buildArm(TABLES, id));
  return cache.get(id);
}
