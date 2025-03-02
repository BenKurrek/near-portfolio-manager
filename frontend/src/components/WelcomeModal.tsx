// components/WelcomeModal.tsx

import React from "react";

interface WelcomeModalProps {
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
      <div className="bg-gray-800 rounded-lg shadow-lg w-full max-w-lg p-6 text-gray-100">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Welcome to Fluxfolio!
        </h2>
        <p className="text-center mb-6">
          Your account has been successfully created.
        </p>

        <div className="space-y-4 text-sm">
          <div className="bg-gray-700 rounded p-4">
            <h3 className="font-semibold text-lg mb-2 text-brandAccent">
              Step 1: Deposit
            </h3>
            <p className="text-gray-200">
              Send USDC (or other supported tokens) to your new deposit address.
            </p>
          </div>
          <div className="bg-gray-700 rounded p-4">
            <h3 className="font-semibold text-lg mb-2 text-brandAccent">
              Step 2: Buy a Bundle
            </h3>
            <p className="text-gray-200">
              Instantly diversify by purchasing one of our curated bundles.
            </p>
          </div>
          <div className="bg-gray-700 rounded p-4">
            <h3 className="font-semibold text-lg mb-2 text-brandAccent">
              Step 3: Automation
            </h3>
            <p className="text-gray-200">
              Our automatic portfolio balancer keeps your allocation on track,
              so you can enjoy set-it-and-forget-it crypto investing.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-brandAccent text-black rounded hover:bg-brandAccent/90 transition"
          >
            Let’s Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
