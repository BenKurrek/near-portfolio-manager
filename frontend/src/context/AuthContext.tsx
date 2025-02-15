// src/context/AuthContext.tsx

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { ContractMetadata } from "@utils/models/metadata";
import { apiService } from "@services/api";

/** Utility to generate a deposit address from the user’s sudo key */
function generateNearDepositAddress(sudoKey: string) {
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

  // On mount, check localStorage for token, then call whoami
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      apiService
        .whoami(storedToken)
        .then((res) => {
          const { username, userMetadata } = res;
          setUsername(username);
          setToken(storedToken);
          setAccountMetadata(userMetadata);

          // Derive deposit if user has a sudo_key
          if (userMetadata?.keys?.sudo_key) {
            setDerivedDepositAddress(
              generateNearDepositAddress(userMetadata.keys.sudo_key)
            );
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
        setDerivedDepositAddress(
          generateNearDepositAddress(metadata.keys.sudo_key)
        );
      }
    },
    []
  );

  const logout = useCallback(() => {
    // We'll also call apiService.logout if needed
    if (token) {
      apiService.logout(token).catch(() => {
        // even if it fails, still clear locally
      });
    }
    setUsername(null);
    setToken(null);
    setAccountMetadata(null);
    setDerivedDepositAddress(null);
    localStorage.removeItem("token");
  }, [token]);

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
