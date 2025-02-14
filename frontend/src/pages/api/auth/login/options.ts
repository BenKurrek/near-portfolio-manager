// pages/api/auth/login/options.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { challenges } from "../challenges";
import { users } from "../utils/user"; // Import all users

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  console.log("LoginOptions request received.");

  if (req.method !== "POST") {
    console.error(`Method not allowed: ${req.method}`);
    res.status(405).end();
    return;
  }

  try {
    console.log("Generating authentication options.");

    const allAuthenticators = users.flatMap((user) => user.authenticators);

    console.log(`Total authenticators found: ${allAuthenticators.length}`);

    const allowCredentials = allAuthenticators.map((authr) => ({
      id: authr.id,
      type: "public-key",
      transports: authr.transports,
    }));

    const options = await generateAuthenticationOptions({
      timeout: 60000,
      allowCredentials,
      userVerification: "preferred",
      rpID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID!,
    });

    // Store a global challenge
    challenges["global"] = options.challenge;

    console.log(
      "Authentication options generated and global challenge stored.",
    );

    res.status(200).json(options);
  } catch (error: any) {
    console.error("Error generating authentication options:", error);
    res
      .status(500)
      .json({ error: "Failed to generate authentication options" });
  }
}
