// pages/api/auth/register/verify.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {
  VerifiedRegistrationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { getUserByUsername, addAuthenticatorToUser } from "@api-utils/user";
import { getChallenge, deleteChallenge } from "@api-utils/challenges";
import { createSession } from "@api-utils/sessions";
import { v4 as uuidv4 } from "uuid";

export default async function registerVerifyHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { username, attestationResponse } = req.body;
  if (!username || !attestationResponse) {
    return res
      .status(400)
      .json({ error: "Missing username or attestationResponse." });
  }

  const user = await getUserByUsername(username);
  if (!user) {
    return res.status(400).json({ error: "User not found" });
  }

  // 1) Retrieve the challenge from DB
  const expectedChallenge = await getChallenge(user.id);
  if (!expectedChallenge) {
    return res
      .status(400)
      .json({ error: "No stored challenge found for this user" });
  }

  try {
    // 2) Verify
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
      // 3) Add the credential to DB
      const { credential } = registrationInfo;
      await addAuthenticatorToUser(user.id, {
        id: credential.id,
        publicKey: credential.publicKey.toString(),
        counter: credential.counter,
        transports: attestationResponse.transports,
      });

      // 4) Delete the challenge from DB
      await deleteChallenge(user.id);

      // 5) Create a new session token
      const token = uuidv4();
      await createSession(token, user.id);

      return res.status(200).json({ verified: true, token });
    } else {
      return res.status(200).json({ verified: false });
    }
  } catch (error) {
    return res.status(400).json({ error: "Verification failed" });
  }
}
