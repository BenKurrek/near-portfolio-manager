// src/utils/keyUtils.ts

import { KeyPair } from "near-api-js";

/**
 * Generates a new ED25519 key pair.
 */
export function generateKeyPair(): KeyPair {
  return KeyPair.fromRandom("ed25519");
}
