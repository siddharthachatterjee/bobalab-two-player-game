// The browser's side of shared/secure.js. Each player's private key stays in
// this browser (localStorage); only the public key goes into Empirica.
import { useEffect, useState } from "react";
import { newKeyPair, open, seal, sharedKey } from "../../../shared/secure.js";

const storageKey = () => `crate-factory-key:${new URLSearchParams(window.location.search).get("participantKey") || ""}`;

function loadPair() {
  try {
    return JSON.parse(localStorage.getItem(storageKey()));
  } catch {
    return null;
  }
}

const samePublic = (a, b) => Boolean(a && b) && a.x === b.x && a.y === b.y;

// Makes sure this browser holds the private key for the player's published public key.
// If the stored key is gone (new browser, cleared storage), it publishes a new one;
// the server then re-seals what the player should see.
let pending = null;
export function ensurePlayerKey(player) {
  const pair = loadPair();
  if (pair && samePublic(pair.publicJwk, player.get("pubKey"))) return Promise.resolve(pair);
  if (pair && !player.get("pubKey")) {
    player.set("pubKey", pair.publicJwk);
    return Promise.resolve(pair);
  }
  pending ??= newKeyPair().then((fresh) => {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(fresh));
    } catch {
      // Storage blocked: the key lives for this page only.
    }
    player.set("pubKey", fresh.publicJwk);
    return fresh;
  });
  return pending;
}

// The AES key this player shares with the server, once both keys are known.
export function useServerKey(player, serverPublicJwk) {
  const [key, setKey] = useState(null);
  const pub = player.get("pubKey");
  useEffect(() => {
    let live = true;
    if (!serverPublicJwk) return;
    ensurePlayerKey(player)
      .then((pair) => sharedKey(pair.privateJwk, serverPublicJwk))
      .then((k) => live && setKey(k))
      .catch((e) => console.error("[crate-factory] key", e));
    return () => {
      live = false;
    };
  }, [serverPublicJwk?.x, pub?.x]);
  return key;
}

// A sealed attribute, opened. undefined until it arrives and decrypts.
export function useOpened(key, sealed) {
  const [value, setValue] = useState(undefined);
  useEffect(() => {
    let live = true;
    setValue(undefined);
    if (key && sealed) {
      open(key, sealed)
        .then((v) => live && setValue(v))
        .catch(() => console.warn("[crate-factory] could not open a sealed value; waiting for a re-seal"));
    }
    return () => {
      live = false;
    };
  }, [key, sealed]);
  return value;
}

export { seal };
