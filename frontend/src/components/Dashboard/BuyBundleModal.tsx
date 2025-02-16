// Inside BuyBundleModal.tsx
import React, { useState, useContext, useEffect } from "react";
import { apiService } from "@services/api";
import { AuthContext } from "@context/AuthContext";
// Import your big token list
import type { TokenDistribution } from "./BuyBundlesSection";
import { LIST_TOKENS } from "@src/constants/tokens";
import { FlattenedToken } from "@src/types/tokens";
import { BalanceContext } from "@src/context/BalanceContext";

// Optionally, define a helper to extract a token’s defuse asset id:
const getDefuseAssetId = (
  allTokens: FlattenedToken[],
  symbol: string
): string => {
  const tokenInfo = allTokens.find((t) => t.symbol === symbol);
  if (!tokenInfo) return "";
  return tokenInfo.defuseAssetId;
};

interface BundleQuote {
  success: boolean;
  tokens: {
    symbol: string;
    amount: number; // how many tokens user would get
  }[];
}

interface BuyBundleModalProps {
  isOpen: boolean;
  bundleId: string;
  bundleTitle: string;
  defaultAmount: number;
  onClose: () => void;
  onSuccess?: (jobId: string) => void;
  distribution?: TokenDistribution[];
}

const BuyBundleModal: React.FC<BuyBundleModalProps> = ({
  isOpen,
  bundleId,
  bundleTitle,
  defaultAmount,
  onClose,
  onSuccess,
  distribution,
}) => {
  const { token } = useContext(AuthContext);
  const { allTokens } = useContext(BalanceContext);
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteData, setQuoteData] = useState<BundleQuote | null>(null);

  useEffect(() => {
    // Reset quote when user changes the amount
    setQuoteData(null);
  }, [amount]);

  if (!isOpen) return null;

  // Helper: Build an array of quote requests from the bundle distribution
  const buildQuoteRequests = () => {
    if (!distribution) return [];
    // For USDC “in”, you could pick one of the USDC tokens from your list.
    // For example, here we take the first USDC grouped token.
    const usdcAsset = allTokens.find((t) => t.symbol === "USDC");
    if (!usdcAsset) return [];

    return distribution.map((item) => {
      // Calculate the USDC amount allocated for this token
      const portion = (amount * item.percentage) / 100;
      const tokenOutAssetId = getDefuseAssetId(allTokens, item.symbol);
      return {
        defuse_asset_identifier_in: usdcAsset.defuseAssetId,
        defuse_asset_identifier_out: tokenOutAssetId,
        exact_amount_in: (
          Number(portion.toString()) *
          10 ** usdcAsset.decimals
        ).toString(),
      };
    });
  };

  const handleGetQuote = async () => {
    if (!token) {
      setError("You must be logged in to get a quote.");
      return;
    }
    setQuoteLoading(true);
    setError("");
    setQuoteData(null);

    try {
      const items = buildQuoteRequests();
      // Call our new API route that handles multiple quote requests
      const response = await apiService.getBundleQuotes(token, items);
      console.log("response: ", response);
      if (response.quotes) {
        // For example, you might want to reformat the response to display nicely
        // (assuming response.quotes is an array with one quote per token)
        const tokens = response.quotes.map((quote: any, idx: number) => ({
          symbol: distribution ? distribution[idx].symbol : "N/A",
          // Assume each fetchQuote call returns an array and we take the first result:
          amount: quote && quote[0] ? Number(quote[0].amount) : 0,
        }));
        setQuoteData({ success: true, tokens });
      } else {
        setError(response.message || "Failed to fetch quote.");
      }
    } catch (err) {
      console.error("Error fetching quote:", err);
      setError("An error occurred while fetching the quote.");
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!token) {
      setError("You must be logged in.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await apiService.buyBundle(token, bundleId, amount);
      if (response.success) {
        onSuccess && onSuccess(response.jobId);
        alert(`Buy bundle initiated. Job ID: ${response.jobId}`);
        onClose();
      } else {
        setError(response.message || "Failed to buy bundle.");
      }
    } catch (err) {
      console.error("Error buying bundle:", err);
      setError("An error occurred while buying the bundle.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="relative w-full max-w-md m-4 rounded-lg shadow-lg bg-brandDark text-gray-100 p-6">
        <h2 className="text-xl font-bold mb-4">Buy {bundleTitle}</h2>

        <label className="block mb-2">
          <span className="text-sm">Amount (in USDC)</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            min="1"
            className="w-full p-2 mt-1 rounded bg-gray-700 text-gray-100"
          />
        </label>

        {/* Quote Section */}
        <div className="mt-4">
          {!quoteData && !quoteLoading && (
            <button
              className="btn btn-secondary"
              onClick={handleGetQuote}
              disabled={!amount}
            >
              Get Quote
            </button>
          )}

          {quoteLoading && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">Fetching quote...</p>
              <div className="w-full flex flex-col gap-2 animate-pulse">
                <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                <div className="h-4 bg-gray-600 rounded w-1/2"></div>
                <div className="h-4 bg-gray-600 rounded w-2/3"></div>
              </div>
            </div>
          )}

          {quoteData && !quoteLoading && (
            <div className="mt-4 space-y-2">
              <h3 className="text-lg font-semibold">You will receive:</h3>
              {quoteData.tokens.map((t) => (
                <div key={t.symbol} className="flex justify-between text-sm">
                  <span>{t.symbol}</span>
                  <span className="font-mono">{t.amount.toFixed(6)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-400 mb-2 mt-4">{error}</p>}

        <div className="flex justify-end gap-4 mt-4">
          <button
            onClick={onClose}
            className="btn btn-outline hover:bg-gray-700"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="btn btn-primary"
            disabled={loading || !quoteData}
          >
            {loading ? "Processing..." : "Confirm Purchase"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyBundleModal;
