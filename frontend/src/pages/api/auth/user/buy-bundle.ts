// src/pages/api/auth/user/buy-bundle.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { loggedInUsers } from "../sessions";
import { getUserByUsername } from "../utils/user";
import { createJob, updateJobStep } from "../utils/jobs";
import { inngest } from "@inngest/index";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const { token, bundleId, amount } = req.body;
  if (!token || !bundleId || !amount) {
    return res.status(400).json({ success: false, message: "Missing params" });
  }

  // Validate user
  const username = loggedInUsers[token];
  if (!username) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const user = await getUserByUsername(username);
  if (!user?.contractMetadata) {
    return res.status(400).json({ success: false, message: "No portfolio" });
  }

  // Create a job
  const jobId = createJob("buy-bundle", [
    { name: "Approve Funds", status: "pending" },
    { name: "Swap to Bundle", status: "pending" },
    { name: "Update Portfolio", status: "pending" },
  ]);

  // Return jobId
  res.status(202).json({
    success: true,
    jobId,
    message: "Buy bundle initiated",
  });

  // Fire the Inngest event
  (async () => {
    await inngest.send({
      name: "platform/buy-bundle",
      id: jobId,
      data: {
        jobId,
        username,
        bundleId,
        amount,
      },
    });
  })();
}
