// The supplied arm tables, parsed. Works in the browser and on the Empirica server.
import { armIds, buildArm, parseCsv } from "../rules.js";
import { ACTIVE_BLOCKS } from "./active.js";
import { CSV } from "./tables.js";

export const TABLES = Object.fromEntries(Object.entries(CSV).map(([k, text]) => [k, parseCsv(text)]));
export const ARM_IDS = armIds(TABLES);
// The arms in use (shared/arms/active.js): participants are spread over these.
export const ACTIVE_ARM_IDS = TABLES.arms.filter((a) => ACTIVE_BLOCKS.includes(a.block_id)).map((a) => a.arm_id);
export { ACTIVE_BLOCKS };

const cache = new Map();
// One arm with every rule it needs; throws on an unknown id.
export function loadArm(id) {
  if (!cache.has(id)) cache.set(id, buildArm(TABLES, id));
  return cache.get(id);
}
