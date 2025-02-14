// src/pages/api/inngest/functions/index.ts
import { createPortfolio } from "./create-portfolio";
import { buyBundle } from "./buy-bundle";
import { addAiAgent } from "./add-ai-agent";
import { withdraw } from "./withdraw";
import { rebalance } from "./rebalance";

export const functions = [
  createPortfolio,
  buyBundle,
  addAiAgent,
  withdraw,
  rebalance,
];

