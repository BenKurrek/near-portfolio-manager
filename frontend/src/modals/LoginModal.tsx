// src/modals/LoginModal.tsx
import React from "react";
import Login from "../components/Login";
import Register from "../components/Register";
import type { AuthMetadata } from "@context/AuthContext";

interface LoginModalProps {
  handleLoggedIn: (
    username: string,
    token: string,
    userMetadata: AuthMetadata
  ) => void;
  handleRegistered: (token: string) => void;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const LoginModal: React.FC<LoginModalProps> = ({
  handleLoggedIn,
  handleRegistered,
  setShowModal,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="relative w-full max-w-md m-4 rounded-lg shadow-lg bg-brandDark text-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brandMain">
          <h2 className="text-xl font-bold tracking-wide text-brandAccent">
            Welcome
          </h2>
          <button
            onClick={() => setShowModal(false)}
            className="text-gray-400 hover:text-gray-200 text-2xl font-bold focus:outline-none transition-colors"
            aria-label="Close Modal"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-brandAccent">
              Create Account
            </h3>
            <Register
              onRegistered={(token: string) => {
                handleRegistered(token);
              }}
            />
          </div>
          <div className="flex items-center my-6">
            <hr className="flex-grow border-gray-600" />
            <span className="mx-2 text-gray-400 font-medium">OR</span>
            <hr className="flex-grow border-gray-600" />
          </div>
          <div>
            <Login
              onLoggedIn={(
                username: string,
                token: string,
                userMetadata: AuthMetadata
              ) => {
                handleLoggedIn(username, token, userMetadata);
                setShowModal(false);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
