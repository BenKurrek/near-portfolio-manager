// src/context/AuthContext.tsx

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import axios from "axios";
import { ContractMetadata } from "../utils/models/metadata";

/** Utility to generate a deposit address from the user’s sudo key */
function generateNearDepositAddress(sudoKey: string) {
  // Example: Just returns a "fake" near deposit address
  const someHash = sudoKey.slice(8, 16);
  return `dep-${someHash}.intents.near`;
}

interface AuthContextType {
  username: string | null;
  token: string | null;
  accountMetadata: ContractMetadata | null;
  login: (
    uname: string,
    tok: string,
    metadata: ContractMetadata | null
  ) => void;
  logout: () => void;
  derivedDepositAddress: string | null;
}

export const AuthContext = createContext<AuthContextType>({
  username: null,
  token: null,
  accountMetadata: null,
  login: () => {},
  logout: () => {},
  derivedDepositAddress: null,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [username, setUsername] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [accountMetadata, setAccountMetadata] =
    useState<ContractMetadata | null>(null);
  const [derivedDepositAddress, setDerivedDepositAddress] = useState<
    string | null
  >(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios
        .get(`/api/auth/user/whoami?token=${storedToken}`)
        .then((response) => {
          const { username, userMetadata } = response.data;
          setUsername(username);
          setToken(storedToken);
          setAccountMetadata(userMetadata);

          // Derive deposit address if we have a sudo key
          if (userMetadata?.keys?.sudo_key) {
            const depAddr = generateNearDepositAddress(
              userMetadata.keys.sudo_key
            );
            setDerivedDepositAddress(depAddr);
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
        });
    }
  }, []);

  const login = useCallback(
    (uname: string, tok: string, metadata: ContractMetadata | null) => {
      setUsername(uname);
      setToken(tok);
      setAccountMetadata(metadata);
      localStorage.setItem("token", tok);

      if (metadata?.keys?.sudo_key) {
        const depAddr = generateNearDepositAddress(metadata.keys.sudo_key);
        setDerivedDepositAddress(depAddr);
      }
    },
    []
  );

  const logout = useCallback(() => {
    setUsername(null);
    setToken(null);
    setAccountMetadata(null);
    setDerivedDepositAddress(null);
    localStorage.removeItem("token");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        username,
        token,
        accountMetadata,
        login,
        logout,
        derivedDepositAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
