// Sealed values for the 2-player game.
//
// Empirica 1.12 sends every attribute in a game to every player in it, even
// with { private: true }. So anything a player must not see yet is sealed:
// AES-GCM with a key from ECDH (P-256) between that player's browser and the
// server. Only public keys are ever stored in Empirica. Works with WebCrypto in
// the browser and in Node 20+.

const subtle = () => globalThis.crypto.subtle;
const ECDH = { name: "ECDH", namedCurve: "P-256" };
const AES = { name: "AES-GCM", length: 256 };

// A new key pair, as JWKs (plain JSON, storable).
export async function newKeyPair() {
  const pair = await subtle().generateKey(ECDH, true, ["deriveKey"]);
  return {
    publicJwk: await subtle().exportKey("jwk", pair.publicKey),
    privateJwk: await subtle().exportKey("jwk", pair.privateKey),
  };
}

// The AES key two parties share: my private key + their public key.
export async function sharedKey(privateJwk, publicJwk) {
  const priv = await subtle().importKey("jwk", privateJwk, ECDH, false, ["deriveKey"]);
  const pub = await subtle().importKey("jwk", publicJwk, ECDH, false, []);
  return subtle().deriveKey({ name: "ECDH", public: pub }, priv, AES, false, ["encrypt", "decrypt"]);
}

const toB64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Any JSON value -> "iv.ciphertext" (base64), readable only with the same key.
export async function seal(key, value) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const ct = await subtle().encrypt({ name: "AES-GCM", iv }, key, data);
  return `${toB64(iv)}.${toB64(ct)}`;
}

// Throws if the key is wrong or the text was changed.
export async function open(key, sealed) {
  const [iv, ct] = sealed.split(".").map(fromB64);
  const data = await subtle().decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(data));
}
