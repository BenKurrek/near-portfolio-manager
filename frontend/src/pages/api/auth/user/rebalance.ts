// src/pages/api/auth/user/rebalance.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { loggedInUsers } from "../sessions";
import { getUserByUsername } from "../utils/user";
import { createJob } from "../utils/jobs";
import { inngest } from "@inngest/index";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const { token, newAllocations } = req.body; // e.g. { USDC: 50, ETH: 25, etc. }
  if (!token || !newAllocations) {
    return res.status(400).json({ success: false, message: "Missing params" });
  }

  const username = loggedInUsers[token];
  if (!username) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const user = await getUserByUsername(username);
  // Check if the user has a portfolio by testing for the userContractId
  if (!user?.userContractId) {
    return res.status(400).json({ success: false, message: "No portfolio" });
  }

  // Create a job and associate it with the user
  const jobId = await createJob(
    "rebalance",
    [
      { name: "Preparing Rebalance Tx", status: "pending" },
      { name: "Executing Rebalance On-Chain", status: "pending" },
    ],
    user.id
  );

  res.status(202).json({ success: true, jobId });

  // Fire Inngest event asynchronously
  (async () => {
    await inngest.send({
      name: "platform/rebalance",
      id: jobId,
      data: {
        jobId,
        username,
        newAllocations,
      },
    });
  })();
}
