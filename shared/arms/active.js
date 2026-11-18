// The parameter blocks in use. Each block has 4 arms (forwarding unchanged/selective ×
// AI suggestion off/on). The 1-player page picks among these when ?arm= is missing,
// and scripts/build-arms.mjs makes Empirica treatments only for these.
// Pilot: B019 and B185 (8 arms). Planned later: B111, B284.
export const ACTIVE_BLOCKS = ["B019", "B185"];
