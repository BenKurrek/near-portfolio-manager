// src/components/Dashboard/PortfolioBalancer.tsx
import React, { useContext } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";
import { PriceContext } from "@src/context/PriceContext";
import SkeletonLoader from "../SkeletonLoader";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface PortfolioToken {
  name: string;
  logo: string;
  percentage: number;
  amount: number;
  value: number; // Total USD value for that token
}

interface PortfolioData {
  tokens: PortfolioToken[];
  totalBalance: number;
  // Data used for the Pie chart
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
    borderColor?: string[];
  }[];
}

interface PortfolioBalancerProps {
  portfolioData: PortfolioData;
}

const PortfolioBalancer: React.FC<PortfolioBalancerProps> = ({
  portfolioData,
}) => {
  const { loading: priceLoading } = useContext(PriceContext);
  console.log(portfolioData);

  // If price data is still loading, show a partial skeleton just for the chart portion
  if (priceLoading) {
    return (
      <section className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold">Portfolio Overview</h2>
        <p className="text-gray-300">Loading token prices...</p>
        <SkeletonLoader width="100%" height="300px" />
      </section>
    );
  }

  // If there are no tokens in the portfolio, show an empty state
  if (portfolioData.tokens.length === 0) {
    return (
      <section className="max-w-6xl mx-auto space-y-6 flex flex-col items-center justify-center h-96">
        <h2 className="text-3xl font-bold">Portfolio Overview</h2>
        <p className="text-gray-300 text-center">
          Your portfolio is currently empty. Start by buying a bundle to see
          your portfolio details.
        </p>
        <div className="mt-6 p-6 bg-brandMain/20 rounded-lg shadow-lg">
          <p className="text-lg text-gray-100">No tokens available.</p>
        </div>
      </section>
    );
  }

  // Render the portfolio details if tokens exist
  return (
    <section className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold">Portfolio Overview</h2>
      <p className="text-gray-300">
        Detailed view of your holdings, including allocation percentages,
        current token prices, and total portfolio balance.
      </p>
      <div className="flex flex-col md:flex-row gap-6 mt-4">
        {/* Pie Chart Section */}
        <div className="md:w-1/2 bg-brandMain/20 p-6 rounded-lg shadow-lg">
          <Pie
            data={{
              labels: portfolioData.labels,
              datasets: portfolioData.datasets,
            }}
            options={{
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: "Current Distribution",
                  color: "#fff",
                  font: { size: 18 },
                },
                legend: {
                  labels: { color: "#eee" },
                },
              },
            }}
          />
        </div>
        {/* Token Details Section */}
        <div className="md:w-1/2 bg-brandMain/20 p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-bold mb-4">Token Details</h3>
          <ul className="space-y-4">
            {portfolioData.tokens.map((token) => (
              <li
                key={token.name}
                className="flex items-center justify-between border-b border-gray-600 pb-2"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={token.logo}
                    alt={token.name}
                    className="w-8 h-8 object-contain"
                  />
                  <span className="font-semibold text-gray-100">
                    {token.name}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-300">{token.percentage}%</p>
                  <p className="text-sm text-gray-300">
                    {token.amount.toLocaleString()}
                  </p>
                  <p className="text-lg font-bold text-gray-100">
                    ${token.value.toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-gray-600 pt-4">
            <p className="text-2xl font-extrabold text-gray-100">
              Total Balance: ${portfolioData.totalBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PortfolioBalancer;
