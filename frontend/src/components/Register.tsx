import React, { useState } from "react";
import {
  startRegistration,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import axios from "axios";
import PasskeyIcon from "@src/icons/PasskeyIcon";

interface RegisterProps {
  onRegistered: (token: string) => void;
}

const Register: React.FC<RegisterProps> = ({ onRegistered }) => {
  const [username, setUsername] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const handleRegister = async () => {
    if (!username) {
      setMessage("Please enter a username.");
      return;
    }

    try {
      setMessage("Creating account...");
      // Create user
      const createUserResponse = await axios.post(
        "/api/auth/register/create-user",
        {
          username,
        }
      );

      if (createUserResponse.data.message === "User already exists") {
        setMessage("User already exists. Proceeding to registration...");
      } else {
        setMessage("User created. Generating registration options...");
      }

      // Get Registration Options
      const { data: options } = await axios.post("/api/auth/register/options", {
        username,
      });
      setMessage("Please complete registration with your passkey...");

      // Start
      const attestationResponse: RegistrationResponseJSON =
        await startRegistration({ optionsJSON: options });

      setMessage("Verifying registration...");

      // Verify
      const verifyData = await axios.post("/api/auth/register/verify", {
        username,
        attestationResponse,
      });

      if (verifyData.data.verified) {
        setMessage("Registration successful!");
        onRegistered(verifyData.data.token);
      } else {
        setMessage("Registration failed.");
      }
    } catch (error: any) {
      console.error(error);
      setMessage(
        error.response?.data?.error || "An error occurred during registration."
      );
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Username"
        className="border border-gray-300 rounded p-3 w-full text-black"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <div className="space-y-4">
        <button
          onClick={handleRegister}
          className="flex items-center justify-center w-full bg-gray-100 text-black py-2 px-4 rounded-md hover:bg-gray-300 transition border border-gray-300 text-md"
        >
          <PasskeyIcon className="mr-2 w-8 h-8" />
          Create Account With Passkey
        </button>
        {message && (
          <p className="mt-2 text-sm text-center text-red-700">{message}</p>
        )}
      </div>
    </div>
  );
};

export default Register;
