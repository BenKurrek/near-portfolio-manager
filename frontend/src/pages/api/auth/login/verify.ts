// pages/api/auth/login/verify.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { challenges } from "../challenges";
import {
  getUserByCredentialId,
  updateAuthenticatorCounter,
} from "../utils/user";
import { v4 as uuidv4 } from "uuid";
import { loggedInUsers } from "../sessions";
import { ContractMetadata } from "../../../../utils/models/metadata";

interface LoginResponse {
  verified: boolean;
  token?: string;
  username?: string;
  accountMetadata?: ContractMetadata | null;
  error?: string;
}

export default async function loginVerifyHandler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse>
) {
  console.log("LoginVerify request received.");

  if (req.method !== "POST") {
    console.error(`Method not allowed: ${req.method}`);
    res.status(405).end();
    return;
  }

  const { assertionResponse } = req.body;

  if (!assertionResponse) {
    console.error("LoginVerify failed: No assertion response provided.");
    res
      .status(400)
      .json({ verified: false, error: "No assertion response provided" });
    return;
  }

  try {
    // Extract credentialID from assertionResponse
    const credentialID = assertionResponse.id; // This is a base64url string
    console.log(`Verifying login for credentialID: ${credentialID}`);

    // Lookup user by credentialID
    const user = await getUserByCredentialId(credentialID);
    if (!user) {
      console.warn(
        `LoginVerify failed: Authenticator with ID '${credentialID}' not registered.`
      );
      res
        .status(400)
        .json({ verified: false, error: "Authenticator not registered" });
      return;
    }

    const expectedChallenge = challenges["global"];
    if (!expectedChallenge) {
      console.error("LoginVerify failed: No global challenge found.");
      res.status(400).json({ verified: false, error: "No challenge found" });
      return;
    }

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge,
      expectedOrigin: process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN!,
      expectedRPID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID!,
      credential: user.authenticators.find(
        (authr) => authr.id === credentialID
      )!,
    });

    const { verified, authenticationInfo } = verification;

    if (verified && authenticationInfo) {
      const { credentialID: authCredentialID, newCounter } = authenticationInfo;

      // Update the counter to prevent replay attacks
      await updateAuthenticatorCounter(user.id, authCredentialID, newCounter);
      console.log(
        `Authenticator counter updated for user '${user.username}'. New Counter: ${newCounter}`
      );

      // Create a session token
      const token = uuidv4();
      loggedInUsers[token] = user.username;
      delete challenges["global"];

      console.log(
        `User '${user.username}' authenticated successfully. Token: ${token}`
      );
      res.status(200).json({
        verified,
        token,
        username: user.username,
        accountMetadata: user.contractMetadata,
      });
    } else {
      console.warn(
        `Authentication verification failed for user '${user.username}'.`
      );
      res.status(200).json({ verified: false, error: "Verification failed" });
    }
  } catch (error: any) {
    console.error("Error during login verification:", error);
    res.status(400).json({ verified: false, error: "Authentication failed" });
  }
}
