// pages/api/auth/user/create-account.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@src/db";
import { getSession } from "@api-utils/sessions";
import { createJob, updateJobStep } from "@api-utils/jobs";
import { createAccount } from "../utils/near";

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
  });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Create a job
  const jobId = await createJob(
    "create-account",
    [
      { name: "Creating Account", status: "pending" },
      { name: "Configuring deposit address", status: "pending" },
    ],
    user.id
  );

  res.status(200).json({
    success: true,
    message: "Account creation job started",
    jobId,
  });

  // Asynchronous background process
  (async () => {
    try {
      await updateJobStep(jobId, "Creating Account", "in-progress");
      await updateJobStep(jobId, "Configuring deposit address", "in-progress");

      // Create a new account ID using the current timestamp and the username
      const networkId = process.env.NEXT_PUBLIC_APP_NETWORK_ID! as
        | "testnet"
        | "mainnet";
      const newAccountId = `${Date.now()}-${user.username}.near`;
      const { keyPairString, nearIntentsAddress, evmDepositAddress } =
        await createAccount({
          newAccountId,
          amount: "0.5",
          network: networkId,
        });

      console.log("keypair:", keyPairString, "new account ID:", newAccountId);

      // Optionally update deposit address or anything else
      await prisma.user.update({
        where: { id: user.id },
        data: {
          nearAccountId: newAccountId,
          nearIntentsAddress,
          sudoKey: keyPairString,
          evmDepositAddress,
        },
      });

      await updateJobStep(jobId, "Creating Account", "completed");
      await updateJobStep(jobId, "Configuring deposit address", "completed");
    } catch (err: any) {
      console.error("create account error:", err);
      await updateJobStep(jobId, "Creating Account", "failed", err.message);
    }
  })();
}
