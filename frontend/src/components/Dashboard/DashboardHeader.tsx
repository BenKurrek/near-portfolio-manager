// src/components/Dashboard/DashboardHeader.tsx
import React from "react";
import { FaUserAlt, FaDollarSign } from "react-icons/fa";
import { FiCopy } from "react-icons/fi";

interface DashboardHeaderProps {
  username: string;
  userBalance: number;
  depositAddress?: string;
  copied: boolean;
  onCopy: () => void;
  onDepositClick: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  username,
  userBalance,
  depositAddress,
  copied,
  onCopy,
  onDepositClick,
}) => {
  return (
    <section className="bg-gradient-to-r from-brandDark to-brandMain p-6 rounded-lg shadow space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-brandAccent rounded-full shadow-md text-white">
          <FaUserAlt className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold">{username}</h2>
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
        <button className="btn btn-primary" onClick={onDepositClick}>
          Deposit USDC
        </button>
      </div>
      <div className="bg-brandDark/30 p-4 rounded-md flex justify-between items-center">
        <div>
          <p className="text-sm mb-1">Deposit Address</p>
          {depositAddress ? (
            <p className="font-mono text-sm break-all">{depositAddress}</p>
          ) : (
            <span className="text-sm text-red-400">No deposit address</span>
          )}
        </div>
        <button onClick={onCopy} className="p-2 bg-brandAccent rounded-md">
          {copied ? <span>Copied!</span> : <FiCopy className="w-5 h-5" />}
        </button>
      </div>
    </section>
  );
};

export default DashboardHeader;
