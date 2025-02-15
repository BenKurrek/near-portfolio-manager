// Import the single inngest instance
import { createPortfolio } from "./create-portfolio";
import { buyBundle } from "./buy-bundle";
import { withdraw } from "./withdraw";
import { addAiAgent } from "./add-ai-agent";
import { rebalance } from "./rebalance";

export const functions = [
  createPortfolio,
  buyBundle,
  withdraw,
  addAiAgent,
  rebalance,
];

