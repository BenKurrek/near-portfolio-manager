// src/pages/api/auth/user/buy-bundle.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@src/db";
import { getSession } from "@api-utils/sessions";
import { createJob, updateJobStep } from "@api-utils/jobs";
import { configureNetwork } from "@src/utils/config";
import { initNearConnection } from "@src/utils/services/contractService";
import { postToNetwork, prepareSwapIntent } from "../utils/intents";
import { BundleQuote } from "@src/components/Dashboard/BuyBundleModal";
import { KeyPairString } from "near-api-js/lib/utils";
import {
  convertMpcSignatureToSecp256k1,
  requestMpcSignature,
} from "../utils/mpc";
import { keccak256 } from "ethers";

// Define an interface for the request body
interface BuyBundleRequestBody {
  token: string;
  bundleId: string;
  quoteData: BundleQuote;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  const { token, bundleId, quoteData } = req.body as BuyBundleRequestBody;
  if (!token || !bundleId || !quoteData) {
    return res
      .status(400)
      .json({ success: false, message: "Missing parameters" });
  }

  // 1) Verify session
  const session = await getSession(token);
  if (!session) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  // 2) Fetch user
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (
    !user ||
    !user.sudoKey ||
    !user.nearIntentsAddress ||
    !user.nearAccountId ||
    !user.evmDepositAddress
  ) {
    return res
      .status(400)
      .json({ success: false, message: "No portfolio or missing sudoKey" });
  }

  // 3) Create job with 3 steps
  const jobId = await createJob(
    "buy-bundle",
    [
      { name: "Approve Funds", status: "pending" },
      { name: "Swap to Bundle", status: "pending" },
      { name: "Update Portfolio", status: "pending" },
    ],
    user.id
  );

  try {
    // Step 1: Approve Funds
    await updateJobStep(jobId, "Approve Funds", "in-progress");
    // (Approval logic omitted)
    await updateJobStep(jobId, "Approve Funds", "completed");

    // Step 2: Swap to Bundle
    await updateJobStep(jobId, "Swap to Bundle", "in-progress");

    const { intents, quoteHashes } = await prepareSwapIntent({
      providerQuotes: quoteData.rawQuotes,
      nearIntentsAddress: user.nearIntentsAddress.toLowerCase(),
    });
    const networkId = process.env.NEXT_PUBLIC_APP_NETWORK_ID! as
      | "mainnet"
      | "testnet";
    const config = configureNetwork(networkId);
    const { agentAccount, userAccount } = await initNearConnection(
      networkId,
      config.nearNodeURL,
      {
        accountId: user.nearAccountId,
        secretKey: user.sudoKey as KeyPairString,
      }
    );
    const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID!;

    const mapping: Record<string, number> = {};
    // Use the smaller length in case the arrays don't match perfectly.
    const len = Math.min(quoteData.rawQuotes.length, quoteData.tokens.length);
    for (let i = 0; i < len; i++) {
      const assetIdOut = quoteData.rawQuotes[i].defuse_asset_identifier_out;
      // Multiply by 100 so that 10% (10) becomes 1000
      mapping[assetIdOut] = quoteData.tokens[i].percentage * 100;
    }
    // await userAccount!.functionCall({
    //   contractId,
    //   methodName: "create_portfolio",
    //   args: {
    //     agent_id: agentAccount.accountId,
    //     near_intents_address: user.nearIntentsAddress,
    //     portfolio_data: mapping,
    //   },
    //   gas: BigInt("300000000000000"),
    //   attachedDeposit: BigInt("1"),
    // });

    // Add the ERC-191 prefix to the message
    const intentsMessage = JSON.stringify(intents);
    const prefix = `\x19Ethereum Signed Message:\n${intentsMessage.length}`;
    const prefixedMessage = prefix + intentsMessage;
    console.log("prefixedMessage: ", prefixedMessage);

    const encoded = new TextEncoder().encode(prefixedMessage);
    // 2. Convert the payload to a UTF-8 byte array & compute a keccak256 hash
    const hash = keccak256(encoded);

    const signatures = await requestMpcSignature({
      signerAccount: agentAccount,
      contractId,
      methodName: "balance_portfolio",
      args: {
        user_portfolio: user.nearAccountId,
        hash,
        defuse_intents: intents,
      },
    });
    console.log("FINAL signatures: ", signatures);

    const formattedSignature = convertMpcSignatureToSecp256k1(signatures);
    const signedData = {
      standard: "erc191",
      payload: JSON.stringify(intents),
      signature: formattedSignature,
    };
    console.log("signedData: ", signedData);

    const response = await postToNetwork({
      url: "https://solver-relay-v2.chaindefuser.com/rpc",
      methodName: "publish_intent",
      args: {
        signed_data: signedData,
        quote_hashes: quoteHashes,
      },
    });
    console.log("response: ", response);
    const body = await response.json();
    console.log("body: ", body);

    await updateJobStep(jobId, "Swap to Bundle", "completed");

    // Step 3: Update Portfolio in DB
    await updateJobStep(jobId, "Update Portfolio", "in-progress");
    // (Any DB logic if needed)
    await updateJobStep(jobId, "Update Portfolio", "completed");

    return res.status(200).json({
      success: true,
      message: "Buy bundle completed",
      jobId,
    });
  } catch (err: any) {
    console.error("buy-bundle error:", err);
    await updateJobStep(jobId, "Swap to Bundle", "failed", err.message);
    return res
      .status(500)
      .json({ success: false, message: err.message, jobId });
  }
}
