// src/pages/api/inngest/functions/buy-bundle.ts
import { inngest } from "../main";
import { updateJobStep } from "../../auth/utils/jobs";

export const buyBundle = inngest.createFunction(
  { name: "platform/buy-bundle" },
  { event: "platform/buy-bundle" },
  async ({ event, step }) => {
    const { jobId, username, bundleId, amount } = event.data;
    // Step 1: Approve Funds
    await step.run("approve", async () => {
      updateJobStep(jobId, "Approve Funds", "in-progress");
      // ... do your logic
      updateJobStep(jobId, "Approve Funds", "completed");
    });

    // Step 2: Swap to Bundle
    await step.run("swap", async () => {
      updateJobStep(jobId, "Swap to Bundle", "in-progress");
      // call NEAR contract or DEX etc.
      updateJobStep(jobId, "Swap to Bundle", "completed");
    });

    // Step 3: Update Portfolio
    await step.run("update", async () => {
      updateJobStep(jobId, "Update Portfolio", "in-progress");
      // record final holdings, etc.
      updateJobStep(jobId, "Update Portfolio", "completed");
    });
  }
);
