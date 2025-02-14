// pages/api/auth/jobs/[jobId].ts

import type { NextApiRequest, NextApiResponse } from "next";
import { jobs } from "../utils/jobs";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { jobId },
    method,
  } = req;

  if (method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: `Method ${method} Not Allowed` });
  }

  if (!jobId || typeof jobId !== "string") {
    return res.status(400).json({ error: "Invalid or missing jobId" });
  }

  const job = jobs[jobId];

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  return res.status(200).json(job);
}
