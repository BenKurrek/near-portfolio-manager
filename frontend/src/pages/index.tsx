// src/pages/index.tsx

import { useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "@context/AuthContext";
import { BalanceContext } from "@context/BalanceContext";
import UnauthenticatedHero from "@components/UnauthenticatedHero";
import LoadingOverlay from "@components/LoadingOverlay/LoadingOverlay";
import LoginModal from "@modals/LoginModal";
import DepositModal from "@modals/DepositModal";
import AuthenticatedDashboard from "@components/AuthenticatedDashboard";
import { configureNetwork } from "@utils/config";
import type { AuthMetadata } from "@context/AuthContext";

export default function Home() {
  const { username, token, accountMetadata, login, logout } =
    useContext(AuthContext);

  // Get balances from BalanceContext
  const { balances } = useContext(BalanceContext);
  const usdcItem = balances.find((b) => b.token.symbol === "USDC");
  const userBalance = parseFloat(usdcItem?.balance || "0");

  /** -------------- States for job polling + modals -------------- */
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

        // job.steps is a JSON string in the DB, so you might parse it or
        // ensure your job fetch route returns the parsed array. If that route
        // returns the raw string, parse it here. But it looks like it might
        // return them as a string. Adjust as needed if your route changed.
        const steps =
          typeof job.steps === "string" ? JSON.parse(job.steps) : job.steps;

        setJobSteps(steps);

        const isCompleted = steps.every(
          (step: any) => step.status === "completed" || step.status === "failed"
        );
        if (isCompleted) {
          clearInterval(interval);
          setCurrentJobId(null);
          setTxHash(null);
        }
      } catch (error) {
        console.error("Error polling job status:", error);
        clearInterval(interval);
      }
    }, 1000);
  };

  // Callback for when a user finishes registration
  const handleRegistered = async (token: string) => {
    // Example: automatically create a portfolio job after user registration
    setJobSteps([]);
    setTxHash(null);
    setCurrentJobId(null);

    try {
      // If you want to do some “deploy portfolio” logic:
      const deployResponse = await axios.post(
        "/api/auth/user/create-portfolio",
        {
          token,
          ownerPubkey: "SOME_PUBKEY", // or get from the user
        }
      );

      if (deployResponse.data.success && deployResponse.data.jobId) {
        const jobId = deployResponse.data.jobId;
        setCurrentJobId(jobId);
        setJobSteps([{ name: "Creating Portfolio", status: "pending" }]);
        setShowLoginModal(false);
        pollJobStatus(jobId);
      }
    } catch (error) {
      console.error("Deployment error:", error);
    }
  };

  // Callback for when a user logs in
  const handleLoggedIn = (
    uname: string,
    tok: string,
    userMetadata: AuthMetadata
  ) => {
    // Now we only pass three arguments to login, as we updated the signature
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
            accountMetadata={accountMetadata.contractMetadata}
            /**
             * We pass the arrays from accountMetadata
             * If your whoami is returning userMetadata: { contractMetadata, portfolioData, agentIds }
             * then you can do:
             */
            portfolioData={accountMetadata.portfolioData}
            agentIds={accountMetadata.agentIds}
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
