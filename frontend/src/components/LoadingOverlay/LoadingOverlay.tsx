import React, { useEffect, useState } from "react";
import styles from "./LoadingOverlay.module.css";

interface LoadingOverlayProps {
  steps: {
    name: string;
    status: "pending" | "in-progress" | "completed" | "failed";
    message?: string;
  }[];
  onComplete?: () => void;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  steps,
  onComplete,
}) => {
  // Only consider the job complete if there is at least one step
  const isCompleted =
    steps.length > 0 &&
    steps.every(
      (step) => step.status === "completed" || step.status === "failed"
    );
  const hasFailed = steps.some((step) => step.status === "failed");
  const [animationState, setAnimationState] = useState<
    "loading" | "success" | "failure"
  >("loading");

  useEffect(() => {
    console.log("isCompleted: ", isCompleted);
    if (isCompleted) {
      onComplete && onComplete();
      console.log("isCompleted2: ", isCompleted);
      setAnimationState(hasFailed ? "failure" : "success");
    }
  }, [isCompleted, hasFailed]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50 text-gray-100">
      <div
        className={`bg-gray-800 rounded-lg p-6 flex flex-col items-center space-y-6 w-96 shadow-lg ${
          animationState === "success"
            ? styles.animateScaleUp
            : animationState === "failure"
            ? styles.animateScaleDown
            : ""
        }`}
      >
        {animationState === "loading" && (
          <>
            <h2 className="text-lg font-semibold animate-pulse">
              Processing...
            </h2>
            <div className="w-full">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center space-x-4 mb-2">
                  {step.status === "pending" ||
                  step.status === "in-progress" ? (
                    <div className="w-5 h-5 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : step.status === "completed" ? (
                    <svg
                      className="h-5 w-5 text-green-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : step.status === "failed" ? (
                    <svg
                      className="h-5 w-5 text-red-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  ) : null}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-200">
                      {step.name}
                    </span>
                    {step.message && (
                      <span className="text-xs text-gray-400">
                        {step.message}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {animationState === "failure" && (
          <>
            <svg
              className="h-12 w-12 text-red-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <p className="mt-4 text-lg font-semibold text-red-400 text-center">
              Operation Failed. Please Try Again.
            </p>
            <button
              onClick={() => onComplete && onComplete()}
              className="mt-4 bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-500 transition duration-200 focus:outline-none w-full"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
