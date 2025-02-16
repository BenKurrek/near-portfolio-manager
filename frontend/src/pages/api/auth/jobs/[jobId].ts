// src/pages/api/auth/jobs/[jobId].ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@src/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  const { jobId } = req.query;
  if (!jobId || typeof jobId !== "string") {
    return res.status(400).json({ error: "Invalid or missing jobId" });
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }
  return res.status(200).json(job);
}
