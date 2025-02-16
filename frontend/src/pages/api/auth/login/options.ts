// pages/api/auth/login/options.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import {
  upsertChallenge,
  getOrCreateGlobalLoginUser,
} from "@api-utils/challenges";

/**
 * In a typical flow, you'd prompt for a username first, find that user, and
 * store a user-specific challenge. But here's the "global" approach:
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    // We'll return "empty" allowCredentials. The user must pick which credential
    // from their device. If you want to restrict to known credentials, you'd do
    // the user-lookup approach instead.
    const options = await generateAuthenticationOptions({
      timeout: 60000,
      allowCredentials: [],
      userVerification: "preferred",
      rpID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID!,
    });

    // Store this challenge on the 'global login user'
    const globalUser = await getOrCreateGlobalLoginUser();
    await upsertChallenge(globalUser.id, options.challenge);

    return res.status(200).json(options);
  } catch (error: any) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Failed to generate authentication options" });
  }
}
