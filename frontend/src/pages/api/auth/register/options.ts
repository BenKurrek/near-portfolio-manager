// pages/api/auth/register/options.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {
  generateRegistrationOptions,
  WebAuthnCredential,
} from "@simplewebauthn/server";
import { challenges } from "../challenges";
import { getUserByUsername } from "../utils/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  console.log("RegisterOptions request received.");

  if (req.method !== "POST") {
    console.error(`Method not allowed: ${req.method}`);
    res.status(405).end();
    return;
  }

  const { username } = req.body;
  if (!username || typeof username !== "string") {
    console.error("RegisterOptions failed: Invalid username.");
    res.status(400).json({ error: "Invalid username" });
    return;
  }

  const user = await getUserByUsername(username);
  if (!user || !user.id) {
    console.error(
      `RegisterOptions failed: User '${username}' not found or invalid.`,
    );
    res.status(400).json({ error: "User not found" });
    return;
  }

  try {
    console.log(`Generating registration options for user '${username}'.`);
    const options = await generateRegistrationOptions({
      rpName: "Your App Name",
      rpID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID!,
      userID: Buffer.from(user.id),
      userName: user.username,
      timeout: 60000,
      attestationType: "none",
      authenticatorSelection: {
        userVerification: "preferred",
        residentKey: "required",
      },
      excludeCredentials: user.authenticators.map(
        (authr: WebAuthnCredential) => ({
          id: authr.id,
          type: "public-key",
          transports: authr.transports,
        }),
      ),
    });

    challenges[username] = options.challenge;
    console.log(
      `Registration options generated and challenge stored for user '${username}'.`,
    );

    res.status(200).json(options);
  } catch (error: any) {
    console.error(
      `Error generating registration options for user '${username}':`,
      error,
    );
    res.status(500).json({ error: "Failed to generate registration options" });
  }
}
