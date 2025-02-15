// src/pages/api/auth/user/add-ai-agent.ts
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

  const { token, agentData } = req.body;
  if (!token || !agentData) {
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
  const jobId = createJob("add-ai-agent", [
    { name: "Validating Agent", status: "pending" },
    { name: "Linking to Portfolio", status: "pending" },
  ]);

  res.status(202).json({ success: true, jobId });

  // Fire Inngest
  (async () => {
    await inngest.send({
      name: "platform/add-ai-agent",
      id: jobId,
      data: {
        jobId,
        username,
        agentData,
      },
    });
  })();
}
