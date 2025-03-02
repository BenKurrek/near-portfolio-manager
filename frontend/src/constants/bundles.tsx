import { BundleInfo } from "@src/components/Dashboard/BuyBundlesSection";

export const bundles: BundleInfo[] = [
  {
    id: "bluechip",
    title: "Blue-Chip Bundle",
    description: "A selection of the most stable tokens on the market.",
    icon: <i className="fas fa-gem text-brandAccent text-xl" />,
    distribution: [
      { symbol: "ETH", percentage: 25 },
      { symbol: "BTC", percentage: 25 },
      { symbol: "SOL", percentage: 15 },
      { symbol: "NEAR", percentage: 35 },
    ],
  },
  {
    id: "memecoin",
    title: "Memecoin Bundle",
    description:
      "Spice up your portfolio with the market’s most viral memecoins.",
    icon: <i className="fas fa-dog text-brandAccent text-xl" />,
    distribution: [
      { symbol: "WIF", percentage: 30 },
      { symbol: "PEPE", percentage: 25 },
      { symbol: "SHIB", percentage: 25 },
      { symbol: "MOG", percentage: 20 },
    ],
  },
  {
    id: "defi",
    title: "DeFi Powerhouse",
    description:
      "Leading DeFi tokens like AAVE, UNI, and more for advanced yields.",
    icon: <i className="fas fa-exchange-alt text-brandAccent text-xl" />,
    distribution: [
      { symbol: "AAVE", percentage: 30 },
      { symbol: "UNI", percentage: 20 },
      { symbol: "DAI", percentage: 30 },
      { symbol: "LINK", percentage: 20 },
    ],
  },
];
