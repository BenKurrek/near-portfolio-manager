// src/inngest/functions/assign-agent.ts
import { inngest } from "@inngest/index";
import { updateJobStep } from "@src/pages/api/auth/utils/jobs";

export const assignAgent = inngest.createFunction(
  { id: "platform-assign-agent", name: "platform/assign-agent" },
  { event: "platform/assign-agent" },
  async ({ event, step }) => {
    // Even if username and agentData are part of the event data, if they’re not used,
    // you can omit destructuring them.
    const { jobId } = event.data;
    await step.run("validate", async () => {
      updateJobStep(jobId, "Validating Agent", "in-progress");
      // Validate agentData if needed
      updateJobStep(jobId, "Validating Agent", "completed");
    });

    await step.run("link", async () => {
      updateJobStep(jobId, "Linking to Portfolio", "in-progress");
      // Perform linking operations
      updateJobStep(jobId, "Linking to Portfolio", "completed");
    });
  }
);
