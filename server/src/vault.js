// The server's side of shared/secure.js. The server key pair is kept in a file
// next to Empirica's local data, so sealed values survive a server restart.
import fs from "fs";
import path from "path";
import { newKeyPair, open, seal, sharedKey } from "../../shared/secure.js";

let keys; // Promise<{ publicJwk, privateJwk }>
const derived = new Map(); // public JWK (as JSON) -> AES key shared with the server

export function initVault(dir) {
  keys = (async () => {
    const file = path.join(dir, "crate-factory-server-key.json");
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
    const pair = await newKeyPair();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(pair), { mode: 0o600 });
    return pair;
  })();
}

export const serverPublicKey = async () => (await keys).publicJwk;

async function keyWith(publicJwk) {
  const id = JSON.stringify(publicJwk);
  if (!derived.has(id)) derived.set(id, sharedKey((await keys).privateJwk, publicJwk));
  return derived.get(id);
}

// For one player: only their browser can open it.
export async function sealFor(player, value) {
  const pub = player.get("pubKey");
  if (!pub) throw new Error(`player ${player.id} has no pubKey`);
  return seal(await keyWith(pub), value);
}
export async function openFrom(player, sealed) {
  if (sealed === undefined || sealed === null) return undefined;
  return open(await keyWith(player.get("pubKey")), sealed);
}

// For the server only (e.g. the market before results).
export const sealServer = async (value) => seal(await keyWith(await serverPublicKey()), value);
export const openServer = async (sealed) => open(await keyWith(await serverPublicKey()), sealed);
