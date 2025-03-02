// src/components/Login.tsx
import React, { useState } from "react";
import {
  startAuthentication,
  AuthenticationResponseJSON,
} from "@simplewebauthn/browser";
import axios from "axios";
import type { AuthMetadata } from "@context/AuthContext";

interface LoginProps {
  onLoggedIn: (
    username: string,
    token: string,
    userMetadata: AuthMetadata
  ) => void;
}

const Login: React.FC<LoginProps> = ({ onLoggedIn }) => {
  const [message, setMessage] = useState<string>("");
  const [username, setUsername] = useState<string>("");

  const handleLogin = async () => {
    try {
      if (!username) {
        setMessage("Please enter your username.");
        return;
      }
      setMessage("Requesting login options...");

      // Pass the username in the login options request
      const { data: options } = await axios.post("/api/auth/login/options", {
        username,
      });

      setMessage("Please authenticate using your passkey...");

      // Start Authentication
      const assertionResponse: AuthenticationResponseJSON =
        await startAuthentication({ optionsJSON: options });

      setMessage("Verifying response...");

      // Pass both username and assertionResponse to verify endpoint
      const { data } = await axios.post("/api/auth/login/verify", {
        username,
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
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        className="w-full p-2 border border-gray-300 rounded-md text-black"
      />
      <button
        onClick={handleLogin}
        className="flex items-center justify-center w-full bg-gray-100 text-black py-2 px-4 rounded-md hover:bg-gray-300 transition border border-gray-300 text-md"
      >
        Log In
      </button>
      {message && (
        <p className="mt-2 text-sm text-center text-gray-200">{message}</p>
      )}
    </div>
  );
};

export default Login;
