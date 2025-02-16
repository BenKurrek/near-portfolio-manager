// pages/api/auth/user/create-portfolio.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@src/db";
import { getSession } from "@api-utils/sessions";
import { createJob, updateJobStep } from "@api-utils/jobs";
import { generatePublicKeyFromTurnKey } from "@api-utils/crypto";
import { configureNetwork } from "@src/utils/config";
import { initNearConnection } from "@src/utils/services/contractService";
import {
  fetchDepositAddress,
  generateSolAddress,
} from "@src/utils/helpers/nearIntents";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: "Missing token" });
  }

  // 1) Check session
  const session = await getSession(token);
  if (!session) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  // 2) Find the user
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { portfolios: true },
  });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // If the user already has a portfolio, return an error
  if (user.portfolios.length > 0) {
    return res
      .status(400)
      .json({ success: false, message: "Portfolio already exists" });
  }

  // Create a job
  const jobId = await createJob(
    "create-portfolio",
    [{ name: "Creating Portfolio", status: "pending" }],
    user.id
  );

  res.status(200).json({
    success: true,
    message: "Portfolio creation job started",
    jobId,
  });

  // Asynchronous background process
  (async () => {
    try {
      await updateJobStep(jobId, "Creating Portfolio", "in-progress");

      if (!user.sudoKey) {
        throw new Error("User does not have a sudoKey stored.");
      }
      const ownerPubkey = generatePublicKeyFromTurnKey(user.sudoKey);

      const networkId = process.env.NEXT_PUBLIC_APP_NETWORK_ID || "testnet";
      const config = configureNetwork(networkId as "testnet" | "mainnet");
      const near = await initNearConnection(networkId, config.nearNodeURL);
      const signerAccount = await near.account(
        process.env.NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_ID!
      );
      const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID!;

      console.log(
        `Calling create_portfolio(${ownerPubkey}) on contract ${contractId}`
      );
      const result = await signerAccount.functionCall({
        contractId,
        methodName: "create_portfolio",
        args: { owner_pubkey: ownerPubkey },
        gas: BigInt("300000000000000"),
        attachedDeposit: BigInt("0"),
      });

      const outcome = result.status as any;
      if (!("SuccessValue" in outcome)) {
        await updateJobStep(
          jobId,
          "Creating Portfolio",
          "failed",
          "NEAR call failed"
        );
        return;
      }

      const accountId = generateSolAddress(user.sudoKey);
      const evmAddr = await fetchDepositAddress("EVM", accountId);

      // Suppose contract returns portfolio ID in base64 in SuccessValue
      const portfolioId = Buffer.from(outcome.SuccessValue, "base64").toString(
        "utf8"
      );

      // Optionally update deposit address or anything else
      await prisma.user.update({
        where: { id: user.id },
        data: { userDepositAddress: evmAddr },
      });

      // Create the Portfolio row
      await prisma.portfolio.create({
        data: {
          id: portfolioId,
          ownerId: user.id,
        },
      });

      await updateJobStep(jobId, "Creating Portfolio", "completed");
    } catch (err: any) {
      console.error("createPortfolio error:", err);
      await updateJobStep(jobId, "Creating Portfolio", "failed", err.message);
    }
  })();
}
