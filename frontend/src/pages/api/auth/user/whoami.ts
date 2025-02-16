// src/pages/api/auth/user/whoami.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@src/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "No token provided" });
  }
  // For simplicity, assume token equals username.
  const username = token;
  const user = await prisma.user.findUnique({
    where: { username },
    include: { portfolios: true, agents: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const accountMetadata = {
    keys: { sudo_key: user.sudoKey || "" },
    contracts: {
      userDepositAddress: user.userDepositAddress || "",
      userContractId: user.userContractId || "",
      mpcContractId: user.mpcContractId || "",
    },
  };

  res.status(200).json({
    username: user.username,
    userMetadata: {
      contractMetadata: accountMetadata,
      portfolioData: user.portfolios,
      agentIds: user.agents.map((agent) => agent.publicKey),
    },
  });
}
