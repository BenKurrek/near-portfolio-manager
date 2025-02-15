import { randomBytes } from "crypto";
import { Keypair } from "@solana/web3.js";
import { default as bs58 } from "bs58";
import { default as nacl } from "tweetnacl";
import { configureNetwork } from "@utils/config";

// src/utils/helpers/nearIntents.ts
export async function fetchBatchBalances(
  nodeUrl: string,
  depositAddress: string,
  tokenIds: string[]
): Promise<string[]> {
  try {
    const args_base64 = btoa(
      JSON.stringify({
        account_id: depositAddress,
        token_ids: tokenIds,
      })
    );

    const reqData = {
      jsonrpc: "2.0",
      id: "dontcare",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: "intents.near", // or your real contract ID
        method_name: "mt_batch_balance_of",
        args_base64,
      },
    };

    const res = await fetch(nodeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reqData),
    });
    const data = await res.json();
    const raw = data.result?.result;
    if (!raw) return tokenIds.map(() => "0");

    const decodedString = Buffer.from(raw).toString("utf-8");
    const balances = JSON.parse(decodedString);
    // Expect an array of strings
    return balances;
  } catch (error) {
    console.error("Error in fetchBatchBalances:", error);
    return tokenIds.map(() => "0");
  }
}

/**
 * Estimate fee based on current fee rates and transaction size.
 * @param baseFeeRate - Fee rate in satoshis per byte.
 * @returns NEAR Intents eposit address.
 */
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

export interface Quote {
  amount_in: string;
  amount_out: string;
  defuse_asset_identifier_in: string;
  defuse_asset_identifier_out: string;
  expiration_time: string;
  quote_hash: string;
}
export const fetchQuote = async ({
  defuse_asset_identifier_in,
  defuse_asset_identifier_out,
  exact_amount_in,
  min_deadline_ms = 120000,
}: {
  defuse_asset_identifier_in: string;
  defuse_asset_identifier_out: string;
  exact_amount_in: string;
  min_deadline_ms?: number;
}): Promise<Quote[] | null> => {
  console.log("fetching quote");
  console.log("defuse_asset_identifier_in: ", defuse_asset_identifier_in);
  console.log("defuse_asset_identifier_out: ", defuse_asset_identifier_out);
  console.log("exact_amount_in: ", exact_amount_in);
  const reqData = {
    jsonrpc: "2.0",
    id: "dontcare",
    method: "quote",
    params: [
      {
        defuse_asset_identifier_in,
        defuse_asset_identifier_out,
        exact_amount_in,
        min_deadline_ms,
      },
    ],
  };

  const res = await postToSolverRelay2(reqData);
  const data = await res.json();
  return data.result;
};

/**
 * Helper function to construct swap or withdraw intents. If withdrawl address is provided, funds will settle there.
 * @param defuse_asset_identifier_in - Asset input, ex: "nep141:base.omft.near".
 * @param defuse_asset_identifier_out - Asset output, ex: "nep141:btc.omft.near".
 * @param amount_in - Amount of tokens input, from quote.
 * @param amount_out - Amount of tokens output, from quote.
 * @param deadline - Deadline for the transaction, from quote.
 * @param signer - Signer account secret key, to be changed to public key.
 * @param quote_hash - Hash of the quote.
 * @param withdraw_address - OPTIONAL, address to withdraw to.
 * @returns Signed Data minus signature, intents message (TO BE SIGNED) and quote hashes, must add signature to publish intent.
 */
export const prepareIntent = async ({
  defuse_asset_identifier_in,
  defuse_asset_identifier_out,
  amount_in,
  amount_out,
  deadline,
  signer,
  quote_hash,
  withdraw_address = undefined,
}: {
  defuse_asset_identifier_in: string;
  defuse_asset_identifier_out: string;
  amount_in: string;
  amount_out: string;
  deadline: string;
  signer: string;
  quote_hash: string;
  withdraw_address?: string;
}) => {
  const signer_id = generateSolAddress(signer);
  const nonce = await generateNonce(signer_id);
  const actual_intents: any[] = [
    {
      // Simple single asset swap
      intent: "token_diff",
      diff: {
        [`${defuse_asset_identifier_in}`]: `-${amount_in}`,
        [`${defuse_asset_identifier_out}`]: amount_out,
      },
    },
  ];

  if (withdraw_address) {
    // PoA token withdraws should not have nep141 prefix
    let token_address = defuse_asset_identifier_out;
    if (defuse_asset_identifier_out.startsWith("nep141:")) {
      token_address = defuse_asset_identifier_out.split("nep141:")[1];
    }

    actual_intents.push({
      intent: "ft_withdraw",
      token: token_address,
      receiver_id: token_address,
      amount: amount_out,
      memo: `WITHDRAW_TO:${withdraw_address}`,
    });
  }

  const intents = {
    signer_id,
    verifying_contract: "intents.near",
    deadline,
    nonce,
    intents: actual_intents,
  };

  // Sign the stringified intents
  const intents_message = JSON.stringify(intents);
  // Get Solana Address: Base58 Public Key
  const rawPublicKey = hexToBytes(signer_id);
  const public_key = bs58.encode(rawPublicKey);

  // Construct final signed data
  const signed_data = {
    standard: "raw_ed25519",
    payload: intents_message,
    public_key: `ed25519:${public_key}`,
  };
  let quote_hashes = [quote_hash];

  return {
    signed_data,
    intents_message,
    quote_hashes,
  };
};

/**
 * Helper function to swap or withdraw tokens to vault. If withdrawl address is provided, funds will settle there.
 * @param quote_hashes - Array of quote hashes.
 * @param signed_data - Signed data minus signature and quote hashes, must add signature to publish intent.
 * @returns Intent Hash of the published intent.
 */
export const publishIntent = async ({
  quote_hashes,
  signed_data,
  signature,
}: {
  quote_hashes: string[];
  signed_data: any;
  signature: string;
}) => {
  const reqData = {
    jsonrpc: "2.0",
    id: "dontcare",
    method: "publish_intent",
    params: [
      {
        quote_hashes,
        signed_data: {
          ...signed_data,
          signature: `ed25519:${signature}`,
        },
      },
    ],
  };
  console.log("publish req: ", reqData);

  const res = await postToSolverRelay2(reqData);
  console.log("swap res: ", res);
  const data = await res.json();
  console.log("swap data: ", data);
  return data.result.intent_hash;
};

export const getIntentStatus = async (intent_hash: string) => {
  const reqData = {
    jsonrpc: "2.0",
    id: "dontcare",
    method: "get_status",
    params: [{ intent_hash }],
  };
  const res = await postToSolverRelay2(reqData);
  const data = await res.json();
  console.log("data: ", data);

  const result = data.result;
  return { status: result.status, hash: result.intent_hash, data: result.data };
};

export const finalizeIntent = async (intent_hash: string) => {
  // exponential backoff calling getIntentStatus until it returns "finalized"
  let { status, hash } = await getIntentStatus(intent_hash);
  let i = 0;
  while (
    status !== "finalized" ||
    status !== "NOT_FOUND_OR_NOT_VALID_ANYMORE"
  ) {
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** i));
    ({ status, hash } = await getIntentStatus(intent_hash));
    i++;
  }

  return { finalized: status, hash: status ? hash : undefined };
};

export const withdrawFromIntents = async ({
  defuse_asset_identifier_in,
  withdraw_address,
}: {
  defuse_asset_identifier_in: string;
  withdraw_address: string;
}) => {};

export const generateNonce = async (signer_id: string): Promise<string> => {
  while (true) {
    const nonceString = randomBytes(32).toString("base64");
    const isUsed = await isNonceUsed(nonceString, signer_id);
    console.log("nonceString: ", nonceString, "isUsed: ", isUsed);

    if (!isUsed) {
      console.log("nonceString: ", nonceString, "is not used");
      return nonceString;
    }
  }
};
const isNonceUsed = async (nonce: string, signer_id: string) => {
  const args_base64 = btoa(JSON.stringify({ nonce, account_id: signer_id }));
  const nodeUrl = configureNetwork("mainnet").nearNodeURL;

  const reqData = {
    jsonrpc: "2.0",
    id: "dontcare",
    method: "query",
    params: {
      request_type: "call_function",
      finality: "final",
      account_id: "intents.near",
      method_name: "is_nonce_used",
      args_base64,
    },
  };
  const res = await fetch(nodeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqData),
  });

  const data = await res.json();
  const result = JSON.parse(Buffer.from(data.result.result).toString("utf-8"));
  return result;
};

const fetchNearBlockHeight = async () => {
  const reqData = {
    jsonrpc: "2.0",
    id: "dontcare",
    method: "block",
    params: [
      {
        finality: "final",
      },
    ],
  };

  // URL based on network env variable
  const url =
    process.env.NEXT_PUBLIC_APP_NETWORK_ID === "testnet"
      ? "https://rpc.testnet.near.org"
      : "https://rpc.near.org";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqData),
  });
  const data = await res.json();
  return data.result.header.height;
};

export const signMessage = async (keyString: string, message: string) => {
  // Step 1: Remove the `ed25519:` prefix
  if (!keyString.startsWith("ed25519:")) {
    throw new Error(
      'Invalid key format. Expected it to start with "ed25519:".'
    );
  }
  const base58EncodedKey = keyString.slice(8);

  // Step 2: Decode the Base58 private key to raw bytes
  const privateKeyBytes = bs58.decode(base58EncodedKey);

  // Step 3: Convert the message to a Uint8Array
  const messageBytes = new TextEncoder().encode(message);

  // Step 4: Sign the message using the private key
  const signature = nacl.sign.detached(messageBytes, privateKeyBytes);

  // Step 5: Return the signature as a Base58-encoded string
  return bs58.encode(Buffer.from(signature));
};

export const postToSolverRelay2 = async (reqData: any) => {
  const res = await fetch("https://solver-relay-v2.chaindefuser.com/rpc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqData),
  });

  return res;
};

export const generateSolAddress = (userDepositKey: string) => {
  // Convert ed25519 key to hex address
  const base58EncodedKey = userDepositKey.slice(8);
  const keypair = Keypair.fromSecretKey(bs58.decode(base58EncodedKey));
  const address = Array.from(keypair.publicKey.toBytes())
    .map((byte) => byte.toString(16).padStart(2, "0")) // Convert each byte to hex and pad with 0 if needed
    .join(""); // Join all hex bytes into a single string
  return address;
};

// Convert hex string to Uint8Array
function hexToBytes(hex: string) {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return new Uint8Array(bytes);
}
