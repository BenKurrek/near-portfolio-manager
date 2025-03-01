/**
 * Compresses a public key.
 * @param pubKey - Public key buffer.
 * @returns Compressed public key buffer.
 */
export function compressPublicKey(pubKey: Buffer): Buffer {
  if (pubKey.length === 64) {
    pubKey = Buffer.concat([Buffer.from([0x04]), pubKey]);
  }

  if (pubKey.length === 65 && pubKey[0] === 0x04) {
    const x = pubKey.slice(1, 33);
    const y = pubKey.slice(33, 65);
    const prefix = y[y.length - 1] % 2 === 0 ? 0x02 : 0x03;
    return Buffer.concat([Buffer.from([prefix]), x]);
  }

  if (pubKey.length === 33 && (pubKey[0] === 0x02 || pubKey[0] === 0x03)) {
    return pubKey;
  }

  throw new Error("Invalid public key format");
}
