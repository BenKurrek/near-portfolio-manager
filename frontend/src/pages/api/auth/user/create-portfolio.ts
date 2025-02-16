// src/pages/api/auth/user/create-portfolio.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { loggedInUsers } from "../sessions";
import { inngest } from "@inngest/index";
import { getUserByUsername } from "../utils/user";
import { createJob } from "../utils/jobs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }
  const { token, ownerPubkey } = req.body;
  if (!token || !ownerPubkey) {
    return res
      .status(400)
      .json({ success: false, message: "Missing token or ownerPubkey" });
  }
  const username = loggedInUsers[token];
  if (!username) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const user = await getUserByUsername(username);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  // Check if the user already has a portfolio by using the portfolios relation
  if (user.portfolios && user.portfolios.length > 0) {
    return res
      .status(400)
      .json({ success: false, message: "Portfolio already exists" });
  }
  const jobId = await createJob(
    "create-portfolio",
    [{ name: "Creating Portfolio", status: "pending" }],
    user.id
  );
  await inngest.send({
    name: "platform/create-portfolio",
    id: jobId,
    data: { jobId, username, ownerPubkey },
  });
  return res
    .status(202)
    .json({ success: true, message: "Portfolio creation initiated", jobId });
}
