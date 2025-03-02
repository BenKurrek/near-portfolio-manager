import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "@context/AuthContext";
import { BalanceContext } from "@src/context/BalanceContext";
import type { TokenDistribution } from "./BuyBundlesSection";
import { apiService } from "@services/api";
import ModalHeader from "@src/components/ModalHeader";
import { PriceContext } from "@src/context/PriceContext";
import { useTokenContext } from "@context/TokenContext";
import { JobContext } from "@src/context/JobContext";

interface RawQuote {
  amount_in: string;
  amount_out: string;
  defuse_asset_identifier_in: string;
  defuse_asset_identifier_out: string;
  expiration_time: string;
  quote_hash: string;
}

export interface BundleQuote {
  success: boolean;
  rawQuotes: RawQuote[];
  tokens: {
    percentage: number;
    logo: string;
    name: string; // symbol or friendly name
    usdPrice: number;
    amount: number; // how many tokens user would get (NaN if failed)
    failed: boolean;
  }[];
}

interface BuyBundleModalProps {
  isOpen: boolean;
  bundleId: string;
  bundleTitle: string;
  distribution?: TokenDistribution[];
  userBalance: number;
  onClose: () => void;
  onSuccess?: (jobId: string) => void;
}

const BuyBundleModal: React.FC<BuyBundleModalProps> = ({
  isOpen,
  bundleId,
  bundleTitle,
  distribution,
  userBalance,
  onClose,
}) => {
  const { token } = useContext(AuthContext);
  const { prices } = useContext(PriceContext);
  const { startJob } = useContext(JobContext);
  const { allTokens } = useContext(BalanceContext);
  const { getTokenBySymbol } = useTokenContext();

  const [amount, setAmount] = useState<number>(userBalance);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteData, setQuoteData] = useState<BundleQuote | null>(null);
  const [error, setError] = useState<string>("");
  const [loadingPurchase, setLoadingPurchase] = useState(false);

  // Reset quote data if amount changes
  useEffect(() => {
    setQuoteData(null);
  }, [amount]);

  if (!isOpen) return null;

  const userHasInsufficientBalance = amount > userBalance;

  /**
   * For each distribution item, build a "quote request" from USDC -> that token.
   */
  const buildQuoteRequests = () => {
    if (!distribution) return [];
    const usdcAsset = allTokens.find(
      (t) => t.symbol === "USDC" && t.chainName === "base"
    );
    if (!usdcAsset) return [];

    return distribution
      .map((item) => {
        const portion = (amount * item.percentage) / 100;
        const tokenOut = getTokenBySymbol(item.symbol);
        if (!tokenOut) return null;
        const portionInAtomic = portion * 10 ** usdcAsset.decimals;
        return {
          defuse_asset_identifier_in: usdcAsset.defuseAssetId,
          defuse_asset_identifier_out: tokenOut.defuseAssetId,
          exact_amount_in: portionInAtomic.toFixed(0),
        };
      })
      .filter(Boolean);
  };

  const handleGetQuote = async () => {
    if (!token) {
      setError("You must be logged in to get a quote.");
      return;
    }
    if (userHasInsufficientBalance) {
      setError("You do not have enough USDC to purchase this bundle.");
      return;
    }

    setQuoteLoading(true);
    setError("");
    setQuoteData(null);

    try {
      const quoteRequests = buildQuoteRequests();
      if (!quoteRequests.length) {
        setError("No tokens found in this bundle distribution.");
        return;
      }

      // Call your backend route: GET /api/quote/fetch-quotes
      const response = await apiService.getBundleQuotes(token, quoteRequests);

      if (response.quotes) {
        // response.quotes is an array of arrays; take the first quote from each
        const rawQuotes: RawQuote[] = response.quotes.map((arr: RawQuote[]) =>
          arr ? arr[0] : null
        );
        console.log("rawQuotes", rawQuotes);

        // Build tokens array for display
        const tokens = rawQuotes
          .map((rawQuote, index) => {
            if (!distribution) return null;
            const dItem = distribution[index];
            const outToken = getTokenBySymbol(dItem.symbol);
            if (!outToken) return null;

            const usdPrice = prices[outToken.symbol] || 0;
            if (!rawQuote) {
              // Quote failed for this token
              return {
                percentage: dItem.percentage,
                logo: outToken.icon,
                name: outToken.symbol,
                usdPrice,
                amount: NaN,
                failed: true,
              };
            }

            const decimals = outToken.decimals;
            const amountOut = Number(rawQuote.amount_out) / 10 ** decimals;
            return {
              percentage: dItem.percentage,
              logo: outToken.icon,
              name: outToken.symbol,
              usdPrice,
              amount: amountOut,
              failed: false,
            };
          })
          .filter(Boolean) as BundleQuote["tokens"][number][];

        setQuoteData({ success: true, rawQuotes, tokens });
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

  const handlePurchase = async () => {
    if (!token || !quoteData) {
      setError("Please get a quote first.");
      return;
    }
    if (userHasInsufficientBalance) {
      setError("Insufficient USDC balance.");
      return;
    }

    setLoadingPurchase(true);
    setError("");

    try {
      // Call the job context to start a buy-bundle job.
      startJob("buy-bundle", token, { bundleId, quoteData });
      onClose();
    } catch (err) {
      console.error("Error starting buy bundle job:", err);
      setError("An error occurred while initiating the buy bundle job.");
    } finally {
      setLoadingPurchase(false);
    }
  };

  // Decide the button’s text & action
  const buttonLabel = quoteData ? "Purchase Bundle" : "Get Quote";
  const buttonAction = quoteData ? handlePurchase : handleGetQuote;
  const isButtonLoading = quoteData ? loadingPurchase : quoteLoading;

  // Disable if insufficient funds, zero amount, or if loading
  const isButtonDisabled =
    isButtonLoading || userHasInsufficientBalance || amount <= 0;

  // Calculate total price in USD using only tokens with valid quotes
  const totalPrice = quoteData
    ? quoteData.tokens.reduce((total, t) => {
        if (!t.failed && !isNaN(t.amount)) {
          return total + t.amount * t.usdPrice;
        }
        return total;
      }, 0)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-brandDark text-gray-100 rounded-lg w-full max-w-md p-6 relative shadow-lg transform transition-all duration-300 scale-100">
        <ModalHeader title={`Buy ${bundleTitle}`} onClose={onClose} />

        {/* Distribution Tokens */}
        {distribution && (
          <div className="flex flex-wrap gap-3 mb-4">
            {distribution.map((dItem, i) => {
              const outToken = getTokenBySymbol(dItem.symbol);
              if (!outToken) return null;
              return (
                <div
                  key={`${dItem.symbol}-${i}`}
                  className="flex items-center space-x-2 bg-gray-700 px-2 py-1 rounded-full"
                >
                  <img
                    src={outToken.icon}
                    alt={outToken.symbol}
                    className="w-5 h-5 object-contain"
                  />
                  <span className="text-sm font-semibold">
                    {outToken.symbol}
                  </span>
                  <span className="text-xs text-gray-400">
                    {dItem.percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Amount (USDC)
          </label>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              setAmount(val);
            }}
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />
          {userHasInsufficientBalance && amount > 0 && (
            <p className="text-sm text-red-400 mt-1">
              You only have {userBalance.toLocaleString()} USDC available.
            </p>
          )}
        </div>

        {/* Quote Display */}
        {quoteData && (
          <div className="p-4 rounded-md mb-4 border border-gray-700 shadow-sm bg-gray-900">
            <p className="text-lg font-semibold text-gray-100 mb-3">
              You will receive approximately:
            </p>
            <div className="space-y-3">
              {quoteData.tokens.map((t, index) => (
                <div
                  key={`${t.name}-${index}`}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <img src={t.logo} alt={t.name} className="w-6 h-6" />
                    <span className="text-base text-gray-200">{t.name}</span>
                  </div>
                  <span className="font-mono text-gray-300">
                    {t.failed || isNaN(t.amount)
                      ? "Failed to fetch quote"
                      : `${t.amount.toFixed(6)} (~$${(
                          t.amount * t.usdPrice
                        ).toFixed(2)})`}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-2 border-t border-gray-700 flex items-center justify-between">
              <span className="font-semibold text-gray-100">Total (USD):</span>
              <span className="font-mono text-gray-300">
                ${totalPrice.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="flex items-center text-red-400 text-sm mb-2">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M18.364 5.636l-1.414-1.414L12 9.172 7.05 4.222 5.636 5.636 10.586 10.586 5.636 15.536l1.414 1.414L12 12 16.95 16.95l1.414-1.414L13.414 10.586l5.95-5.95z"
              ></path>
            </svg>
            {error}
          </p>
        )}

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            onClick={buttonAction}
            disabled={isButtonDisabled}
            className={`${
              isButtonDisabled
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500"
            } text-white px-4 py-2 rounded transition-colors flex items-center`}
          >
            {isButtonLoading && (
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            {isButtonLoading ? "Please wait..." : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyBundleModal;
