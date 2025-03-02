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
import {
  getIntentTxnHash,
  GetIntentTxnHashResult,
  IntentStatusResponse,
} from "@src/utils/helpers/nearIntents";

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

  // 3) Create job with 4 steps
  const jobId = await createJob(
    "buy-bundle",
    [
      { name: "Build Intent", status: "pending" },
      { name: "Fetch MPC Signature", status: "pending" },
      { name: "Send Transaction", status: "pending" },
      { name: "Wait for Swap", status: "pending" },
    ],
    user.id
  );

  res.status(200).json({
    success: true,
    message: "Buy bundle job started",
    jobId,
  });

  (async () => {
    try {
      // Step 1: Build Intent
      await updateJobStep(jobId, "Build Intent", "in-progress");
      const { intents, quoteHashes } = await prepareSwapIntent({
        providerQuotes: quoteData.rawQuotes,
        nearIntentsAddress: user.nearIntentsAddress.toLowerCase(),
      });
      await updateJobStep(jobId, "Build Intent", "completed");

      // Step 2: Fetch MPC Signature
      await updateJobStep(jobId, "Fetch MPC Signature", "in-progress");
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

      // Build portfolio mapping
      const mapping: Record<string, number> = {};
      const len = Math.min(quoteData.rawQuotes.length, quoteData.tokens.length);
      for (let i = 0; i < len; i++) {
        const assetIdOut = quoteData.rawQuotes[i].defuse_asset_identifier_out;
        // Multiply by 100 so that 10% (10) becomes 1000
        mapping[assetIdOut] = quoteData.tokens[i].percentage * 100;
      }

      // Ensure portfolio exists
      const userInfo = await userAccount!.viewFunction({
        contractId,
        methodName: "get_user_info",
        args: {
          user_id: userAccount?.accountId,
        },
      });
      if (!userInfo) {
        await userAccount!.functionCall({
          contractId,
          methodName: "create_portfolio",
          args: {
            agent_id: agentAccount.accountId,
            near_intents_address: user.nearIntentsAddress,
            portfolio_data: mapping,
          },
          gas: BigInt("300000000000000"),
          attachedDeposit: BigInt("1"),
        });
      }

      // Create the Ethereum-specific message hash and request MPC signature
      const intentsMessage = JSON.stringify(intents);
      const prefix = `\x19Ethereum Signed Message:\n${intentsMessage.length}`;
      const prefixedMessage = prefix + intentsMessage;
      const encoded = new TextEncoder().encode(prefixedMessage);
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
      const formattedSignature = convertMpcSignatureToSecp256k1(signatures);
      const signedData = {
        standard: "erc191",
        payload: JSON.stringify(intents),
        signature: formattedSignature,
      };
      await updateJobStep(jobId, "Fetch MPC Signature", "completed");

      // Step 3: Send Transaction
      await updateJobStep(jobId, "Send Transaction", "in-progress");
      const response = await postToNetwork({
        url: "https://solver-relay-v2.chaindefuser.com/rpc",
        methodName: "publish_intent",
        args: {
          signed_data: signedData,
          quote_hashes: quoteHashes,
        },
      });
      const res = await response.json();
      console.log("Publish Intent Response: ", res);
      const body: IntentStatusResponse = res.result;
      console.log("Intent status: ", body);
      await updateJobStep(jobId, "Send Transaction", "completed");

      // Step 4: Wait for Swap (Polling until complete)
      await updateJobStep(jobId, "Wait for Swap", "in-progress");

      // Extract intent hash from the response. Adjust based on your API's actual response.
      const intentHash = body.intent_hash;
      if (!intentHash) {
        throw new Error("No intent hash returned from publish_intent response");
      }

      // Define a helper to post to the solver-relay.
      const solverRelayPoster = async ({
        methodName,
        args,
      }: {
        methodName: string;
        args: Record<string, unknown>;
      }): Promise<Response> => {
        return await postToNetwork({
          url: "https://solver-relay-v2.chaindefuser.com/rpc",
          methodName,
          args,
        });
      };

      // Poll until the intent transaction hash is available
      const MAX_ATTEMPTS = 30;
      const POLL_INTERVAL_MS = 2000;
      let swapStatus: GetIntentTxnHashResult = {
        status: "PENDING",
        hash: null,
      };
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        swapStatus = await getIntentTxnHash(intentHash, solverRelayPoster);
        if (swapStatus.status === "COMPLETE") {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
      if (swapStatus.status !== "COMPLETE") {
        throw new Error("Swap not completed within expected time.");
      }
      await updateJobStep(jobId, "Wait for Swap", "completed");

      return res.status(200).json({
        success: true,
        message: "Buy bundle completed",
        jobId,
        transactionHash: swapStatus.hash,
      });
    } catch (err: any) {
      console.error("buy-bundle error:", err);
      // Update the "Wait for Swap" step as failed (or adjust based on where the error occurred)
      await updateJobStep(jobId, "Wait for Swap", "failed", err.message);
      return res
        .status(500)
        .json({ success: false, message: err.message, jobId });
    }
  })();
}
