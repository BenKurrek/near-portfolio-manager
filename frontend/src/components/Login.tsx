import React, { useState } from "react";
import {
  startAuthentication,
  AuthenticationResponseJSON,
} from "@simplewebauthn/browser";
import axios from "axios";
import { ContractMetadata } from "@utils/models/metadata";

interface LoginProps {
  onLoggedIn: (
    username: string,
    token: string,
    accountMetadata: ContractMetadata
  ) => void;
}

const Login: React.FC<LoginProps> = ({ onLoggedIn }) => {
  const [message, setMessage] = useState<string>("");

  const handleLogin = async () => {
    try {
      setMessage("Requesting login options...");

      // Get Login Options
      const { data: options } = await axios.post("/api/auth/login/options", {});

      setMessage("Please authenticate using your passkey...");

      // Start Authentication
      const assertionResponse: AuthenticationResponseJSON =
        await startAuthentication({ optionsJSON: options });

      setMessage("Verifying response...");

      // Verify
      const { data } = await axios.post("/api/auth/login/verify", {
        assertionResponse,
      });

      if (
        data.verified &&
        data.token &&
        data.username &&
        data.accountMetadata
      ) {
        setMessage("Login successful!");
        onLoggedIn(data.username, data.token, data.accountMetadata);
      } else {
        setMessage(data.error || "Login failed.");
      }
    } catch (error: any) {
      console.error(error);
      setMessage(
        error.response?.data?.error || "An error occurred during login."
      );
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleLogin}
        className="flex items-center justify-center w-full bg-gray-100 text-black py-2 px-4 rounded-md hover:bg-gray-300 transition border border-gray-300 text-md"
      >
        Log In
      </button>
      {message && (
        <p className="mt-2 text-sm text-center text-red-700">{message}</p>
      )}
    </div>
  );
};

export default Login;
