// src/components/AuthenticatedDashboard.tsx
import React, { useContext, useState } from "react";
import DashboardHeader from "./Dashboard/DashboardHeader";
import BuyBundlesSection, { BundleInfo } from "./Dashboard/BuyBundlesSection";
import BuyBundleModal from "./Dashboard/BuyBundleModal";
import PortfolioBalancer from "./Dashboard/PortfolioBalancer";
import TransactionHistory from "./Dashboard/TransactionHistory";

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
  handleDepositClick: () => void;
  copied: boolean;
  setCopied: React.Dispatch<React.SetStateAction<boolean>>;
}

const AuthenticatedDashboard: React.FC<AuthenticatedDashboardProps> = ({
  username,
  accountMetadata,
  portfolioData,
  agentIds,
  userBalance,
  transactions,
  handleDepositClick,
  copied,
  setCopied,
}) => {
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<BundleInfo | null>(null);

  // Updated Bundles with distribution
  const bundles: BundleInfo[] = [
    {
      id: "bluechip",
      title: "Blue-Chip Bundle",
      description: "A selection of the most stable tokens on the market.",
      defaultAmount: 100,
      icon: <i className="fas fa-gem text-brandAccent text-xl" />,
      distribution: [
        { symbol: "ETH", percentage: 30 },
        { symbol: "SOL", percentage: 40 },
        { symbol: "BTC", percentage: 30 },
      ],
    },
    {
      id: "memecoin",
      title: "Memecoin Bundle",
      description:
        "Spice up your portfolio with the market’s most viral memecoins.",
      defaultAmount: 42,
      icon: <i className="fas fa-dog text-brandAccent text-xl" />,
      distribution: [
        { symbol: "DOGE", percentage: 20 },
        { symbol: "PEPE", percentage: 20 },
        { symbol: "WIF", percentage: 30 },
        { symbol: "Black Dragon", percentage: 30 },
      ],
    },
    {
      id: "defi",
      title: "DeFi Powerhouse",
      description:
        "Leading DeFi tokens like AAVE, UNI, and more for advanced yields.",
      defaultAmount: 50,
      icon: <i className="fas fa-exchange-alt text-brandAccent text-xl" />,
      distribution: [
        { symbol: "AAVE", percentage: 30 },
        { symbol: "UNI", percentage: 20 },
        { symbol: "XRP", percentage: 30 },
        { symbol: "NEAR", percentage: 20 },
      ],
    },
  ];

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

  const handleBuyClick = (bundle: BundleInfo) => {
    setSelectedBundle(bundle);
    setBuyModalOpen(true);
  };

  return (
    <div className="mt-8 space-y-12 bg-brandDark min-h-screen px-4 py-8 text-gray-100">
      <DashboardHeader
        username={username || ""}
        portfolioIds={portfolioData?.map((p: any) => p.id) || []}
        agentIds={agentIds}
        userBalance={userBalance}
        depositAddress={accountMetadata?.contracts?.userDepositAddress}
        copied={copied}
        onCopy={() => {
          if (accountMetadata?.contracts?.userDepositAddress) {
            navigator.clipboard.writeText(
              accountMetadata.contracts.userDepositAddress
            );
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        }}
        onDepositClick={handleDepositClick}
      />

      <BuyBundlesSection bundles={bundles} onBuyClick={handleBuyClick} />

      <PortfolioBalancer chartData={balancerChartData} />

      <TransactionHistory transactions={transactions} />

      {buyModalOpen && selectedBundle && (
        <BuyBundleModal
          isOpen={buyModalOpen}
          bundleId={selectedBundle.id}
          bundleTitle={selectedBundle.title}
          defaultAmount={selectedBundle.defaultAmount}
          distribution={selectedBundle.distribution}
          onClose={() => {
            setBuyModalOpen(false);
            setSelectedBundle(null);
          }}
          onSuccess={(jobId) => {
            console.log("Buy bundle initiated with jobId:", jobId);
          }}
        />
      )}
    </div>
  );
};

export default AuthenticatedDashboard;
