// Import the single inngest instance
import { buyBundle } from "./buy-bundle";
import { withdraw } from "./withdraw";
import { assignAgent } from "./assign-agent";
import { rebalance } from "./rebalance";
import { createPortfolio } from "./create-portfolio";

export const functions = [
  createPortfolio,
  buyBundle,
  withdraw,
  assignAgent,
  rebalance,
];
