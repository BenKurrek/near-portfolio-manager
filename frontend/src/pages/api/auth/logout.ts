// pages/api/auth/logout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { loggedInUsers } from "./sessions";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  console.log("Logout request received.");

  const { token } = req.body;

  if (!token || typeof token !== "string") {
    console.error("Logout failed: No token provided.");
    res.status(400).json({ error: "No token provided" });
    return;
  }

  if (loggedInUsers[token]) {
    const username = loggedInUsers[token];
    delete loggedInUsers[token];
    console.log(`User '${username}' logged out successfully.`);
    res.status(200).json({ message: "Logged out" });
  } else {
    console.warn(`Logout attempt with invalid token: ${token}`);
    res.status(400).json({ error: "Invalid token" });
  }
}
