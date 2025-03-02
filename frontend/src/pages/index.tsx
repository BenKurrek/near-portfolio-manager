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
import { logger } from "@src/utils/logger";
import { apiService } from "@services/api";
import { PriceContext } from "@src/context/PriceContext";
import WelcomeModal from "@src/components/WelcomeModal";

export default function Home() {
  const { username, token, accountMetadata, login, logout, refreshUser } =
    useContext(AuthContext);

  // JobContext for background job handling
  const { currentJobId, jobSteps, startJob, clearJob, currentJobType } =
    useContext(JobContext);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // BalanceContext for user token balances
  const { balances, loading: balancesLoading } = useContext(BalanceContext);
  const { prices } = useContext(PriceContext);
  console.log("balancesSALDJSALKDJ: ", balances);

  // Calculate user’s USDC total
  const usdcItems = balances.filter((b) => b.token.symbol === "USDC");
  const totalUsdcBalance = usdcItems.reduce(
    (sum, item) => sum + Number(item.balance),
    0
  );
  const userBalance = parseFloat(totalUsdcBalance.toString());

  // For the portfolio chart, we do a quick USD aggregator:
  //   tokenValue = tokenBalance * prices[symbol].
  const nonUsdcBalances = balances.filter((b) => b.token.symbol !== "USDC");

  const aggregatedUSD = nonUsdcBalances.reduce((acc, item) => {
    const symbol = item.token.symbol;
    const price = prices[symbol] || 0; // fallback if missing
    const usdValue = parseFloat(item.balance) * price;
    acc[symbol] = {
      usdValue,
      amount: item.balance,
    };
    return acc;
  }, {} as Record<string, { usdValue: number; amount: string }>);

  const totalNonUsdcBalance = Object.values(aggregatedUSD).reduce(
    (sum, v) => sum + v.usdValue,
    0
  );

  // Build a tokens array for the chart
  const tokens = Object.keys(aggregatedUSD).map((symbol) => {
    const tokenItem = nonUsdcBalances.find((b) => b.token.symbol === symbol);
    const item = aggregatedUSD[symbol];
    const percentage = totalNonUsdcBalance
      ? (item.usdValue / totalNonUsdcBalance) * 100
      : 0;

    return {
      name: symbol,
      logo: tokenItem?.token.icon || "",
      percentage: parseFloat(percentage.toFixed(2)),
      amount: parseFloat(item.amount.toString()).toFixed(
        symbol === "BTC" ? 8 : symbol === "ETH" ? 6 : 4
      ),
      value: item.usdValue,
    };
  });

  // Chart data
  const colors = [
    "#8ECAE6",
    "#219EBC",
    "#FFB703",
    "#FFC6FF",
    "#A0C4FF",
    "#BDB2FF",
  ];
  const portfolioData = {
    tokens,
    totalBalance: totalNonUsdcBalance,
    labels: Object.keys(aggregatedUSD),
    datasets: [
      {
        label: "USD Balance",
        data: Object.values(aggregatedUSD).map((v) => v.usdValue),
        backgroundColor: Object.keys(aggregatedUSD).map(
          (_, i) => colors[i % colors.length]
        ),
      },
    ],
  };

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

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
   * Callbacks for registration and login (unchanged)
   */
  const handleRegistered = async (freshToken: string) => {
    logger.info("handleRegistered() -> new user token:", freshToken);
    setShowLoginModal(false);
    try {
      logger.info("Fetching whoami after registration...");
      const data = await apiService.whoami(freshToken);
      logger.info("whoami response after registration:", data);
      logger.info("Starting create-account job and waiting for completion...");
      await startJob("create-account", freshToken);
      login(data.username, freshToken, data.userMetadata);
      logger.info("User is now logged in after portfolio creation.");
    } catch (err) {
      logger.error("Error finalizing registration or creating portfolio:", err);
    }
  };

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
        {/* 1) If not logged in, show hero */}
        {!accountMetadata ? (
          <UnauthenticatedHero onGetStarted={() => setShowLoginModal(true)} />
        ) : /* 2) If we have accountMetadata, but still loading balances, show skeleton */
        balancesLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-12 w-1/2 bg-gray-700 rounded"></div>
            <div className="h-64 w-full bg-gray-700 rounded"></div>
            <div className="h-40 w-full bg-gray-700 rounded"></div>
          </div>
        ) : (
          /* 3) Otherwise, show the actual dashboard */
          <AuthenticatedDashboard
            username={username}
            accountMetadata={accountMetadata.contractMetadata}
            userBalance={userBalance}
            activities={accountMetadata.contractMetadata.userInfo?.activities}
            copied={copied}
            setCopied={setCopied}
            handleDepositClick={() => setShowDepositModal(true)}
            balancerChartData={portfolioData}
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
              refreshUser();
              if (currentJobType === "create-account") {
                setShowWelcomeModal(true);
              }
              clearJob();
            }}
          />
        )}
        {showWelcomeModal && (
          <WelcomeModal
            onClose={() => {
              refreshUser();
              setShowWelcomeModal(false);
            }}
          />
        )}
      </main>

      <footer className="bg-brandDark mt-8 py-6 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Fluxfolio. All rights reserved.
      </footer>
    </div>
  );
}
