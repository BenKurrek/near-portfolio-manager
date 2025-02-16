// src/pages/api/auth/user/assign-agent.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@src/db";
import { getSession } from "@api-utils/sessions";
import { createJob, updateJobStep } from "@api-utils/jobs";
import {
  signEphemeralData,
  generatePublicKeyFromTurnKey,
} from "@api-utils/crypto";
import { initNearConnection } from "@src/utils/services/contractService";
import { configureNetwork } from "@src/utils/config";

/**
 * POST /api/auth/user/assign-agent
 * Body: { token, agentPubkey: string }
 *
 * We'll ephemeral-sign a `PortfolioAssignPayload` with the user’s `sudoKey`,
 * then call `assign_portfolio_agent`.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { token, agentPubkey } = req.body;
  if (!token || !agentPubkey) {
    return res.status(400).json({ success: false, message: "Missing params" });
  }

  // 1) Validate session
  const session = await getSession(token);
  if (!session) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  // 2) Create the job
  const jobId = await createJob("assign-agent", [
    { name: "Validating Agent", status: "pending" },
    { name: "Linking to Portfolio", status: "pending" },
  ]);

  try {
    await updateJobStep(jobId, "Validating Agent", "in-progress");

    // 3) Fetch user with portfolios
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { portfolios: true },
    });
    if (!user || !user.portfolios?.length || !user.sudoKey) {
      throw new Error("No user portfolio or missing sudoKey");
    }

    // Step 1: ephemeral sign using the user’s sudoKey
    const ephemeralPayload = {
      owner_pubkey: generatePublicKeyFromTurnKey(user.sudoKey),
      nonce: Date.now(),
      portfolio_id: user.portfolios[0].id,
    };
    const signature = await signEphemeralData(ephemeralPayload, user.sudoKey);

    await updateJobStep(jobId, "Validating Agent", "completed");

    // Step 2: Link
    await updateJobStep(jobId, "Linking to Portfolio", "in-progress");

    const networkId = process.env.NEXT_PUBLIC_APP_NETWORK_ID as
      | "testnet"
      | "mainnet";
    const config = configureNetwork(networkId);
    const near = await initNearConnection(networkId, config.nearNodeURL);
    const signerAccount = await near.account(
      process.env.NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_ID!
    );
    const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID!;

    await signerAccount.functionCall({
      contractId,
      methodName: "assign_portfolio_agent",
      args: {
        portolio_data: ephemeralPayload,
        signature,
        agent_pubkey: agentPubkey,
      },
      gas: BigInt("300000000000000"),
      attachedDeposit: BigInt("0"),
    });

    // Optionally track in DB
    await prisma.agent.create({
      data: {
        publicKey: agentPubkey,
        portfolioId: user.portfolios[0].id,
        userId: user.id,
      },
    });

    await updateJobStep(jobId, "Linking to Portfolio", "completed");
    return res.status(200).json({ success: true, jobId });
  } catch (error: any) {
    console.error("assign-agent error:", error);
    await updateJobStep(jobId, "Linking to Portfolio", "failed", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, jobId });
  }
}
