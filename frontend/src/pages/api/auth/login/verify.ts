// src/pages/api/auth/login/verify.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { challenges } from "../challenges";
import {
  getUserByCredentialId,
  updateAuthenticatorCounter,
} from "../utils/user";
import { v4 as uuidv4 } from "uuid";
import { loggedInUsers } from "../sessions";

// Define the allowed transport values.
type AuthenticatorTransportFuture = "usb" | "nfc" | "ble" | "internal";

interface LoginResponse {
  verified: boolean;
  token?: string;
  username?: string;
  // Return full AuthMetadata
  accountMetadata?: {
    contractMetadata: {
      keys: { sudo_key: string };
      contracts: {
        userDepositAddress: string;
        userContractId: string;
        mpcContractId: string;
      };
    };
    portfolioData: any;
    agentIds: string[];
  } | null;
  error?: string;
}

export default async function loginVerifyHandler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse>
) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }
  const { assertionResponse } = req.body;
  if (!assertionResponse) {
    res
      .status(400)
      .json({ verified: false, error: "No assertion response provided" });
    return;
  }
  try {
    const credentialID = assertionResponse.id;
    const user = await getUserByCredentialId(credentialID);
    if (!user) {
      res
        .status(400)
        .json({ verified: false, error: "Authenticator not registered" });
      return;
    }
    const expectedChallenge = challenges["global"];
    if (!expectedChallenge) {
      res.status(400).json({ verified: false, error: "No challenge found" });
      return;
    }

    // Find the stored authenticator (stored id and publicKey are base64 strings)
    const stored = user.authenticators.find(
      (authr) => authr.id === credentialID
    );
    if (!stored) {
      res
        .status(400)
        .json({ verified: false, error: "No matching credential in user" });
      return;
    }

    // Build the credential object expected by verifyAuthenticationResponse:
    const credentialForVerification = {
      id: stored.id,
      publicKey: new Uint8Array(Buffer.from(stored.publicKey, "base64")),
      counter: stored.counter,
      transports: stored.transports.map(
        (t) => t as AuthenticatorTransportFuture
      ),
    };

    const verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge,
      expectedOrigin: process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN!,
      expectedRPID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID!,
      credential: credentialForVerification,
    });
    const { verified, authenticationInfo } = verification;
    if (verified && authenticationInfo) {
      const { credentialID: authCredentialID, newCounter } = authenticationInfo;
      await updateAuthenticatorCounter(user.id, authCredentialID, newCounter);
      const token = uuidv4();
      loggedInUsers[token] = user.username;
      delete challenges["global"];
      const accountMetadata = {
        contractMetadata: {
          keys: { sudo_key: user.sudoKey || "" },
          contracts: {
            userDepositAddress: user.userDepositAddress || "",
            userContractId: user.userContractId || "",
            mpcContractId: user.mpcContractId || "",
          },
        },
        portfolioData: user.portfolios,
        agentIds: user.agents.map((agent) => agent.publicKey), // adjust as needed
      };
      res
        .status(200)
        .json({ verified, token, username: user.username, accountMetadata });
    } else {
      res.status(200).json({ verified: false, error: "Verification failed" });
    }
  } catch (error: any) {
    res.status(400).json({ verified: false, error: "Authentication failed" });
  }
}
