// src/pages/api/inngest/functions/add-ai-agent.ts
import { inngest } from "../main";
import { updateJobStep } from "../../auth/utils/jobs";

export const addAiAgent = inngest.createFunction(
  { name: "platform/add-ai-agent" },
  { event: "platform/add-ai-agent" },
  async ({ event, step }) => {
    const { jobId, username, agentData } = event.data;
    await step.run("validate", async () => {
      updateJobStep(jobId, "Validating Agent", "in-progress");
      // e.g. check agentData
      updateJobStep(jobId, "Validating Agent", "completed");
    });

    await step.run("link", async () => {
      updateJobStep(jobId, "Linking to Portfolio", "in-progress");
      // call your contract with `attach_ai_agent(...)` or whatever
      updateJobStep(jobId, "Linking to Portfolio", "completed");
    });
  }
);
