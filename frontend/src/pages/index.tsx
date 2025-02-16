// src/pages/index.tsx
import { useState, useContext } from "react";
import { AuthContext } from "@context/AuthContext";
import { BalanceContext } from "@context/BalanceContext";
import { JobContext } from "@context/JobContext";
import UnauthenticatedHero from "@components/UnauthenticatedHero";
import LoginModal from "@modals/LoginModal";
import DepositModal from "@modals/DepositModal";
import AuthenticatedDashboard from "@components/AuthenticatedDashboard";
import LoadingOverlay from "@components/LoadingOverlay/LoadingOverlay";
import type { AuthMetadata } from "@context/AuthContext";
import { configureNetwork } from "@src/utils/config";
import { logger } from "@src/utils/logger";
import { apiService } from "@services/api";

export default function Home() {
  const { username, token, accountMetadata, login, logout } =
    useContext(AuthContext);

  // JobContext for background job handling
  const { currentJobId, jobSteps, startJob, clearJob } = useContext(JobContext);

  // BalanceContext for user token balances
  const { balances } = useContext(BalanceContext);
  const usdcItem = balances.find((b) => b.token.symbol === "USDC");
  const userBalance = parseFloat(usdcItem?.balance || "0");

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const config = configureNetwork(
    process.env.NEXT_PUBLIC_APP_NETWORK_ID as "testnet" | "mainnet"
  );

  const handleLogout = async () => {
    if (!token) return;
    try {
      logger.info("Logging out user...");
      logout();
    } catch (error) {
      logger.error("Logout failed:", error);
      logout();
    }
  };

  /**
   * BUGFIX: Callback for when user finishes registration.
   * - We'll call whoami with the freshToken,
   * - Put user in AuthContext with `login(...)`,
   * - Then optionally begin a "create-portfolio" job in the background.
   */
  const handleRegistered = async (freshToken: string) => {
    logger.info("handleRegistered() -> new user token:", freshToken);
    setShowLoginModal(false);

    try {
      // Option 1: Fetch whoami first if you need the user data
      logger.info("Fetching whoami after registration...");
      const data = await apiService.whoami(freshToken);
      logger.info("whoami response after registration:", data);

      // Option 2: Start the portfolio job and wait for it to finish
      logger.info(
        "Starting create-portfolio job and waiting for completion..."
      );
      await startJob("create-portfolio", freshToken);

      // Now that the job is finished, log the user in
      login(data.username, freshToken, data.userMetadata);
      logger.info("User is now logged in after portfolio creation.");
    } catch (err) {
      logger.error("Error finalizing registration or creating portfolio:", err);
      // Optionally, show an error message to the user
    }
  };

  /**
   * Callback for when a user logs in
   */
  const handleLoggedIn = (
    uname: string,
    tok: string,
    userMetadata: AuthMetadata
  ) => {
    logger.info("handleLoggedIn() -> user:", uname);
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
            portfolioData={accountMetadata.portfolioData}
            agentIds={accountMetadata.agentIds}
            userBalance={userBalance}
            transactions={[]}
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

        {/* LOADING OVERLAY: if a background job is in progress */}
        {currentJobId && (
          <LoadingOverlay
            steps={jobSteps}
            onComplete={() => {
              clearJob();
              setTxHash(null);
            }}
            txHash={txHash}
            explorerLink={config.btcExplorerBaseUrl}
          />
        )}
      </main>

      <footer className="bg-brandDark mt-8 py-6 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Fluxfolio. All rights reserved.
      </footer>
    </div>
  );
}
