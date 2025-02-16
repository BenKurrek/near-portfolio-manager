// src/components/AuthenticatedDashboard.tsx
import React, { useContext, useState } from "react";
import { AuthContext } from "@context/AuthContext";
import { apiService } from "@services/api";
import { AppConfig } from "@src/utils/config";
import {
  FaUserAlt,
  FaDollarSign,
  FaGem,
  FaDog,
  FaExchangeAlt,
} from "react-icons/fa";
import { FiCopy } from "react-icons/fi";
import { BsEye } from "react-icons/bs";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface Transaction {
  txId: string;
  amount: number;
  status: "pending" | "completed" | "failed";
}

interface AuthenticatedDashboardProps {
  username: string | null;
  accountMetadata: any;
  portfolioData: any;
  agentIds: string[];
  userBalance: number;
  transactions: Transaction[];
  config: AppConfig;
  copied: boolean;
  setCopied: React.Dispatch<React.SetStateAction<boolean>>;
  handleDepositClick: () => void;
}

const AuthenticatedDashboard: React.FC<AuthenticatedDashboardProps> = ({
  username,
  accountMetadata,
  portfolioData,
  agentIds,
  userBalance,
  transactions,
  config,
  copied,
  setCopied,
  handleDepositClick,
}) => {
  const [showAllTxs, setShowAllTxs] = useState(false);
  const { token } = useContext(AuthContext);

  const handleBuyBundle = async (bundleType: string, amount: number) => {
    if (!token) {
      alert("You must be logged in to buy a bundle.");
      return;
    }
    try {
      const response = await apiService.buyBundle(token, bundleType, amount);
      if (response.success) {
        alert(`Buy bundle initiated. Job ID: ${response.jobId}`);
        // If you need to poll that job, you could do `startJob('buy-bundle', token)` or something similar
      } else {
        alert(`Failed to buy bundle: ${response.message}`);
      }
    } catch (error) {
      console.error("Error buying bundle:", error);
      alert("An error occurred while buying the bundle.");
    }
  };

  const handleCopyAddress = () => {
    if (!accountMetadata?.contracts?.userDepositAddress) return;
    navigator.clipboard.writeText(accountMetadata.contracts.userDepositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const balancerChartData = {
    labels: ["USDC", "ETH", "Others"],
    datasets: [
      {
        label: "Allocation",
        data: [50, 25, 25],
        backgroundColor: ["#8ECAE6", "#219EBC", "#FFB703"],
      },
    ],
  };

  return (
    <div className="mt-8 space-y-12 bg-brandDark min-h-screen px-4 py-8 text-gray-100">
      <section className="bg-gradient-to-r from-brandDark to-brandMain p-6 rounded-lg shadow space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brandAccent rounded-full shadow-md text-white">
            <FaUserAlt className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold">{username}</h2>
            <p className="text-sm">
              Portfolio IDs:{" "}
              {portfolioData?.map((p: any) => p.id).join(", ") || "N/A"}
            </p>
            <p className="text-sm">
              Agents: {agentIds.length ? agentIds.join(", ") : "None"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <FaDollarSign className="text-green-400 w-6 h-6" />
            <div>
              <p className="text-sm">USDC Balance</p>
              <p className="text-xl font-bold">
                {userBalance.toLocaleString()} USDC
              </p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleDepositClick}>
            Deposit USDC
          </button>
        </div>
        <div className="bg-brandDark/30 p-4 rounded-md flex justify-between items-center">
          <div>
            <p className="text-sm mb-1">Deposit Address</p>
            {accountMetadata?.contracts?.userDepositAddress ? (
              <p className="font-mono text-sm break-all">
                {accountMetadata.contracts.userDepositAddress}
              </p>
            ) : (
              <span className="text-sm text-red-400">No deposit address</span>
            )}
          </div>
          <button
            onClick={handleCopyAddress}
            className="p-2 bg-brandAccent rounded-md"
          >
            {copied ? <span>Copied!</span> : <FiCopy className="w-5 h-5" />}
          </button>
        </div>
      </section>

      {/* BUY BUNDLES */}
      <section className="max-w-6xl mx-auto space-y-4">
        <h2 className="text-3xl font-bold">Buy Bundles</h2>
        <p className="text-gray-300">
          Instantly diversify into curated bundles of crypto.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Blue-Chip Bundle */}
          <div className="card bg-brandMain/40 hover:bg-brandMain/60 transition-base flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <FaGem className="w-6 h-6 text-brandAccent" />
              <h3 className="text-xl font-semibold">Blue-Chip Bundle</h3>
            </div>
            <p className="text-gray-200">
              A selection of the most stable tokens on the market.
            </p>
            <button
              className="btn btn-outline mt-auto"
              onClick={() => handleBuyBundle("bluechip", 100)}
            >
              Buy Now
            </button>
          </div>

          {/* Memecoin Bundle */}
          <div className="card bg-brandMain/40 hover:bg-brandMain/60 transition-base flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <FaDog className="w-6 h-6 text-brandAccent" />
              <h3 className="text-xl font-semibold">Memecoin Bundle</h3>
            </div>
            <p className="text-gray-200">
              Spice up your portfolio with the market’s most viral memecoins.
            </p>
            <button
              className="btn btn-outline mt-auto"
              onClick={() => handleBuyBundle("memecoin", 42)}
            >
              Buy Now
            </button>
          </div>

          {/* DeFi Powerhouse */}
          <div className="card bg-brandMain/40 hover:bg-brandMain/60 transition-base flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <FaExchangeAlt className="w-6 h-6 text-brandAccent" />
              <h3 className="text-xl font-semibold">DeFi Powerhouse</h3>
            </div>
            <p className="text-gray-200">
              Leading DeFi tokens like AAVE, UNI, and COMP for advanced yields.
            </p>
            <button
              className="btn btn-outline mt-auto"
              onClick={() => handleBuyBundle("defi", 50)}
            >
              Buy Now
            </button>
          </div>
        </div>
      </section>

      {/* PORTFOLIO BALANCER */}
      <section className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold">Portfolio Balancer</h2>
        <p className="text-gray-300">
          Keep your allocations aligned with automatically triggered
          rebalancing.
        </p>

        <div className="flex flex-col md:flex-row gap-6 md:items-center mt-4">
          <div className="md:w-1/2 bg-brandMain/20 p-4 rounded-md">
            <Pie
              data={balancerChartData}
              options={{
                responsive: true,
                plugins: {
                  title: {
                    display: true,
                    text: "Current Distribution",
                    color: "#fff",
                    font: { size: 16 },
                  },
                  legend: {
                    labels: { color: "#eee" },
                  },
                },
              }}
            />
          </div>
          <div className="md:w-1/2 space-y-4">
            <p className="text-gray-200">
              Example distribution:{" "}
              <strong>USDC 50%, ETH 25%, Others 25%</strong>
            </p>
            <button className="btn btn-outline">Set Up Balancer</button>
          </div>
        </div>
      </section>

      {/* TRANSACTION HISTORY */}
      <section className="max-w-6xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold">Transaction History</h3>
          {transactions.length > 0 && (
            <button
              onClick={() => setShowAllTxs(!showAllTxs)}
              className="text-sm text-brandAccent hover:text-brandAccent/80 transition-base flex items-center gap-1"
            >
              <span>{showAllTxs ? "Show Less" : "Show More"}</span>
              <BsEye
                className={`w-5 h-5 transform ${
                  showAllTxs ? "rotate-180" : ""
                }`}
              />
            </button>
          )}
        </div>
        {transactions.length === 0 ? (
          <p className="text-gray-400 text-sm">No transactions found.</p>
        ) : (
          <div className="overflow-x-auto bg-brandMain/20 rounded-md p-4">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-brandDark text-gray-200">
                  <th className="py-2 px-2 text-left font-semibold">
                    Transaction ID
                  </th>
                  <th className="py-2 px-2 text-right font-semibold">
                    Amount (USDC)
                  </th>
                  <th className="py-2 px-2 text-center font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions
                  .slice(0, showAllTxs ? transactions.length : 3)
                  .map((tx, index) => (
                    <tr
                      key={index}
                      className="border-b last:border-b-0 border-brandDark/50 hover:bg-brandMain/30 transition-base"
                    >
                      <td className="py-2 px-2 break-all text-brandAccent">
                        {tx.txId}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-100">
                        {tx.amount.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {tx.status === "completed" && (
                          <span className="text-green-400">Completed</span>
                        )}
                        {tx.status === "pending" && (
                          <span className="text-yellow-400">Pending</span>
                        )}
                        {tx.status === "failed" && (
                          <span className="text-red-400">Failed</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AuthenticatedDashboard;
