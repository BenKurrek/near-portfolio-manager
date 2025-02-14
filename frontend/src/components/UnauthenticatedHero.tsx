// src/components/Homepage.tsx
import React from "react";

interface HomepageProps {
  onGetStarted: () => void;
}

const Homepage: React.FC<HomepageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen flex flex-col bg-brandDark text-gray-100">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-20 pb-32 bg-gradient-to-br from-brandDark to-brandMain">
        {/* Wave at bottom */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none rotate-180">
          <svg
            className="relative block w-[calc(100%+1.3px)] h-32 text-brandDark"
            preserveAspectRatio="none"
            viewBox="0 0 1200 120"
          >
            <path
              d="M985.66,56.07c59.6-3.79,112.09,10.85,161.94,22.82l52.4,11.74V0H0V71.94l41.83-1.87C125.85,66.39,251.7,60.7,377.57,75.41c111.32,13.09,221.92,42.59,333.88,43.72,118.23,1.2,234.22-31.67,351.26-46.06C898.09,62.74,941,57.95,985.66,56.07Z"
              fill="currentColor"
            ></path>
          </svg>
        </div>

        {/* Hero Content */}
        <h1 className="text-5xl sm:text-6xl font-extrabold mb-6 tracking-tight fade-in">
          Fluxfolio
        </h1>
        <p className="max-w-2xl text-lg sm:text-xl mb-10 fade-in">
          Your Trustless, AI-Powered Crypto Portfolio Manager. Deposit your
          stablecoins, then choose from curated bundles or let our automatic
          portfolio balancer optimize your holdings—all secured by decentralized
          smart contracts.
        </p>
        <button
          onClick={onGetStarted}
          className="btn btn-primary text-black hover:text-white transform hover:scale-105 mb-10"
        >
          Get Started
        </button>
      </section>

      {/* Features Section */}
      <section className="py-4 bg-brandDark text-center">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-8 fade-in">
            How Fluxfolio Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 fade-in">
            {/* Feature 1: Bundled Portfolios */}
            <div className="card hover:scale-[1.02]">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-brandAccent"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <h3 className="text-xl font-semibold mb-2">Curated Bundles</h3>
              <p className="text-gray-300 leading-relaxed">
                For non–crypto natives: Choose from thematic bundles like “The
                OG Bundle” or fun meme mixes to diversify instantly.
              </p>
            </div>

            {/* Feature 2: Auto-Balancer */}
            <div className="card hover:scale-[1.02]">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-brandAccent"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6l4 2m-4 10a9 9 0 110-18 9 9 0 010 18z"
                />
              </svg>
              <h3 className="text-xl font-semibold mb-2">Auto-Balancer</h3>
              <p className="text-gray-300 leading-relaxed">
                Use intuitive sliders and automation to rebalance your portfolio
                to predefined conditions—zero manual intervention required.
              </p>
            </div>

            {/* Feature 3: Trustless & Secure */}
            <div className="card hover:scale-[1.02]">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-brandAccent"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 17l.664 2a2.25 2.25 0 004.172 0l.664-2M12 2.25c1.956 0 3.75.758 5.107 2.107a7.196 7.196 0 012.106 5.108c0 1.393-.41 2.775-1.185 3.94-.47.704-.701 1.612-.516 2.53l.384 1.912c.11.545-.503.9-.915.538l-2.065-1.79a1.126 1.126 0 00-.838-.258c-.553.066-1.115.1-1.68.1s-1.128-.034-1.681-.1a1.126 1.126 0 00-.837.258l-2.066 1.79c-.412.362-1.026.007-.915-.538l.384-1.912c.185-.918-.045-1.826-.515-2.53A7.195 7.195 0 014.5 9.465 7.196 7.196 0 016.607 4.357 7.195 7.195 0 0111.715 2.25h.285z"
                />
              </svg>
              <h3 className="text-xl font-semibold mb-2">Trustless Security</h3>
              <p className="text-gray-300 leading-relaxed">
                Funds remain safe in a decentralized proxy contract leveraging
                MPC signatures—your keys, your control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section className="py-12 text-center fade-in">
        <h2 className="text-3xl font-bold mb-4">Ready to Get in Flux?</h2>
        <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
          Sign up using your passkey, deposit your stables, and let Fluxfolio do
          the heavy lifting.
        </p>
        <button
          onClick={onGetStarted}
          className="btn btn-primary text-black hover:text-white hover:scale-105"
        >
          Get Started Now
        </button>
      </section>
    </div>
  );
};

export default Homepage;
