import { RawQuote } from "@src/components/Dashboard/BuyBundleModal";
import { configureNetwork } from "@src/utils/config";
import { randomBytes } from "node:crypto";

export type WithdrawMemo = `WITHDRAW_TO:${string}`;
export type NearIntent = {
  signer_id: string;
  verifying_contract: "intents.near";
  deadline: string | null;
  nonce: string;
  intents: {
    intent: "ft_withdraw" | "token_diff";
    // token address
    token?: string;
    // Set to token address for ft_withdraws
    receiver_id?: string;
    amount?: string;
    memo?: WithdrawMemo;
    diff?: {
      [key: string]: string;
    };
  }[];
};

export const fetchDepositAddress = async (
  activeTab: "Solana" | "EVM" | "bitcoin",
  accountId: string
) => {
  let chain;

  if (activeTab === "Solana") {
    chain = "sol:mainnet";
  } else if (activeTab === "EVM") {
    chain = "eth:8453";
  } else if (activeTab === "bitcoin") {
    chain = "btc:mainnet";
  } else {
    throw new Error("Invalid activeTab");
  }

  const reqData = {
    jsonrpc: "2.0",
    id: 1,
    method: "deposit_address",
    params: [
      {
        account_id: accountId,
        chain,
      },
    ],
  };

  const res = await fetch("https://bridge.chaindefuser.com/rpc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqData),
  });

  const data = await res.json();
  return data.result.address;
};

export const prepareSwapIntent = async ({
  providerQuotes,
  nearIntentsAddress,
}: {
  providerQuotes: RawQuote[];
  nearIntentsAddress: string;
}): Promise<{ intents: NearIntent; quoteHashes: string[] }> => {
  const config = configureNetwork("mainnet");
  const nonce = await generateNonce(nearIntentsAddress, config.nearNodeURL);

  // Aggregate amounts per token using BigInt arithmetic.
  // For each quote, subtract the amount_in (token sent) and add the amount_out (token received).
  const aggregatedDiff: Record<string, bigint> = {};
  for (const quote of providerQuotes) {
    const assetIn = quote.defuse_asset_identifier_in;
    const assetOut = quote.defuse_asset_identifier_out;
    aggregatedDiff[assetIn] =
      (aggregatedDiff[assetIn] || BigInt(0)) - BigInt(quote.amount_in);
    aggregatedDiff[assetOut] =
      (aggregatedDiff[assetOut] || BigInt(0)) + BigInt(quote.amount_out);
  }

  // Convert the aggregated BigInt amounts into strings.
  // Negative numbers will naturally include a '-' prefix.
  const tokenDiff: Record<string, string> = {};
  for (const [asset, amount] of Object.entries(aggregatedDiff)) {
    tokenDiff[asset] = amount.toString();
  }

  // Determine the earliest expiration time from the quotes (as the deadline)
  const earliestQuote = providerQuotes.reduce((acc, quote) =>
    Number(quote.expiration_time) < Number(acc.expiration_time) ? quote : acc
  );

  // Build the message payload
  return {
    intents: {
      signer_id: nearIntentsAddress.toLowerCase(),
      deadline: earliestQuote.expiration_time,
      nonce,
      verifying_contract: "intents.near",
      intents: [
        {
          intent: "token_diff",
          diff: tokenDiff,
        },
      ],
    },
    quoteHashes: providerQuotes.map((quote) => quote.quote_hash),
  };
};

export async function generateNonce(
  signerId: string,
  nearRpcUrl: string
): Promise<string> {
  let maxRetries = 1000;
  while (maxRetries--) {
    const nonceString = randomBytes(32).toString("base64");
    const isUsed = await isNonceUsed(nonceString, signerId, nearRpcUrl);

    if (!isUsed) {
      return nonceString;
    }
  }
  throw new Error("Failed to generate nonce");
}

async function isNonceUsed(
  nonce: string,
  signerId: string,
  nearRpcUrl: string
) {
  const args = JSON.stringify({
    nonce,
    account_id: signerId.toLowerCase(),
  });
  // @ts-ignore
  const argsBase64 = Buffer.from(args).toString("base64");

  const reqData = {
    jsonrpc: "2.0",
    id: "dontcare",
    method: "query",
    params: {
      request_type: "call_function",
      finality: "final",
      account_id: "intents.near",
      method_name: "is_nonce_used",
      args_base64: argsBase64,
    },
  };
  const res = await fetch(nearRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reqData),
  });

  const data: any = await res.json();
  // @ts-ignore
  const result = JSON.parse(Buffer.from(data.result.result).toString("utf-8"));
  return result;
}

// src/intentUtils/postToNetwork.ts

/**
 * A generic function that does the actual fetch.
 */
export async function postToNetwork({
  url,
  methodName,
  args,
}: {
  url: string;
  methodName: string;
  args: Record<string, unknown>;
}) {
  const reqData = {
    jsonrpc: "2.0",
    id: "dontcare",
    method: methodName,
    params: [args],
  };

  const res = await withTimeout(
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqData),
    }),
    5000 // 5 seconds
  );
  return res;
}

/**
 * A generic function for GET requests to an arbitrary URL with optional query params.
 */
export async function getFromNetwork({
  baseUrl,
  args = undefined,
}: {
  baseUrl: string;
  args?: Record<string, unknown>;
}) {
  const stringifiedArgs = args
    ? Object.fromEntries(
        Object.entries(args).map(([key, value]) => [
          key,
          typeof value === "object" ? JSON.stringify(value) : String(value),
        ])
      )
    : undefined;

  const url = stringifiedArgs
    ? `${baseUrl}?${new URLSearchParams(stringifiedArgs).toString()}`
    : baseUrl;

  const res = await withTimeout(
    fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }),
    5000 // 5 seconds
  );
  return res;
}

/**
 * Create a specialized function for solver relay calls,
 * using the user’s solverRelayUrl.
 */
export function createSolverRelayPoster(solverRelayUrl: string) {
  return async function postToSolverRelay({
    methodName,
    args,
  }: {
    methodName: string;
    args: Record<string, unknown>;
  }) {
    return postToNetwork({
      url: solverRelayUrl,
      methodName,
      args,
    });
  };
}

/**
 * Similarly for the PoA bridge
 */
export function createPoABridgePoster(poaBridgeUrl: string) {
  return async function postToPoABridge({
    methodName,
    args,
  }: {
    methodName: string;
    args: Record<string, unknown>;
  }) {
    return postToNetwork({
      url: poaBridgeUrl,
      methodName,
      args,
    });
  };
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    ),
  ]);
}
