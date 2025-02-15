// src/inngest/functions/withdraw.ts

import { inngest } from "@inngest/index";
import { updateJobStep } from "@src/pages/api/auth/utils/jobs";

export const withdraw = inngest.createFunction(
  { name: "platform/withdraw" },
  { event: "platform/withdraw" },
  async ({ event, step }) => {
    const { jobId, username, asset, amount, toAddress } = event.data;

    await step.run("check-balance", async () => {
      updateJobStep(jobId, "Check Balance", "in-progress");
      // e.g. fetch on-chain portfolio or DB
      updateJobStep(jobId, "Check Balance", "completed");
    });

    await step.run("initiate", async () => {
      updateJobStep(jobId, "Initiate On-Chain Withdraw", "in-progress");
      // call your contract's withdraw method
      updateJobStep(jobId, "Initiate On-Chain Withdraw", "completed");
    });
  }
);
