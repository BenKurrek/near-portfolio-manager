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

export default function Register({ onRegistered }: RegisterProps) {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!username) {
      setMessage("Please enter a username.");
      setIsError(true);
      return;
    }

    try {
      setSubmitting(true);
      setMessage("Creating user record...");
      setIsError(false);

      // 1) Create user
      const createUserResponse = await axios.post(
        "/api/auth/register/create-user",
        { username }
      );
      if (createUserResponse.data.message === "User already exists") {
        setMessage("User already exists. Proceeding to registration...");
      } else {
        setMessage("User created. Generating registration options...");
      }
      setIsError(false);

      // 2) Get Registration Options
      const { data: options } = await axios.post("/api/auth/register/options", {
        username,
      });
      setMessage("Complete the passkey prompt...");
      setIsError(false);

      // 3) Start registration
      const attestationResponse: RegistrationResponseJSON =
        await startRegistration({ optionsJSON: options });

      setMessage("Verifying passkey...");
      setIsError(false);

      // 4) Verify registration
      const verifyData = await axios.post("/api/auth/register/verify", {
        username,
        attestationResponse,
      });

      if (verifyData.data.verified) {
        setMessage("Registration successful!");
        const freshToken = verifyData.data.token;
        onRegistered(freshToken);
      } else {
        setMessage("Registration failed.");
        setIsError(true);
      }
    } catch (error: any) {
      console.error(error);
      setMessage(
        error.response?.data?.error || "An error occurred during registration."
      );
      setIsError(true);
    } finally {
      setSubmitting(false);
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
          disabled={submitting}
          className="flex items-center justify-center w-full bg-gray-100 text-black py-2 px-4 rounded-md hover:bg-gray-300 transition border border-gray-300 text-md disabled:opacity-50"
        >
          {submitting ? (
            <div className="animate-spin mr-2 rounded-full border-t-2 border-b-2 border-gray-900 w-4 h-4"></div>
          ) : (
            <PasskeyIcon className="mr-2 w-8 h-8" />
          )}
          {submitting ? "Submitting..." : "Create Account With Passkey"}
        </button>

        {message && (
          <p
            className={`mt-2 text-sm text-center ${
              isError ? "text-red-500" : "text-gray-200"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
