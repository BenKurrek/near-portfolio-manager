// src/pages/api/auth/user/buy-bundle.ts
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
  const { token, bundleId, amount } = req.body;
  if (!token || !bundleId || !amount) {
    return res
      .status(400)
      .json({ success: false, message: "Missing parameters" });
  }
  const username = loggedInUsers[token];
  if (!username) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const user = await getUserByUsername(username);
  if (!user || !user.userContractId) {
    return res.status(400).json({ success: false, message: "No portfolio" });
  }
  const jobId = await createJob(
    "buy-bundle",
    [
      { name: "Approve Funds", status: "pending" },
      { name: "Swap to Bundle", status: "pending" },
      { name: "Update Portfolio", status: "pending" },
    ],
    user.id
  );
  await inngest.send({
    name: "platform/buy-bundle",
    id: jobId,
    data: { jobId, username, bundleId, amount },
  });
  return res
    .status(202)
    .json({ success: true, message: "Buy bundle initiated", jobId });
}
