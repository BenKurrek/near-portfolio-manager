// src/context/AuthContext.tsx

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { apiService } from "@services/api";

/**
 * The shape of the user’s metadata from whoami, combining
 * contract data + portfolio data + agent IDs.
 */
export interface AuthMetadata {
  contractMetadata: {
    keys: { sudo_key: string };
    contracts: {
      userDepositAddress: string;
      userContractId: string;
      mpcContractId: string;
    };
  };
  portfolioData: any;
  agentIds: string[];
}

interface AuthContextType {
  username: string | null;
  token: string | null;
  accountMetadata: AuthMetadata | null; // This holds contract data, portfolio, agent IDs
  login: (uname: string, tok: string, userMetadata: AuthMetadata) => void;
  logout: () => void;
}

/**
 * Default context
 */
export const AuthContext = createContext<AuthContextType>({
  username: null,
  token: null,
  accountMetadata: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [username, setUsername] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [accountMetadata, setAccountMetadata] = useState<AuthMetadata | null>(
    null
  );

  /**
   * On first load, check localStorage for a token and validate with whoami.
   */
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      apiService
        .whoami(storedToken)
        .then((res) => {
          setUsername(res.username);
          setToken(storedToken);
          // The whoami endpoint returns `userMetadata` which includes
          // contractMetadata, portfolioData, agentIds
          setAccountMetadata(res.userMetadata);
        })
        .catch(() => localStorage.removeItem("token"));
    }
  }, []);

  /**
   * The login function now receives all user metadata in a single object.
   */
  const login = useCallback(
    (uname: string, tok: string, userMetadata: AuthMetadata) => {
      setUsername(uname);
      setToken(tok);
      setAccountMetadata(userMetadata);
      localStorage.setItem("token", tok);
    },
    []
  );

  /**
   * Logs the user out and clears local storage.
   */
  const logout = useCallback(() => {
    if (token) {
      apiService.logout(token).catch(() => {});
    }
    setUsername(null);
    setToken(null);
    setAccountMetadata(null);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
