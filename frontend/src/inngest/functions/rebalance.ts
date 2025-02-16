// src/inngest/functions/rebalance.ts
import { inngest } from "@inngest/index";
import { updateJobStep } from "@src/pages/api/auth/utils/jobs";

export const rebalance = inngest.createFunction(
  { id: "platform-rebalance", name: "platform/rebalance" },
  { event: "platform/rebalance" },
  async ({ event, step }) => {
    const { jobId } = event.data;
    await step.run("prepare", async () => {
      await updateJobStep(jobId, "Preparing Rebalance Tx", "in-progress");
      // Compute tokens to swap...
      await updateJobStep(jobId, "Preparing Rebalance Tx", "completed");
    });
    await step.run("execute", async () => {
      await updateJobStep(jobId, "Executing Rebalance On-Chain", "in-progress");
      // Call NEAR contract...
      await updateJobStep(jobId, "Executing Rebalance On-Chain", "completed");
    });
  }
);
