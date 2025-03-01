// pages/api/auth/user/whoami.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@src/db";
import { getSession } from "@api-utils/sessions";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Typically you might pass the token as a header (e.g. Authorization).
  // But if you're passing it as a query param, do this:
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "No token provided" });
  }

  // 1) Look up session
  const session = await getSession(token);
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  // 2) Fetch user by session.userId
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // 3) Build your response object
  const accountMetadata = {
    keys: { sudo_key: user.sudoKey || "" },
    contracts: {
      userDepositAddress: user.evmDepositAddress || "",
      nearIntentsAddress: user.nearIntentsAddress || "",
    },
  };

  res.status(200).json({
    username: user.username,
    userMetadata: {
      contractMetadata: accountMetadata,
    },
  });
}
