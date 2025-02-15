// pages/api/auth/user/create-portfolio.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { loggedInUsers } from "../sessions";
import { ContractMetadata } from "@utils/models/metadata";
import { createJob } from "../utils/jobs";
import { inngest } from "@inngest/index";
import { CreatePortfolioPayload } from "@utils/models/inngest";
import { getUserByUsername } from "../utils/user";

interface DeployContractResponse {
  success: boolean;
  message: string;
  jobId?: string;
  userMetadata?: ContractMetadata;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeployContractResponse>
) {
  console.log("CreateContract request received.");

  if (req.method !== "POST") {
    console.error(`Method not allowed: ${req.method}`);
    res.status(405).json({ success: false, message: "Method not allowed" });
    return;
  }

  const { token } = req.body;

  if (!token || typeof token !== "string") {
    console.error("CreateContract failed: Invalid or missing token.");
    res
      .status(400)
      .json({ success: false, message: "Invalid or missing token" });
    return;
  }

  const username = loggedInUsers[token];
  if (!username) {
    console.warn(
      `CreateContract failed: Unauthorized access with token '${token}'.`
    );
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  const user = await getUserByUsername(username);
  if (!user) {
    console.error(`CreateContract failed: User '${username}' not found.`);
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  if (user.nearAccountId) {
    console.warn(
      `CreateContract failed: NEAR contract already deployed for user '${username}'.`
    );
    res.status(400).json({
      success: false,
      message: "NEAR contract has already been deployed for this user",
    });
    return;
  }

  // Create a new job for contract deployment
  const jobId = createJob("create-portfolio", [
    { name: "Fetching Deposit Address", status: "pending" },
    { name: "Creating Portfolio", status: "pending" },
    { name: "Assigning Agent", status: "pending" },
  ]);

  res.status(202).json({
    success: true,
    message: "Portfolio creation initiated",
    jobId,
  });

  // Start the asynchronous contract deployment
  (async () => {
    const payload: CreatePortfolioPayload = {
      jobId,
      username,
    };

    await inngest.send({
      name: "platform/create-portfolio",
      id: Date.now().toString(),
      data: payload,
    });
  })();
}
