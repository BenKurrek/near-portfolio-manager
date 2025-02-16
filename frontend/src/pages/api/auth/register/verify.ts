// src/pages/api/auth/register/verify.ts
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
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }
  const { username, attestationResponse } = req.body;
  if (!username || !attestationResponse) {
    res.status(400).json({ error: "Missing username or attestationResponse." });
    return;
  }
  const user = await getUserByUsername(username);
  if (!user) {
    res.status(400).json({ error: "User not found" });
    return;
  }
  const expectedChallenge = challenges[username];
  if (!expectedChallenge) {
    res.status(400).json({ error: "No challenge for this user" });
    return;
  }
  try {
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
        await addAuthenticatorToUser(user.id, {
          id: credential.id,
          publicKey: credential.publicKey.toString(),
          counter: credential.counter,
          transports: attestationResponse.transports,
        });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
        return;
      }
      const token = uuidv4();
      loggedInUsers[token] = username;
      delete challenges[username];
      res.status(200).json({ verified, token });
    } else {
      res.status(200).json({ verified: false });
    }
  } catch (error) {
    res.status(400).json({ error: "Verification failed" });
  }
}
