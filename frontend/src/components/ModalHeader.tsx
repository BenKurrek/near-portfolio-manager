import React from "react";
import { XIcon } from "@heroicons/react/outline";

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ title, onClose }) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-semibold text-gray-100">{title}</h2>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-200 focus:outline-none"
        aria-label="Close"
      >
        <XIcon className="h-6 w-6" />
      </button>
    </div>
  );
};

export default ModalHeader;
