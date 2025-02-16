// src/pages/api/auth/utils/crypto.ts
import bs58 from "bs58";
import nacl from "tweetnacl";
import { KeyPair } from "near-api-js";
import { InMemoryKeyStore } from "near-api-js/lib/key_stores";

/**
 * Parse "ed25519:<base58PrivateKey>" from the sudoKey.
 * Returns a raw 64-byte secret key.
 */
export function parseSudoKeyToBytes(sudoKey: string): Uint8Array {
  if (!sudoKey.startsWith("ed25519:")) {
    throw new Error('sudoKey must start with "ed25519:"');
  }
  const base58PrivateKey = sudoKey.slice(8);
  return bs58.decode(base58PrivateKey);
}

/**
 * Return NEAR-compatible public key string for usage in contract calls.
 * E.g. "ed25519:AbCdEf..."
 */
export function generatePublicKeyFromTurnKey(sudoKey: string): string {
  // We reuse the same function; parameter now is sudoKey.
  const rawSecret = parseSudoKeyToBytes(sudoKey);
  // The first 32 bytes are the secret scalar, last 32 are the public key.
  const keyPair = nacl.sign.keyPair.fromSecretKey(rawSecret);
  const pubBase58 = bs58.encode(keyPair.publicKey);
  return `ed25519:${pubBase58}`;
}

/**
 * Return an object with `agentKeyPair` (a near-api-js KeyPair) and `publicKey`.
 * This is so we can add the user’s key to an InMemoryKeyStore and sign TX as the user.
 */
export function generateAgentKeyPairFromTurnKey(sudoKey: string) {
  const rawSecret = parseSudoKeyToBytes(sudoKey);
  const base58Priv = bs58.encode(rawSecret);
  const agentKeyPair = KeyPair.fromString(`ed25519:${base58Priv}`);
  const pubStr = agentKeyPair.getPublicKey().toString();
  return {
    agentKeyPair,
    publicKey: pubStr,
  };
}

/**
 * On-chain ephemeral signing:
 * Given some data and the user's sudoKey, returns a base64-encoded signature.
 */
export async function signEphemeralData(
  data: any,
  sudoKey: string
): Promise<string> {
  const msg = JSON.stringify(data);
  const msgBytes = new TextEncoder().encode(msg);
  const rawSecret = parseSudoKeyToBytes(sudoKey);

  const signatureBytes = nacl.sign.detached(msgBytes, rawSecret);
  return Buffer.from(signatureBytes).toString("base64");
}

/**
 * Example function to initialize NEAR with a custom key.
 */
import { Near } from "near-api-js";

export async function initNearWithCustomKey(
  networkId: string,
  nodeUrl: string,
  pubKey: string,
  keyPair: KeyPair
): Promise<Near> {
  const keyStore = new InMemoryKeyStore();
  await keyStore.setKey(networkId, pubKey, keyPair);
  const nearConfig = {
    networkId,
    nodeUrl,
    keyStore,
  };
  return new Near(nearConfig);
}
