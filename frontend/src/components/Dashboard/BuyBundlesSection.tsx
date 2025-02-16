// src/components/Dashboard/BuyBundlesSection.tsx

import React from "react";

const tokenLogos: Record<string, string> = {
  ETH: "/static/icons/network/ethereum.svg",
  SOL: "/static/icons/network/solana.svg",
  BTC: "/static/icons/network/btc.svg",
  DOGE: "/static/icons/network/dogecoin.svg",
  XRP: "/static/icons/network/xrpledger.svg",
  NEAR: "/static/icons/network/near.svg",

  PEPE: "	https://s2.coinmarketcap.com/static/img/coins/128x128/24478.png",
  WIF: "https://s2.coinmarketcap.com/static/img/coins/128x128/28752.png",
  "Black Dragon":
    "	https://s2.coinmarketcap.com/static/img/coins/128x128/29627.png",
  AAVE: "https://s2.coinmarketcap.com/static/img/coins/128x128/7278.png",
  UNI: "https://s2.coinmarketcap.com/static/img/coins/128x128/7083.png",
};

export interface TokenDistribution {
  symbol: string;
  percentage: number;
}

export interface BundleInfo {
  id: string;
  title: string;
  description: string;
  defaultAmount: number;
  icon?: React.ReactNode;
  distribution: TokenDistribution[];
}

interface BuyBundlesSectionProps {
  bundles: BundleInfo[];
  onBuyClick: (bundle: BundleInfo) => void;
}

const BuyBundlesSection: React.FC<BuyBundlesSectionProps> = ({
  bundles,
  onBuyClick,
}) => {
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
            {/* Top area: Bundle icon + title */}
            <div className="flex items-center gap-2">
              {bundle.icon && (
                <div className="text-brandAccent text-xl">{bundle.icon}</div>
              )}
              <h3 className="text-xl font-semibold">{bundle.title}</h3>
            </div>

            <p className="text-gray-200">{bundle.description}</p>

            {/* Distribution list */}
            <div className="flex flex-col gap-1 mt-2">
              {bundle.distribution.map((tokenItem, idx) => (
                <div key={idx} className="flex items-center text-sm gap-2">
                  <img
                    src={tokenLogos[tokenItem.symbol] || ""}
                    alt={tokenItem.symbol}
                    className="w-5 h-5 object-contain"
                  />
                  <span className="font-semibold">{tokenItem.symbol}</span>
                  <span className="text-gray-300">{tokenItem.percentage}%</span>
                </div>
              ))}
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
