// src/components/Dashboard/TransactionHistory.tsx
import React, { useState } from "react";
import { BsEye } from "react-icons/bs";

interface Transaction {
  txId: string;
  amount: number;
  status: "pending" | "completed" | "failed";
}

interface TransactionHistoryProps {
  transactions: Transaction[];
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
}) => {
  const [showAll, setShowAll] = useState(false);

  return (
    <section className="max-w-6xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Transaction History</h3>
        {transactions.length > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-brandAccent hover:text-brandAccent/80 transition-base flex items-center gap-1"
          >
            <span>{showAll ? "Show Less" : "Show More"}</span>
            <BsEye
              className={`w-5 h-5 transform ${showAll ? "rotate-180" : ""}`}
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
                <th className="py-2 px-2 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions
                .slice(0, showAll ? transactions.length : 3)
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
  );
};

export default TransactionHistory;
