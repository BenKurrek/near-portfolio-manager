// src/modals/DepositModal.tsx
import React, { useContext, useState } from "react";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { AuthContext } from "../context/AuthContext";

const ClipboardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
  </svg>
);

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
  // Use accountMetadata from AuthContext (structured metadata)
  const { accountMetadata } = useContext(AuthContext);
  const depositAddress =
    accountMetadata?.contractMetadata?.contracts.userDepositAddress || "";
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!depositAddress) return;
    try {
      await navigator.clipboard.writeText(depositAddress);
      setCopySuccess("Address copied!");
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      setCopySuccess("Failed to copy address");
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
      <div className="bg-gray-800 rounded-lg shadow-lg w-full max-w-lg p-6 text-gray-100">
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Deposit Address
        </h2>
        {depositAddress ? (
          <>
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="bg-white rounded-lg p-2 shadow">
                  <QRCode
                    value={depositAddress}
                    size={200}
                    level="H"
                    bgColor="transparent"
                    includeMargin={false}
                  />
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg mb-4 break-all text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-mono">{depositAddress}</div>
                  <button
                    onClick={handleCopy}
                    className="ml-2 p-2 text-gray-300 hover:text-blue-400 transition"
                    title="Copy Address"
                  >
                    <ClipboardIcon />
                  </button>
                </div>
                {copySuccess && (
                  <div className="text-green-400 mt-2 text-sm text-center">
                    {copySuccess}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-400">
            No deposit address found. Are you logged in?
          </p>
        )}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepositModal;
