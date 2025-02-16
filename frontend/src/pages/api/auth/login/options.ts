// src/pages/api/auth/login/options.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { challenges } from "../challenges";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }
  try {
    // In production, use authenticators from your DB; here we return an empty array for simplicity.
    const options = await generateAuthenticationOptions({
      timeout: 60000,
      allowCredentials: [],
      userVerification: "preferred",
      rpID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID!,
    });
    challenges["global"] = options.challenge;
    res.status(200).json(options);
  } catch (error: any) {
    res
      .status(500)
      .json({ error: "Failed to generate authentication options" });
  }
}
