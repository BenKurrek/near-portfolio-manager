// src/modals/IncomingDepositModal.tsx
import React from "react";
import ReactDOM from "react-dom";
import ModalHeader from "../components/ModalHeader";
import Button from "../components/Button";
import SkeletonLoader from "../components/SkeletonLoader";

interface IncomingDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  chain: string;
  symbol: string;
  amount: number;
  jobSteps: {
    name: string;
    status: "pending" | "in-progress" | "completed" | "failed";
    message?: string;
  }[];
  jobCompleted: boolean;
  jobError: string | null;
}

const IncomingDepositModal: React.FC<IncomingDepositModalProps> = ({
  isOpen,
  onClose,
  chain,
  symbol,
  amount,
  jobSteps,
  jobCompleted,
  jobError,
}) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backdropFilter: "blur(5px)" }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-70 transition-opacity opacity-100"></div>
      <div className="relative z-50 w-11/12 max-w-md transform transition-all scale-100 opacity-100">
        <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-xl shadow-2xl p-6 text-gray-100 animate-fadeIn">
          <ModalHeader title="Incoming Deposit Detected" onClose={onClose} />
          <div className="mb-6 text-gray-200 space-y-4">
            {!jobCompleted ? (
              <>
                <p className="text-sm sm:text-base">
                  We've detected a deposit of{" "}
                  <span className="font-bold text-white">
                    {amount} {symbol}
                  </span>{" "}
                  on <span className="font-bold text-white">{chain}</span>.
                </p>
                <p className="text-sm sm:text-base">
                  This will be converted and transferred into your vault
                  automatically.
                </p>

                {/* Steps Timeline */}
                <div className="mt-6">
                  <div className="relative">
                    <div className="border-l border-gray-600 ml-2 absolute h-full left-0 top-0"></div>
                    <ul className="space-y-4 ml-6">
                      {jobSteps.map((step, idx) => {
                        let icon;
                        if (step.status === "in-progress") {
                          icon = (
                            <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                          );
                        } else if (step.status === "completed") {
                          icon = (
                            <svg
                              className="h-6 w-6 text-green-500"
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
                          );
                        } else if (step.status === "failed") {
                          icon = (
                            <svg
                              className="h-6 w-6 text-red-500"
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
                          );
                        } else {
                          // pending
                          icon = (
                            <div className="w-5 h-5 border-2 border-gray-500 rounded-full" />
                          );
                        }
                        return (
                          <li key={idx} className="flex items-start space-x-3">
                            <div>{icon}</div>
                            <div className="text-sm flex flex-col">
                              <span className="font-semibold">
                                {step.name}
                                {step.status === "in-progress" && "..."}
                              </span>
                              {step.status === "failed" && (
                                <span className="text-red-400 text-xs">
                                  {step.message || "Something went wrong"}
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                {jobError && (
                  <p className="text-red-400 text-sm mt-2">{jobError}</p>
                )}
              </>
            ) : (
              <div className="text-center text-lg font-semibold flex flex-col items-center space-y-6">
                {/* Success Icon */}
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-700">
                  <svg
                    className="w-10 h-10 text-green-300"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <p className="text-green-300 text-xl">
                  Success! Your tokens have been deposited and processed.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default IncomingDepositModal;
