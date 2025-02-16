// pages/api/auth/logout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { deleteSession, getSession } from "@api-utils/sessions"; // your path

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "No token provided" });
  }

  // Check if session exists
  const session = await getSession(token);
  if (!session) {
    return res.status(400).json({ error: "Invalid or already-expired token" });
  }

  // Delete the session
  await deleteSession(token);
  console.log(`User '${session.userId}' logged out successfully.`);
  return res.status(200).json({ message: "Logged out" });
}
