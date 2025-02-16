// src/pages/api/auth/user/withdraw.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@src/db";
import { loggedInUsers } from "../sessions";
import { getUserByUsername } from "../utils/user";
import { createJob } from "../utils/jobs";
import { inngest } from "@inngest/index";
import { initNearConnection } from "@utils/services/contractService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();
  const { token, asset, amount, toAddress, withdrawalData, signature } =
    req.body;
  if (
    !token ||
    !asset ||
    !amount ||
    !toAddress ||
    !withdrawalData ||
    !signature
  ) {
    return res.status(400).json({ success: false, message: "Missing params" });
  }
  const username = loggedInUsers[token];
  if (!username)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  const user = await getUserByUsername(username);
  if (!user)
    return res.status(400).json({ success: false, message: "User not found" });
  const jobId = await createJob(
    "withdraw",
    [{ name: "Initiate On-Chain Withdraw", status: "pending" }],
    user.id
  );
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
    methodName: "withdraw_funds",
    args: { withdrawal_data: withdrawalData, signature: signature },
    gas: BigInt("300000000000000"),
    attachedDeposit: BigInt("0"),
  });
  await inngest.send({
    name: "platform/withdraw",
    id: jobId,
    data: { jobId, username, asset, amount, toAddress },
  });
}
