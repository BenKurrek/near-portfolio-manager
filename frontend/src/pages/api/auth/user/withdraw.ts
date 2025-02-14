// src/pages/api/auth/user/withdraw.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { loggedInUsers } from "../sessions";
import { getUserByUsername } from "../utils/user";
import { createJob } from "../utils/jobs";
import { inngest } from "../../inngest/main";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const { token, asset, amount, toAddress } = req.body;
  if (!token || !asset || !amount || !toAddress) {
    return res.status(400).json({ success: false, message: "Missing params" });
  }

  const username = loggedInUsers[token];
  if (!username) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const user = await getUserByUsername(username);
  if (!user?.contractMetadata) {
    return res.status(400).json({ success: false, message: "No portfolio" });
  }

  // Create a job
  const jobId = createJob("withdraw", [
    { name: "Check Balance", status: "pending" },
    { name: "Initiate On-Chain Withdraw", status: "pending" },
  ]);

  res.status(202).json({ success: true, jobId });

  // Fire Inngest
  (async () => {
    await inngest.send({
      name: "platform/withdraw",
      id: jobId,
      data: {
        jobId,
        username,
        asset,
        amount,
        toAddress,
      },
    });
  })();
}
