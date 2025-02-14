import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Toast: React.FC = () => {
  const { toastMessage, toastVisible, toastCounter } = useContext(AuthContext);

  return (
    <div
      className={`fixed top-4 transition-transform duration-300 ${
        toastVisible ? "right-4 translate-x-0" : "right-0 translate-x-full"
      }`}
      style={{ zIndex: 9999 }}
      role="alert"
      aria-live="assertive"
    >
      {toastMessage && (
        <div className="bg-green-600 text-white py-3 px-5 rounded shadow-lg flex flex-col items-center space-y-2 max-w-xs w-full">
          <span className="text-md font-medium text-center">
            {toastMessage}
          </span>

          {/* Progress Bar */}
          <div className="bg-white bg-opacity-30 h-2 w-full rounded overflow-hidden">
            <div
              key={toastCounter} // Use the toastCounter as a key to restart animation
              className="bg-white h-full"
              style={{ animation: "shrink 3s linear forwards" }}
            ></div>
          </div>

          {/* Animation Keyframes */}
          <style jsx>{`
            @keyframes shrink {
              from {
                width: 100%;
              }
              to {
                width: 0%;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default Toast;
