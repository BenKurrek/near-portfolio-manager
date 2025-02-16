// src/pages/api/auth/user/buy-bundle.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@src/db";
import { getSession } from "@api-utils/sessions";
import { createJob, updateJobStep } from "@api-utils/jobs";
import { generateAgentKeyPairFromTurnKey } from "@api-utils/crypto";
import { configureNetwork } from "@src/utils/config";
import { initNearConnection } from "@src/utils/services/contractService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  const { token, bundleId, amount } = req.body;
  if (!token || !bundleId || !amount) {
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
    include: { portfolios: true },
  });
  if (!user || !user.portfolios?.length || !user.sudoKey) {
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

    const networkId = process.env.NEXT_PUBLIC_APP_NETWORK_ID || "testnet";
    const config = configureNetwork(networkId as "testnet" | "mainnet");

    const { agentKeyPair, publicKey } = generateAgentKeyPairFromTurnKey(
      user.sudoKey
    );
    const near2 = await initNearConnection(networkId, config.nearNodeURL, {
      [publicKey]: agentKeyPair,
    });
    const agentAccount = await near2.account(publicKey);
    const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID!;

    // Example token diff – adjust according to your business logic
    const diff = {
      USDC: -amount,
      ETH: 25,
      PEPE: 25,
    };

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
