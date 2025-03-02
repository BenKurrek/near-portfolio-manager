// pages/api/auth/user/whoami.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@src/db";
import { getSession } from "@api-utils/sessions";
import { AuthMetadata } from "@src/context/AuthContext";
import { initNearConnection } from "@src/utils/services/contractService";
import { configureNetwork } from "@src/utils/config";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  const config = configureNetwork(
    process.env.NEXT_PUBLIC_APP_NETWORK_ID as "testnet" | "mainnet"
  );
  const { sponsorAccount } = await initNearConnection(
    config.appNetwork,
    config.nearNodeURL
  );
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID!;
  // Ensure portfolio exists
  let userInfo;
  if (user.nearAccountId) {
    userInfo = await sponsorAccount!.viewFunction({
      contractId,
      methodName: "get_user_info",
      args: {
        user_id: user.nearAccountId,
      },
    });
  }

  const accountMetadata: AuthMetadata = {
    contractMetadata: {
      keys: { sudo_key: user.sudoKey || "" },
      contracts: {
        userDepositAddress: user.evmDepositAddress || "",
        nearIntentsAddress: user.nearIntentsAddress || "",
      },
      userInfo,
    },
  };

  res.status(200).json({
    username: user.username,
    userMetadata: accountMetadata,
  });
}
