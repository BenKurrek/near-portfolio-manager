// src/utils/jobs.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type StepStatus = "pending" | "in-progress" | "completed" | "failed";

export interface JobStep {
  name: string;
  status: StepStatus;
  message?: string;
}

// 1) Create job
export async function createJob(
  type: string,
  steps: JobStep[],
  userId?: string
): Promise<string> {
  const job = await prisma.job.create({
    data: {
      type,
      steps: JSON.stringify(steps), // <-- Convert to string
      userId: userId || null,
    },
  });
  return job.id;
}

// 2) Update a job step
export async function updateJobStep(
  jobId: string,
  stepName: string,
  status: StepStatus,
  message?: string
): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || !job.steps) {
    console.error(`Job with ID ${jobId} not found.`);
    return;
  }

  // steps is stored as string in DB, so parse it
  const steps: JobStep[] = JSON.parse(job.steps.toString());

  const updatedSteps = steps.map((step) =>
    step.name === stepName
      ? { ...step, status, message: message || step.message }
      : step
  );

  await prisma.job.update({
    where: { id: jobId },
    data: { steps: JSON.stringify(updatedSteps) }, // <-- re-stringify
  });
}
