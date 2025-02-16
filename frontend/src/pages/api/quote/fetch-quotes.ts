// pages/api/fetch-bundle-quotes.ts
import { fetchQuote, Quote } from "@src/utils/helpers/nearIntents";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get the token from the query string (for example, for authentication/logging)
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Missing or invalid token" });
  }

  // Get the 'items' query parameter. It should be a JSON string.
  const itemsParam = req.query.items;
  if (!itemsParam || typeof itemsParam !== "string") {
    return res.status(400).json({ error: "Missing items parameter" });
  }

  let items;
  try {
    items = JSON.parse(itemsParam);
  } catch (error) {
    return res.status(400).json({ error: "Invalid JSON for items parameter" });
  }

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "Items parameter must be an array" });
  }

  try {
    // For each item in the array, call fetchQuote in parallel
    const quotes: (Quote[] | null)[] = await Promise.all(
      items.map(async (item: any) => {
        return fetchQuote({
          defuse_asset_identifier_in: item.defuse_asset_identifier_in,
          defuse_asset_identifier_out: item.defuse_asset_identifier_out,
          exact_amount_in: item.exact_amount_in,
        });
      })
    );
    return res.status(200).json({ quotes });
  } catch (error: any) {
    console.error("Error fetching quotes:", error);
    return res
      .status(500)
      .json({ error: error.message || "Internal server error" });
  }
}
