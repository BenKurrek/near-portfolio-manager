// src/services/contractService.ts

import { InMemoryKeyStore } from "near-api-js/lib/key_stores";
import { KeyPair, Near } from "near-api-js";

/**
 * Initializes the NEAR connection.
 * @returns Initialized Near instance.
 */
export async function initNearConnection(
  networkId: string,
  nodeUrl: string
): Promise<Near> {
  const keyStore = new InMemoryKeyStore();
  await keyStore.setKey(
    networkId,
    process.env.NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_ID!,
    //@ts-ignore
    KeyPair.fromString(process.env.NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_KEY!)
  );

  const nearConfig = {
    networkId: networkId,
    nodeUrl,
    keyStore,
  };
  console.log("Near connection initialized: ", nearConfig);
  const near = new Near(nearConfig);
  return near;
}
