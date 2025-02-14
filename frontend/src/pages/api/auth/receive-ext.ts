// src/pages/api/receive-ext.ts
import type { NextApiRequest, NextApiResponse } from "next";

// This is a placeholder endpoint.
// In reality, you would pass in the quote and details, then:
/// 1. Call your swapTokens logic
/// 2. Possibly finalize the intent
/// 3. Return success or failure.

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { quote, token, withdrawAddress } = req.body;

  console.log("receive-ext called with:", { quote, token, withdrawAddress });

  // Simulate success for now
  await new Promise((r) => setTimeout(r, 2000)); // Simulate network delay

  return res.json({ success: true });
}
