// pages/api/auth/utils/jobs.ts

import { v4 as uuidv4 } from "uuid";

// Define the status of each step
type StepStatus = "pending" | "in-progress" | "completed" | "failed";

// Define a step with a name and its current status
interface JobStep {
  name: string;
  status: StepStatus;
  message?: string;
}

// Define the Job interface
interface Job {
  id: string;
  type: string;
  steps: JobStep[];
  createdAt: number;
  updatedAt: number;
  returnValue?: any; // expect JSON
  inngestRunId?: string;
}

// Extend the NodeJS Global interface to include our job manager
declare global {
  var jobs: Record<string, Job> | undefined;
}

global.jobs = global.jobs || {};

// Export the jobs reference
export const jobs: Record<string, Job> = global.jobs;

// Utility function to create a new job
export const createJob = (type: string, steps: JobStep[]): string => {
  const jobId = uuidv4();
  jobs[jobId] = {
    id: jobId,
    type,
    steps,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return jobId;
};

// Utility function to update a job's step status
export const updateJobStep = (
  jobId: string,
  stepName: string,
  status: StepStatus,
  message?: string
) => {
  const job = jobs[jobId];
  if (!job) {
    console.error(`Job with ID ${jobId} not found.`);
    return;
  }

  const step = job.steps.find((s) => s.name === stepName);
  if (step) {
    step.status = status;
    if (message) {
      step.message = message;
    }
    job.updatedAt = Date.now();
  } else {
    console.error(`Step '${stepName}' not found in job ${jobId}.`);
  }
};

// Add return value to a job
export const addReturnValueToJob = (jobId: string, returnValue: any) => {
  const job = jobs[jobId];
  if (!job) {
    console.error(`Job with ID ${jobId} not found.`);
    return;
  }
  job.returnValue = returnValue;
  job.updatedAt = Date.now();
};

export const addInngestRunIdToJob = (
  jobId: string,
  inngestRunId: string | undefined
) => {
  const job = jobs[jobId];
  if (!job) {
    console.error(`Job with ID ${jobId} not found.`);
    return;
  }
  job.inngestRunId = inngestRunId;
  job.updatedAt = Date.now();
};
