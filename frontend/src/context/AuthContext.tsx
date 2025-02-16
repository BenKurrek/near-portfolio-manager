// src/context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { apiService } from "@services/api";
import { logger } from "@src/utils/logger";

/**
 * The shape of the user’s metadata from whoami, combining
 * contract data + portfolio data + agent IDs.
 */
export interface AuthMetadata {
  contractMetadata: {
    keys: { sudo_key: string };
    contracts: {
      userDepositAddress: string;
    };
  };
  portfolioData: any;
  agentIds: string[];
}

interface AuthContextType {
  username: string | null;
  token: string | null;
  accountMetadata: AuthMetadata | null;
  login: (uname: string, tok: string, userMetadata: AuthMetadata) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  username: null,
  token: null,
  accountMetadata: null,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
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
   * Fetch user info from whoami given a token in local storage.
   */
  const fetchUserInfo = useCallback(async (storedToken: string) => {
    try {
      logger.info(
        "AuthContext.fetchUserInfo() called with token:",
        storedToken
      );
      const data = await apiService.whoami(storedToken);
      logger.info("whoami response:", data);
      setUsername(data.username);
      setToken(storedToken);
      setAccountMetadata(data.userMetadata);
    } catch (error) {
      logger.error("Failed to fetch user info:", error);
      localStorage.removeItem("token");
    }
  }, []);

  /**
   * On first load, check localStorage for a token and call fetchUserInfo
   */
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      fetchUserInfo(storedToken);
    }
  }, [fetchUserInfo]);

  /**
   * A method that re-fetches whoami using the currently stored token,
   * then updates the context state.
   */
  const refreshUser = useCallback(async () => {
    if (!token) return;
    logger.info("AuthContext.refreshUser() called");
    await fetchUserInfo(token);
  }, [token, fetchUserInfo]);

  /**
   * The login function now receives all user metadata in a single object.
   */
  const login = useCallback(
    (uname: string, tok: string, userMetadata: AuthMetadata) => {
      logger.info("AuthContext.login() called. Logging in user:", uname);
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
    logger.info("AuthContext.logout() called");
    if (token) {
      apiService
        .logout(token)
        .catch((err) =>
          logger.warn("Logout request failed (possibly stale token).", err)
        );
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
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
