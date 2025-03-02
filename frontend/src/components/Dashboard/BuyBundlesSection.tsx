// src/components/Dashboard/BuyBundlesSection.tsx
import React from "react";
import { useTokenContext } from "@context/TokenContext";

/** Each Bundle's distribution can store only: { symbol: string; percentage: number } */
export interface TokenDistribution {
  symbol: string; // e.g. "AAVE" or "PEPE"
  percentage: number; // e.g. 30
}

/** Info about the entire bundle. */
export interface BundleInfo {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  distribution: TokenDistribution[];
}

/** Props for this component. */
interface BuyBundlesSectionProps {
  bundles: BundleInfo[];
  onBuyClick: (bundle: BundleInfo) => void;
}

const BuyBundlesSection: React.FC<BuyBundlesSectionProps> = ({
  bundles,
  onBuyClick,
}) => {
  const { getTokenBySymbol } = useTokenContext();

  return (
    <section className="max-w-6xl mx-auto space-y-4">
      <h2 className="text-3xl font-bold">Buy Bundles</h2>
      <p className="text-gray-300">
        Instantly diversify into curated bundles of crypto.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {bundles.map((bundle) => (
          <div
            key={bundle.id}
            className="card bg-brandMain/40 hover:bg-brandMain/60 transition-base flex flex-col items-start gap-4 p-4 rounded-lg"
          >
            <div className="flex items-center gap-2">
              {bundle.icon && <div>{bundle.icon}</div>}
              <h3 className="text-xl font-semibold">{bundle.title}</h3>
            </div>
            <p className="text-gray-200">{bundle.description}</p>

            {/* Distribution list */}
            <div className="flex flex-col gap-1 mt-2">
              {bundle.distribution.map((distItem, idx) => {
                const token = getTokenBySymbol(distItem.symbol);
                if (!token) {
                  return (
                    <div key={idx} className="text-red-400 text-sm">
                      Unknown token: {distItem.symbol}
                    </div>
                  );
                }
                return (
                  <div key={idx} className="flex items-center text-sm gap-2">
                    {/* Use token.icon from the flattened data */}
                    <img
                      src={token.icon}
                      alt={token.name}
                      className="w-5 h-5 object-contain"
                    />
                    <span className="font-semibold">{token.symbol}</span>
                    <span className="text-gray-300">
                      {distItem.percentage}%
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              className="btn btn-outline mt-auto"
              onClick={() => onBuyClick(bundle)}
            >
              Buy Now
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BuyBundlesSection;
