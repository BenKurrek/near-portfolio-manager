// src/components/AuthenticatedDashboard.tsx
import React, { useState } from "react";
import DashboardHeader from "./Dashboard/DashboardHeader";
import BuyBundlesSection, { BundleInfo } from "./Dashboard/BuyBundlesSection";
import BuyBundleModal from "./Dashboard/BuyBundleModal";
import PortfolioBalancer from "./Dashboard/PortfolioBalancer";
import { bundles } from "@src/constants/bundles";
import ActivityHistory from "./Dashboard/ActivityHistory";

interface AuthenticatedDashboardProps {
  username: string | null;
  accountMetadata: any;
  userBalance: number;
  handleDepositClick: () => void;
  copied: boolean;
  setCopied: React.Dispatch<React.SetStateAction<boolean>>;
  balancerChartData: any;
  activities?: string[];
}

const AuthenticatedDashboard: React.FC<AuthenticatedDashboardProps> = ({
  username,
  accountMetadata,
  userBalance,
  activities,
  handleDepositClick,
  copied,
  setCopied,
  balancerChartData,
}) => {
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<BundleInfo | null>(null);

  const handleBuyClick = (bundle: BundleInfo) => {
    setSelectedBundle(bundle);
    setBuyModalOpen(true);
  };
  console.log("accountMetadata: ", balancerChartData);

  return (
    <div className="mt-8 space-y-12 bg-brandDark min-h-screen px-4 py-8 text-gray-100">
      <DashboardHeader
        username={username || ""}
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

      <PortfolioBalancer portfolioData={balancerChartData} />

      <ActivityHistory activities={activities} />

      {buyModalOpen && selectedBundle && (
        <BuyBundleModal
          isOpen={buyModalOpen}
          bundleId={selectedBundle.id}
          bundleTitle={selectedBundle.title}
          distribution={selectedBundle.distribution}
          userBalance={userBalance} // <-- Pass down your USDC balance
          onClose={() => {
            setBuyModalOpen(false);
            setSelectedBundle(null);
          }}
        />
      )}
    </div>
  );
};

export default AuthenticatedDashboard;
