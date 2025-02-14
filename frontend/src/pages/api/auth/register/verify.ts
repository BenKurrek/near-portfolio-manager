// pages/api/auth/register/verify.ts

import type { NextApiRequest, NextApiResponse } from "next";
import {
  VerifiedRegistrationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { challenges } from "../challenges";
import { addAuthenticatorToUser, getUserByUsername } from "../utils/user";
import { v4 as uuidv4 } from "uuid";
import { loggedInUsers } from "../sessions";

export default async function registerVerifyHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  console.log("RegisterVerify request received.");

  if (req.method !== "POST") {
    console.error(`Method not allowed: ${req.method}`);
    res.status(405).end();
    return;
  }

  const { username, attestationResponse } = req.body;
  if (!username || !attestationResponse) {
    console.error(
      "RegisterVerify failed: Missing username or attestationResponse.",
    );
    res.status(400).json({ error: "Missing username or attestationResponse." });
    return;
  }

  const user = await getUserByUsername(username);

  if (!user) {
    console.error(`RegisterVerify failed: User '${username}' not found.`);
    res.status(400).json({ error: "User not found" });
    return;
  }

  const expectedChallenge = challenges[username];
  if (!expectedChallenge) {
    console.error(
      `RegisterVerify failed: No challenge found for user '${username}'.`,
    );
    res.status(400).json({ error: "No challenge for this user" });
    return;
  }

  try {
    console.log(`Verifying registration response for user '${username}'.`);
    const verification: VerifiedRegistrationResponse =
      await verifyRegistrationResponse({
        response: attestationResponse,
        expectedChallenge,
        expectedOrigin: process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN!,
        expectedRPID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID!,
        requireUserVerification: true,
      });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credential } = registrationInfo;

      try {
        console.log(`Adding authenticator for user '${username}'.`);
        await addAuthenticatorToUser(user.id, {
          id: credential.id,
          publicKey: credential.publicKey,
          counter: credential.counter,
          transports: attestationResponse.transports,
        });
      } catch (error: any) {
        console.error(
          `Error adding authenticator for user '${username}':`,
          error,
        );
        res.status(400).json({ error: error.message });
        return;
      }

      // Create a session token
      const token = uuidv4();
      loggedInUsers[token] = username;
      delete challenges[username];

      console.log(
        `User '${username}' registered and logged in successfully. Token: ${token}`,
      );
      res.status(200).json({ verified, token });
    } else {
      console.warn(`Registration verification failed for user '${username}'.`);
      res.status(200).json({ verified: false });
    }
  } catch (error) {
    console.error(
      `Error during registration verification for user '${username}':`,
      error,
    );
    res.status(400).json({ error: "Verification failed" });
  }
}
