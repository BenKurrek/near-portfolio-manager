// pages/api/auth/whoami.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { loggedInUsers } from "../sessions";
import { getUserByUsername } from "../utils/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  console.log("WhoAmI request received.");

  const { token } = req.query;
  if (!token || typeof token !== "string") {
    console.error("WhoAmI failed: No token provided.");
    res.status(400).json({ error: "No token provided" });
    return;
  }

  const username = loggedInUsers[token];
  if (!username) {
    console.warn(`WhoAmI failed: Invalid token '${token}'.`);
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const user = await getUserByUsername(username);
  if (user) {
    console.log(`WhoAmI success: User '${username}' retrieved.`);
    res.status(200).json({ username, userMetadata: user?.contractMetadata });
  } else {
    console.warn(`WhoAmI failed: User '${username}' not found.`);
    res.status(404).json({ error: "User not found" });
  }
}
