// src/utils/jobs.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type StepStatus = "pending" | "in-progress" | "completed" | "failed";

export interface JobStep {
  name: string;
  status: StepStatus;
  message?: string;
}

/**
 * Creates a new job record in the database.
 */
export async function createJob(
  type: string,
  steps: JobStep[],
  userId?: string
): Promise<string> {
  const job = await prisma.job.create({
    data: {
      type,
      // Store as JSON string
      steps: JSON.stringify(steps),
      userId: userId || null,
    },
  });
  return job.id;
}

/**
 * Updates a given step of a job.
 */
export async function updateJobStep(
  jobId: string,
  stepName: string,
  status: StepStatus,
  message?: string
): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    console.error(`Job with ID ${jobId} not found.`);
    return;
  }

  // Parse the JSON string into an array
  const steps: JobStep[] = JSON.parse(job.steps || "[]");

  const updatedSteps = steps.map((step) =>
    step.name === stepName
      ? { ...step, status, message: message || step.message }
      : step
  );

  await prisma.job.update({
    where: { id: jobId },
    data: {
      // Convert array back to a string
      steps: JSON.stringify(updatedSteps),
    },
  });
}

/**
 * Associates an Inngest run id with a job.
 */
export async function addInngestRunIdToJob(
  jobId: string,
  inngestRunId: string | undefined
): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: { inngestRunId },
  });
}
