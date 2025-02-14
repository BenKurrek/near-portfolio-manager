// src/pages/index.tsx

import { useState, useContext, useEffect } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { BalanceContext } from "../context/BalanceContext";
import UnauthenticatedHero from "../components/UnauthenticatedHero";
import LoadingOverlay from "../components/LoadingOverlay/LoadingOverlay";
import LoginModal from "../modals/LoginModal";
import DepositModal from "../modals/DepositModal";
import AuthenticatedDashboard from "../components/AuthenticatedDashboard";

import { configureNetwork } from "../utils/config";

export default function Home() {
  const { username, token, accountMetadata, login, logout } =
    useContext(AuthContext);

  // Get balances from BalanceContext
  const { balances } = useContext(BalanceContext);

  // Let's pretend we want the user’s USDC balance:
  const usdcItem = balances.find((b) => b.token.symbol === "USDC");
  const userBalance = parseFloat(usdcItem?.balance || "0");

  /** -------------- States for Jobs/Modals etc. -------------- */
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobSteps, setJobSteps] = useState<
    {
      name: string;
      status: "pending" | "in-progress" | "completed" | "failed";
      message?: string;
    }[]
  >([]);
  const [txHash, setTxHash] = useState<string | null>(null);

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const config = configureNetwork(
    process.env.NEXT_PUBLIC_APP_NETWORK_ID as "testnet" | "mainnet"
  );

  // Example logout
  const handleLogout = async () => {
    if (!token) return;
    try {
      await axios.post("/api/auth/logout", { token });
      logout();
    } catch (error) {
      console.error("Logout failed:", error);
      logout();
    }
  };

  // Example job polling
  const pollJobStatus = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/auth/jobs/${jobId}`);
        const job = res.data;

        setJobSteps(job.steps);

        const isCompleted = job.steps.every(
          (step: any) => step.status === "completed" || step.status === "failed"
        );
        if (isCompleted) {
          clearInterval(interval);
          // ...
          setCurrentJobId(null);
          setTxHash(null);
        }
      } catch (error) {
        console.error("Error polling job status:", error);
        clearInterval(interval);
      }
    }, 1000);
  };

  // Registration callback
  const handleRegistered = async (token: string) => {
    setJobSteps([]);
    setTxHash(null);
    setCurrentJobId(null);

    try {
      const deployResponse = await axios.post(
        "/api/auth/user/create-portfolio",
        {
          token,
        }
      );

      if (deployResponse.data.success && deployResponse.data.jobId) {
        const jobId = deployResponse.data.jobId;
        setCurrentJobId(jobId);
        setJobSteps([
          { name: "Fetching Deposit Address", status: "pending" },
          { name: "Creating Portfolio", status: "pending" },
          { name: "Assigning Agent", status: "pending" },
        ]);
        setShowLoginModal(false);

        pollJobStatus(jobId);

        // After job completes, fetch user
        // ...
      } else {
        console.error("Failed to initiate contract creation job.");
      }
    } catch (error: any) {
      console.error("Deployment error:", error);
    }
  };

  // Login callback
  const handleLoggedIn = (uname: string, tok: string, userMetadata: any) => {
    login(uname, tok, userMetadata);
    setShowLoginModal(false);
  };

  return (
    <div className="min-h-screen bg-brandDark text-gray-100 flex flex-col">
      {/* HEADER */}
      <header className="bg-brandDark shadow z-10 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          {/* Brand */}
          <div className="flex items-center space-x-2">
            <svg
              className="w-8 h-8 text-brandAccent"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m0 8l-7.89-5.26a2 2 0 00-2.22 0L3 16"
              />
            </svg>
            <h1 className="text-2xl font-bold tracking-wide text-brandAccent">
              Fluxfolio
            </h1>
          </div>

          {accountMetadata && (
            <button
              onClick={handleLogout}
              className="btn btn-outline hover:scale-105"
            >
              Logout
            </button>
          )}
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-grow max-w-7xl mx-auto w-full p-6">
        {!accountMetadata ? (
          <UnauthenticatedHero onGetStarted={() => setShowLoginModal(true)} />
        ) : (
          <AuthenticatedDashboard
            username={username}
            accountMetadata={accountMetadata}
            userBalance={userBalance}
            transactions={[]} // Example empty transaction array
            config={config}
            copied={copied}
            setCopied={setCopied}
            handleDepositClick={() => setShowDepositModal(true)}
          />
        )}

        {/* LOGIN MODAL */}
        {showLoginModal && (
          <LoginModal
            handleLoggedIn={handleLoggedIn}
            handleRegistered={handleRegistered}
            setShowModal={setShowLoginModal}
          />
        )}

        {/* DEPOSIT MODAL */}
        <DepositModal
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
        />

        {/* OPTIONAL LOADING OVERLAY */}
        {currentJobId && (
          <LoadingOverlay
            steps={jobSteps}
            onComplete={() => {
              setCurrentJobId(null);
              setTxHash(null);
            }}
            txHash={txHash}
            explorerLink={config.btcExplorerBaseUrl}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-brandDark mt-8 py-6 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Fluxfolio. All rights reserved.
      </footer>
    </div>
  );
}
