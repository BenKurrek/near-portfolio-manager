// pages/api/auth/login/options.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getUserByUsername } from "@api-utils/user"; // or wherever your user lookup is
import { upsertChallenge } from "@api-utils/challenges";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1) Grab `username` from request body
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Missing username" });
  }

  // 2) Look up the user in DB
  const user = await getUserByUsername(username.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // 3) Build allowCredentials from the user’s stored authenticators
  const allowCredentials = user.authenticators.map((auth) => ({
    id: auth.id,
    transports: (auth.transports || []) as (
      | "usb"
      | "nfc"
      | "ble"
      | "internal"
    )[],
  }));

  // 4) Generate login options with those credentials
  const options = await generateAuthenticationOptions({
    allowCredentials,
    userVerification: "preferred",
    timeout: 60000,
    rpID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID!,
  });

  // 5) Store the challenge for **this specific** user
  await upsertChallenge(user.id, options.challenge);

  // 6) Return the login options
  return res.status(200).json(options);
}
