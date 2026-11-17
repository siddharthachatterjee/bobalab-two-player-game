// The supplied arm tables (shared/arms/), bundled into the page at build time by Vite.
import arms from "../../shared/arms/arms.csv?raw";
import targets from "../../shared/arms/targets.csv?raw";
import messageRules from "../../shared/arms/message_rules.csv?raw";
import forwardingRules from "../../shared/arms/forwarding_rules.csv?raw";
import opponentShipments from "../../shared/arms/opponent_shipments.csv?raw";
import { parseCsv } from "../../shared/rules.js";

export const TABLES = {
  arms: parseCsv(arms),
  targets: parseCsv(targets),
  messageRules: parseCsv(messageRules),
  forwardingRules: parseCsv(forwardingRules),
  opponentShipments: parseCsv(opponentShipments),
};
