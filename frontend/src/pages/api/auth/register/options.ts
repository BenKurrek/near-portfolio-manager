// src/pages/api/auth/register/options.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { challenges } from "../challenges";
import { getUserByUsername } from "../utils/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }
  const { username } = req.body;
  if (!username || typeof username !== "string") {
    res.status(400).json({ error: "Invalid username" });
    return;
  }
  const user = await getUserByUsername(username);
  if (!user || !user.id) {
    res.status(400).json({ error: "User not found" });
    return;
  }
  try {
    const options = await generateRegistrationOptions({
      rpName: "Your App Name",
      rpID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID!,
      userID: new Uint8Array(Buffer.from(user.id)),
      userName: user.username,
      timeout: 60000,
      attestationType: "none",
      authenticatorSelection: {
        userVerification: "preferred",
        residentKey: "required",
      },
      // Use the stored base64 string directly for the id.
      excludeCredentials: user.authenticators.map((authr) => ({
        id: authr.id,
        type: "public-key",
        transports: authr.transports.map(
          (t) => t as "usb" | "nfc" | "ble" | "internal"
        ),
      })),
    });
    challenges[username] = options.challenge;
    res.status(200).json(options);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to generate registration options" });
  }
}
