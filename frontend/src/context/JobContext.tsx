// src/context/JobContext.tsx
import React, { createContext, useState, useCallback, useContext } from "react";
import { apiService, JobStep } from "@services/api";
import { AuthContext } from "./AuthContext";
import { logger } from "@src/utils/logger";

/**
 * The shape of our JobContext data.
 */
interface JobContextType {
  currentJobId: string | null;
  jobSteps: JobStep[];
  startJob: (jobType: string, token: string) => Promise<void>;
  clearJob: () => void;
}

/**
 * The context defaults
 */
export const JobContext = createContext<JobContextType>({
  currentJobId: null,
  jobSteps: [],
  startJob: async () => {},
  clearJob: () => {},
});

export const JobProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobSteps, setJobSteps] = useState<JobStep[]>([]);
  const { refreshUser } = useContext(AuthContext);

  /**
   * Poll the given job ID until completion, updating jobSteps state.
   * If successful and the job is e.g. create-portfolio, let's refresh user.
   */
  const pollJobStatus = useCallback(
    (jobId: string, jobType: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        logger.info(
          `pollJobStatus() started for jobId=${jobId}, type=${jobType}`
        );
        setCurrentJobId(jobId);
        // Removed the initial step to prevent flashing "Starting create-portfolio"
        // setJobSteps([{ name: `Starting ${jobType}`, status: "pending" }]);

        const interval = setInterval(async () => {
          try {
            logger.debug("Polling job status...");
            const job = await apiService.getJobStatus(jobId);
            const steps =
              typeof job.steps === "string" ? JSON.parse(job.steps) : job.steps;
            setJobSteps(steps);

            const isCompleted = steps.every(
              (step: any) =>
                step.status === "completed" || step.status === "failed"
            );
            if (isCompleted) {
              logger.info(`Job ${jobId} has completed.`);
              clearInterval(interval);
              setCurrentJobId(null);

              const failedStep = steps.find(
                (step: any) => step.status === "failed"
              );
              if (!failedStep && jobType === "create-portfolio") {
                logger.info(
                  "Portfolio created successfully. Refreshing user data..."
                );
                await refreshUser();
                resolve(); // Resolve when the job completes successfully
              } else {
                reject(new Error("Job failed"));
              }
            }
          } catch (error) {
            logger.error("Error polling job status:", error);
            clearInterval(interval);
            setCurrentJobId(null);
            reject(error);
          }
        }, 1000);
      });
    },
    [refreshUser]
  );

  /**
   * Start a particular job by calling the relevant API route.
   * That route should return { success, jobId, ... } so we can poll it.
   */
  const startJob = useCallback(
    async (jobType: string, token: string) => {
      logger.info(`startJob() called with jobType=${jobType}`);
      try {
        if (!token) {
          logger.warn("startJob() was called without a token!");
          return;
        }
        if (jobType === "create-portfolio") {
          const response = await apiService.createPortfolio(token);
          if (response.success && response.jobId) {
            logger.info("create-portfolio job started. Polling...");
            await pollJobStatus(response.jobId, "create-portfolio");
          }
        }
        // Handle other job types as needed...
      } catch (err) {
        logger.error("startJob error:", err);
      }
    },
    [pollJobStatus]
  );

  /**
   * Clears the current job from state (if needed externally).
   */
  const clearJob = useCallback(() => {
    logger.info("Clearing current job from context state.");
    setCurrentJobId(null);
    setJobSteps([]);
  }, []);

  return (
    <JobContext.Provider
      value={{
        currentJobId,
        jobSteps,
        startJob,
        clearJob,
      }}
    >
      {children}
    </JobContext.Provider>
  );
};
