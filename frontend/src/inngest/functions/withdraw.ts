// src/inngest/functions/withdraw.ts
import { inngest } from "@inngest/index";
import { updateJobStep } from "@src/pages/api/auth/utils/jobs";

export const withdraw = inngest.createFunction(
  { id: "platform-withdraw", name: "platform/withdraw" },
  { event: "platform/withdraw" },
  async ({ event, step }) => {
    const { jobId } = event.data;
    await step.run("check-balance", async () => {
      await updateJobStep(jobId, "Check Balance", "in-progress");
      // Fetch on-chain balance...
      await updateJobStep(jobId, "Check Balance", "completed");
    });
    await step.run("initiate", async () => {
      await updateJobStep(jobId, "Initiate On-Chain Withdraw", "in-progress");
      // Call withdraw method...
      await updateJobStep(jobId, "Initiate On-Chain Withdraw", "completed");
    });
  }
);
