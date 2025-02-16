// src/pages/api/auth/user/rebalance.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@api-utils/sessions";
import prisma from "@src/db";
import { createJob, updateJobStep } from "@api-utils/jobs";
import {
  generateAgentKeyPairFromTurnKey,
  signEphemeralData,
} from "@api-utils/crypto";
import { configureNetwork } from "@src/utils/config";
import { initNearConnection } from "@src/utils/services/contractService";

/**
 * POST /api/auth/user/rebalance
 * Body: { token: string, newAllocations: Record<string, number> }
 *
 * We'll do a "balance_portfolio" call. Because `balance_portfolio` demands that
 * the caller is an agent, we ensure the user is assigned as an agent for their portfolio.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end(); // Method Not Allowed
  }

  const { token, newAllocations } = req.body;
  if (!token || !newAllocations) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Missing params (token or newAllocations)",
      });
  }

  // 1) Verify session
  const session = await getSession(token);
  if (!session) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired session token" });
  }

  // 2) Fetch user with portfolios
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { portfolios: true },
  });
  if (!user?.portfolios?.length || !user.sudoKey) {
    return res
      .status(400)
      .json({
        success: false,
        message: "No portfolio or missing sudoKey in DB",
      });
  }

  // 3) Create a background job
  const jobId = await createJob(
    "rebalance",
    [
      { name: "Check or Assign Agent", status: "pending" },
      { name: "Balance On-Chain", status: "pending" },
    ],
    user.id
  );

  // 4) Proceed
  try {
    // Step 1: Check or Assign Agent
    await updateJobStep(jobId, "Check or Assign Agent", "in-progress");

    const networkId = process.env.NEXT_PUBLIC_APP_NETWORK_ID || "testnet";
    const config = configureNetwork(networkId as "testnet" | "mainnet");
    const near = await initNearConnection(networkId, config.nearNodeURL);
    const signerAccount = await near.account(
      process.env.NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_ID!
    );
    const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID!;

    const ephemeralPayload = {
      owner_pubkey: generateAgentKeyPairFromTurnKey(user.sudoKey).publicKey,
      nonce: Date.now(),
      portfolio_id: user.portfolios[0].id,
    };
    const signature = await signEphemeralData(ephemeralPayload, user.sudoKey);

    await signerAccount.functionCall({
      contractId,
      methodName: "assign_portfolio_agent",
      args: {
        portolio_data: ephemeralPayload,
        signature,
        agent_pubkey: ephemeralPayload.owner_pubkey,
      },
      gas: BigInt("300000000000000"),
      attachedDeposit: BigInt("0"),
    });

    await updateJobStep(jobId, "Check or Assign Agent", "completed");

    // Step 2: Balance On-Chain
    await updateJobStep(jobId, "Balance On-Chain", "in-progress");

    const { agentKeyPair, publicKey } = generateAgentKeyPairFromTurnKey(
      user.sudoKey
    );
    const near2 = await initNearConnection(networkId, config.nearNodeURL, {
      [publicKey]: agentKeyPair,
    });
    const agentAccount = await near2.account(publicKey);

    const diff: Record<string, number> = {};
    for (const [token, pct] of Object.entries(newAllocations)) {
      diff[token] = pct;
    }

    const defuse_intents = {
      intents: [
        {
          intent: "token_diff",
          diff,
        },
      ],
    };

    await agentAccount.functionCall({
      contractId,
      methodName: "balance_portfolio",
      args: {
        portfolio_id: user.portfolios[0].id,
        defuse_intents,
      },
      gas: BigInt("300000000000000"),
      attachedDeposit: BigInt("1"),
    });

    await updateJobStep(jobId, "Balance On-Chain", "completed");

    return res.status(200).json({ success: true, jobId });
  } catch (error: any) {
    console.error("rebalance error:", error);
    await updateJobStep(jobId, "Balance On-Chain", "failed", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, jobId });
  }
}
