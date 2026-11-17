import { test } from "node:test";
import assert from "node:assert/strict";
import { newKeyPair, open, seal, sharedKey } from "./secure.js";

test("a player and the server derive the same key; the partner cannot", async () => {
  const server = await newKeyPair();
  const north = await newKeyPair();
  const south = await newKeyPair();

  const serverToNorth = await sharedKey(server.privateJwk, north.publicJwk);
  const northFromServer = await sharedKey(north.privateJwk, server.publicJwk);
  const sealed = await seal(serverToNorth, { situation: 1, market: "high" });

  assert.deepEqual(await open(northFromServer, sealed), { situation: 1, market: "high" });
  // South knows both public keys but not North's or the server's private key.
  const southGuess = await sharedKey(south.privateJwk, server.publicJwk);
  await assert.rejects(open(southGuess, sealed));
});

test("sealing the same value twice gives different text", async () => {
  const a = await newKeyPair();
  const k = await sharedKey(a.privateJwk, a.publicJwk);
  assert.notEqual(await seal(k, 1), await seal(k, 1));
});

test("tampered text is rejected", async () => {
  const a = await newKeyPair();
  const k = await sharedKey(a.privateJwk, a.publicJwk);
  const s = await seal(k, { x: 1 });
  const bad = s.slice(0, -4) + (s.endsWith("AAAA") ? "BBBB" : "AAAA");
  await assert.rejects(open(k, bad));
});
