// src/services/contractService.ts

import { InMemoryKeyStore } from "near-api-js/lib/key_stores";
import { Account, KeyPair, Near } from "near-api-js";
import { KeyPairString } from "near-api-js/lib/utils";

export async function initNearConnection(
  networkId: string,
  nodeUrl: string
): Promise<{
  near: Near;
  agentAccount: Account;
  sponsorAccount: Account;
}> {
  const keyStore = new InMemoryKeyStore();

  await keyStore.setKey(
    networkId,
    process.env.NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_ID!,
    KeyPair.fromString(
      process.env.NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_KEY! as KeyPairString
    )
  );

  await keyStore.setKey(
    networkId,
    process.env.NEXT_AGENT_ACCOUNT_ID!,
    KeyPair.fromString(process.env.NEXT_AGENT_PRIVATE_KEY! as KeyPairString)
  );

  const nearConfig = {
    networkId,
    nodeUrl,
    keyStore,
  };

  const near = new Near(nearConfig);
  const agentAccount = await near.account(process.env.NEXT_AGENT_ACCOUNT_ID!);
  const sponsorAccount = await near.account(
    process.env.NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_ID!
  );

  return {
    near,
    agentAccount,
    sponsorAccount,
  };
}
