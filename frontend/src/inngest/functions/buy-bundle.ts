// src/inngest/functions/buy-bundle.ts
import { inngest } from "@inngest/index";
import { updateJobStep } from "@src/pages/api/auth/utils/jobs";
import { initNearConnection } from "@utils/services/contractService";

export const buyBundle = inngest.createFunction(
  { id: "platform-buy-bundle", name: "platform/buy-bundle" },
  { event: "platform/buy-bundle" },
  async ({ event, step }) => {
    const { jobId, bundleId, amount } = event.data;
    await step.run("approve", async () => {
      updateJobStep(jobId, "Approve Funds", "in-progress");
      // Pre-swap logic
      updateJobStep(jobId, "Approve Funds", "completed");
    });
    await step.run("swap", async () => {
      updateJobStep(jobId, "Swap to Bundle", "in-progress");
      const networkId = process.env.NEXT_PUBLIC_APP_NETWORK_ID!;
      const near = await initNearConnection(
        networkId,
        process.env.NEXT_PUBLIC_NEAR_NODE_URL!
      );
      // Swap logic here (omitted)
      updateJobStep(jobId, "Swap to Bundle", "completed");
    });
    await step.run("update", async () => {
      updateJobStep(jobId, "Update Portfolio", "in-progress");
      // Update portfolio logic here
      updateJobStep(jobId, "Update Portfolio", "completed");
    });
  }
);
