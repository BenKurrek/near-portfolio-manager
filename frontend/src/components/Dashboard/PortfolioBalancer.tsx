// src/components/Dashboard/PortfolioBalancer.tsx
import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface PortfolioBalancerProps {
  chartData: any;
}

const PortfolioBalancer: React.FC<PortfolioBalancerProps> = ({ chartData }) => {
  return (
    <section className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold">Portfolio Balancer</h2>
      <p className="text-gray-300">
        Keep your allocations aligned with automatically triggered rebalancing.
      </p>
      <div className="flex flex-col md:flex-row gap-6 md:items-center mt-4">
        <div className="md:w-1/2 bg-brandMain/20 p-4 rounded-md">
          <Pie
            data={chartData}
            options={{
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: "Current Distribution",
                  color: "#fff",
                  font: { size: 16 },
                },
                legend: {
                  labels: { color: "#eee" },
                },
              },
            }}
          />
        </div>
        <div className="md:w-1/2 space-y-4">
          <p className="text-gray-200">
            Example distribution: <strong>USDC 50%, ETH 25%, Others 25%</strong>
          </p>
          <button className="btn btn-outline">Set Up Balancer</button>
        </div>
      </div>
    </section>
  );
};

export default PortfolioBalancer;
