// src/inngest/functions/rebalance.ts

import { inngest } from "@inngest/index";
import { updateJobStep } from "@src/pages/api/auth/utils/jobs";

export const rebalance = inngest.createFunction(
  { name: "platform/rebalance" },
  { event: "platform/rebalance" },
  async ({ event, step }) => {
    const { jobId, username, newAllocations } = event.data;

    await step.run("prepare", async () => {
      updateJobStep(jobId, "Preparing Rebalance Tx", "in-progress");
      // e.g. compute which tokens to swap
      updateJobStep(jobId, "Preparing Rebalance Tx", "completed");
    });

    await step.run("execute", async () => {
      updateJobStep(jobId, "Executing Rebalance On-Chain", "in-progress");
      // call NEAR contract with new allocations
      updateJobStep(jobId, "Executing Rebalance On-Chain", "completed");
    });
  }
);
