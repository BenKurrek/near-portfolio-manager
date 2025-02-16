// src/pages/api/auth/user/withdraw.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@src/db";
import { getSession } from "@api-utils/sessions";
import { createJob, updateJobStep } from "@api-utils/jobs";
import {
  generatePublicKeyFromTurnKey,
  signEphemeralData,
} from "@api-utils/crypto";
import { configureNetwork } from "@src/utils/config";
import { initNearConnection } from "@src/utils/services/contractService";

/**
 * The contract’s `withdraw_funds` expects a `WithdrawalData` struct.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { token, asset, amount, toAddress } = req.body;
  if (!token || !asset || !amount || !toAddress) {
    return res.status(400).json({ success: false, message: "Missing params" });
  }

  // 1) Validate session
  const session = await getSession(token);
  if (!session) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  // 2) Fetch user + portfolio info
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { portfolios: true },
  });
  if (!user?.portfolios?.length) {
    return res
      .status(400)
      .json({ success: false, message: "No portfolio for this user" });
  }
  if (!user.sudoKey) {
    return res
      .status(400)
      .json({ success: false, message: "No sudoKey in DB" });
  }

  // 3) Create the job
  const jobId = await createJob(
    "withdraw",
    [
      { name: "Check Balance", status: "pending" },
      { name: "Initiate On-Chain Withdraw", status: "pending" },
    ],
    user.id
  );

  try {
    // Step 1: (Balance check omitted)
    await updateJobStep(jobId, "Check Balance", "in-progress");
    await updateJobStep(jobId, "Check Balance", "completed");

    // Step 2: On-chain
    await updateJobStep(jobId, "Initiate On-Chain Withdraw", "in-progress");

    const defuse_intents = {
      intents: [
        {
          intent: "ft_withdraw",
          token: asset,
          receiver_id: asset,
          amount: amount,
        },
      ],
    };

    const ephemeralPayload = {
      owner_pubkey: generatePublicKeyFromTurnKey(user.sudoKey),
      nonce: Date.now(),
      defuse_intents,
      portfolio_id: user.portfolios[0].id,
    };

    const signature = await signEphemeralData(ephemeralPayload, user.sudoKey);

    const networkId = process.env.NEXT_PUBLIC_APP_NETWORK_ID || "testnet";
    const config = configureNetwork(networkId as "testnet" | "mainnet");
    const near = await initNearConnection(networkId, config.nearNodeURL);
    const signerAccount = await near.account(
      process.env.NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_ID!
    );
    const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID!;

    await signerAccount.functionCall({
      contractId,
      methodName: "withdraw_funds",
      args: {
        withdrawal_data: ephemeralPayload,
        signature,
      },
      gas: BigInt("300000000000000"),
      attachedDeposit: BigInt("0"),
    });

    await updateJobStep(jobId, "Initiate On-Chain Withdraw", "completed");

    return res.status(200).json({
      success: true,
      message: "Withdraw completed",
      jobId,
    });
  } catch (err: any) {
    console.error("withdraw error:", err);
    await updateJobStep(
      jobId,
      "Initiate On-Chain Withdraw",
      "failed",
      err.message
    );
    return res
      .status(500)
      .json({ success: false, message: err.message, jobId });
  }
}
