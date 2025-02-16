import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@src/db";
import { loggedInUsers } from "../sessions";
import { createJob } from "../utils/jobs";
import { inngest } from "@inngest/index";
import { initNearConnection } from "@utils/services/contractService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();
  const { token, portfolioAssignPayload, signature, agentPubkey } = req.body;
  if (!token || !portfolioAssignPayload || !signature || !agentPubkey) {
    return res.status(400).json({ success: false, message: "Missing params" });
  }
  const username = loggedInUsers[token];
  if (!username)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const jobId = await createJob("assign-agent", [
    { name: "Assign Agent", status: "pending" },
  ]);
  res.status(202).json({ success: true, jobId });

  const networkId = process.env.NEXT_PUBLIC_APP_NETWORK_ID as
    | "testnet"
    | "mainnet";
  const near = await initNearConnection(
    networkId,
    process.env.NEXT_PUBLIC_NEAR_NODE_URL!
  );
  const signerAccount = await near.account(
    process.env.NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_ID!
  );
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID!;

  await signerAccount.functionCall({
    contractId,
    methodName: "assign_portfolio_agent",
    args: {
      portolio_data: portfolioAssignPayload,
      signature,
      agent_pubkey: agentPubkey,
    },
    gas: BigInt("300000000000000"),
    attachedDeposit: BigInt("0"),
  });

  // Update DB: add new agent record and update user's agent list.
  const userRecord = await prisma.user.findUnique({
    where: { username },
    include: { portfolios: true },
  });
  if (userRecord && userRecord.portfolios.length > 0) {
    // For simplicity, assign agent to the first portfolio.
    const portfolio = userRecord.portfolios[0];
    const newAgent = await prisma.agent.create({
      data: {
        publicKey: agentPubkey,
        portfolioId: portfolio.id,
      },
    });
  }

  await inngest.send({
    name: "platform/assign-agent",
    id: jobId,
    data: {
      jobId,
      username,
      agentData: { portfolioAssignPayload, agentPubkey },
    },
  });
}
