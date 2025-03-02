import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "@context/AuthContext";
import { BalanceContext } from "@src/context/BalanceContext";
import type { TokenDistribution } from "./BuyBundlesSection";
import { FlattenedToken } from "@src/types/tokens";
import { apiService } from "@services/api";
import ModalHeader from "@src/components/ModalHeader";
import { PriceContext } from "@src/context/PriceContext";

// Helper to get the matching defuse assetId for each token
const getDefuseAssetId = (
  allTokens: FlattenedToken[],
  symbol: string
): string => {
  const tokenInfo = allTokens.find((t) => t.symbol === symbol);
  if (!tokenInfo) return "";
  return tokenInfo.defuseAssetId;
};

export interface RawQuote {
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
    name: string;
    usdPrice: number;
    amount: number; // how many tokens user would get
  }[];
}

interface BuyBundleModalProps {
  isOpen: boolean;
  bundleId: string;
  bundleTitle: string;
  defaultAmount: number;
  distribution?: TokenDistribution[];
  userBalance: number; // Pass in the user’s total USDC
  onClose: () => void;
  onSuccess?: (jobId: string) => void;
}

const BuyBundleModal: React.FC<BuyBundleModalProps> = ({
  isOpen,
  bundleId,
  bundleTitle,
  defaultAmount,
  distribution,
  userBalance,
  onClose,
  onSuccess,
}) => {
  const { token } = useContext(AuthContext);
  const { prices } = useContext(PriceContext);
  const { allTokens } = useContext(BalanceContext);

  const [amount, setAmount] = useState<number>(defaultAmount);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteData, setQuoteData] = useState<BundleQuote | null>(null);
  const [error, setError] = useState<string>("");
  const [loadingPurchase, setLoadingPurchase] = useState(false);

  // Reset quote if user changes the amount
  useEffect(() => {
    setQuoteData(null);
  }, [amount]);

  if (!isOpen) return null;

  const userHasInsufficientBalance = amount > userBalance;

  const buildQuoteRequests = () => {
    if (!distribution) return [];
    // For USDC “in”, pick the user’s USDC token from allTokens
    const usdcAsset = allTokens.find((t) => t.symbol === "USDC");
    if (!usdcAsset) return [];

    return distribution.map((item) => {
      const portion = (amount * item.percentage) / 100;
      const tokenOutAssetId = getDefuseAssetId(allTokens, item.name);
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

    // If user has insufficient funds, do not proceed
    if (userHasInsufficientBalance) {
      setError("You do not have enough USDC to purchase this bundle.");
      return;
    }

    setQuoteLoading(true);
    setError("");
    setQuoteData(null);

    try {
      const quoteRequests = buildQuoteRequests();
      if (quoteRequests.length === 0) {
        setError("No tokens found in this bundle distribution.");
        return;
      }

      // Suppose your backend route returns { quotes: RawQuote[][] }
      const response = await apiService.getBundleQuotes(token, quoteRequests);

      if (response.quotes) {
        // Flatten the first RawQuote of each array
        const rawQuotes: RawQuote[] = response.quotes.map(
          (quoteArray: RawQuote[]) => (quoteArray ? quoteArray[0] : null)
        );

        const tokens = rawQuotes
          .map((rawQuote, index) => {
            if (!rawQuote || !distribution) return null;
            const dItem = distribution[index];
            const decimals = dItem.decimals || 0;
            return {
              percentage: dItem.percentage,
              logo: dItem.logo,
              name: dItem.name,
              amount: Number(rawQuote.amount_out) / 10 ** decimals,
              usdPrice: prices[dItem.name],
            };
          })
          .filter(Boolean) as BundleQuote["tokens"];

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
      const response = await apiService.buyBundle(token, bundleId, quoteData);

      if (response.success) {
        if (onSuccess) onSuccess(response.jobId);
        // Optionally show a toast or alert
        alert(`Buy bundle initiated. Job ID: ${response.jobId}`);
        onClose();
      } else {
        setError(response.message || "Failed to buy bundle.");
      }
    } catch (err) {
      console.error("Error buying bundle:", err);
      setError("An error occurred while buying the bundle.");
    } finally {
      setLoadingPurchase(false);
    }
  };

  // Decide which button label & action to show
  const buttonLabel = quoteData ? "Purchase Bundle" : "Get Quote";
  const buttonAction = quoteData ? handlePurchase : handleGetQuote;
  const isButtonLoading = quoteData ? loadingPurchase : quoteLoading;

  // Button disabled conditions:
  //  - If user has insufficient funds
  //  - If no positive amount is entered
  //  - If we’re in the middle of an action (loading)
  const isButtonDisabled =
    isButtonLoading || userHasInsufficientBalance || amount <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-brandDark text-gray-100 rounded-lg w-full max-w-md p-6 relative">
        {/* Modal Header */}
        <ModalHeader title={`Buy ${bundleTitle}`} onClose={onClose} />

        {/* Distribution Logos (shown by default) */}
        {distribution && (
          <div className="flex flex-wrap gap-3 mb-4">
            {distribution.map((dItem, i) => (
              <div
                key={`${dItem.name}-${i}`}
                className="flex items-center space-x-2 bg-gray-700 px-2 py-1 rounded"
              >
                <img
                  src={dItem.logo}
                  alt={dItem.name}
                  className="w-5 h-5 object-contain"
                />
                <span className="text-sm font-semibold">{dItem.name}</span>
                <span className="text-xs text-gray-400">
                  {dItem.percentage}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Amount in USDC */}
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
            className="w-full p-2 rounded bg-gray-700 focus:outline-none placeholder-gray-400"
          />
          {userHasInsufficientBalance && amount > 0 && (
            <p className="text-sm text-red-400 mt-1">
              You only have {userBalance.toLocaleString()} USDC available.
            </p>
          )}
        </div>

        {/* If a quote is fetched, display the approximate token amounts */}
        {quoteData && (
          <div className="bg-gray-800 p-3 rounded mb-4 text-sm space-y-2">
            <p className="text-gray-200 font-semibold">
              You will receive approximately:
            </p>
            {quoteData.tokens.map((t) => (
              <div
                key={t.name}
                className="flex items-center justify-between bg-gray-700 p-2 rounded"
              >
                <div className="flex items-center space-x-2">
                  <img
                    src={t.logo}
                    alt={t.name}
                    className="w-5 h-5 object-contain"
                  />
                  <span>{t.name}</span>
                </div>
                <span className="font-mono">
                  {t.amount.toFixed(6)} (~$
                  {Number(
                    Number(t.amount.toFixed(6)) * Number(t.usdPrice.toFixed(2))
                  ).toFixed(2)}
                  )
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

        {/* Bottom Right Action Button */}
        <div className="flex justify-end">
          <button
            onClick={buttonAction}
            disabled={isButtonDisabled}
            className={`${
              isButtonDisabled
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500"
            } text-white px-4 py-2 rounded transition-colors`}
          >
            {isButtonLoading ? "Please wait..." : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyBundleModal;
