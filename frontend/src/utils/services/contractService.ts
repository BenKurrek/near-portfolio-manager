// src/services/contractService.ts

import { InMemoryKeyStore } from "near-api-js/lib/key_stores";
import { KeyPair, Near } from "near-api-js";
import { KeyPairString } from "near-api-js/lib/utils";

export async function initNearConnection(
  networkId: string,
  nodeUrl: string,
  extraKeys?: Record<string, KeyPair>
): Promise<Near> {
  const keyStore = new InMemoryKeyStore();

  // Add your platform signer
  await keyStore.setKey(
    networkId,
    process.env.NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_ID!,
    KeyPair.fromString(
      process.env.NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_KEY! as KeyPairString
    )
  );

  // If we’re also passing any agent key(s), store them
  if (extraKeys) {
    for (const [pubKey, keyPair] of Object.entries(extraKeys)) {
      // We can treat the pubKey as an “accountId” for local usage
      await keyStore.setKey(networkId, pubKey, keyPair);
    }
  }

  const nearConfig = {
    networkId,
    nodeUrl,
    keyStore,
  };

  return new Near(nearConfig);
}
