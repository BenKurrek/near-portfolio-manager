// pages/api/auth/login/verify.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {
  verifyAuthenticationResponse,
  VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import { getUserByUsername, updateAuthenticatorCounter } from "@api-utils/user";
import { getChallenge, deleteChallenge } from "@api-utils/challenges";
import { createSession } from "@api-utils/sessions";
import { v4 as uuid } from "uuid";
import { AuthMetadata } from "@context/AuthContext";
import { initNearConnection } from "@src/utils/services/contractService";
import { configureNetwork } from "@src/utils/config";

interface LoginVerifyResponse {
  verified: boolean;
  token?: string;
  username?: string;
  accountMetadata?: AuthMetadata;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoginVerifyResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" } as any);
  }

  // 1) Pull out { username, assertionResponse }
  const { username, assertionResponse } = req.body;
  if (!username || !assertionResponse) {
    return res.status(400).json({
      verified: false,
      error: "Missing username or assertionResponse",
    });
  }

  // 2) Look up user
  const user = await getUserByUsername(username.toLowerCase());
  if (!user) {
    return res.status(404).json({ verified: false, error: "User not found" });
  }

  // 3) Get challenge from DB for that user
  const expectedChallenge = await getChallenge(user.id);
  if (!expectedChallenge) {
    return res.status(400).json({
      verified: false,
      error: "No stored challenge found for this user",
    });
  }

  // 4) Find the matching credential
  const storedAuthenticator = user.authenticators.find(
    (auth) => auth.id === assertionResponse.id
  );
  if (!storedAuthenticator) {
    return res
      .status(400)
      .json({ verified: false, error: "Authenticator not recognized" });
  }

  // Convert the stored publicKey from a comma‐separated string into a Uint8Array.
  const publicKeyBytes = Uint8Array.from(
    storedAuthenticator.publicKey.split(",").map((num) => Number(num))
  );

  const credentialDevice = {
    id: storedAuthenticator.id,
    publicKey: publicKeyBytes,
    counter: storedAuthenticator.counter,
    transports: (storedAuthenticator.transports || []) as (
      | "usb"
      | "nfc"
      | "ble"
      | "internal"
    )[],
  };

  // 5) Verify
  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge,
      expectedOrigin: process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN!,
      expectedRPID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID!,
      requireUserVerification: true,
      credential: credentialDevice,
    });
  } catch (err) {
    console.error("Error verifying passkey:", err);
    return res
      .status(400)
      .json({ verified: false, error: "Verification failed" });
  }

  const { verified, authenticationInfo } = verification;
  if (!verified || !authenticationInfo) {
    return res.status(400).json({ verified: false, error: "Not verified" });
  }

  // 6) Update signature counter in DB
  const { newCounter } = authenticationInfo;
  await updateAuthenticatorCounter(user.id, assertionResponse.id, newCounter);

  // 7) Delete the challenge
  await deleteChallenge(user.id);

  // 8) Create session token
  const token = uuid();
  await createSession(token, user.id);

  // 9) Build any account metadata if you want (like user deposit address)
  // If you do near stuff:
  const config = configureNetwork(
    process.env.NEXT_PUBLIC_APP_NETWORK_ID as "testnet" | "mainnet"
  );
  const { sponsorAccount } = await initNearConnection(
    config.appNetwork,
    config.nearNodeURL
  );
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID!;
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

  // 10) Return success
  return res.status(200).json({
    verified: true,
    token,
    username: user.username,
    accountMetadata,
  });
}
