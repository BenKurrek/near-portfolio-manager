// src/context/BalanceContext.tsx

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useContext,
} from "react";
import { AuthContext } from "./AuthContext";
import { flattenTokens } from "../utils/intents/flattenTokens";
import { LIST_TOKENS } from "../constants/tokens";
import { FlattenedToken } from "../types/tokens";
import { fetchBatchBalances } from "../utils/helpers/nearIntents"; // We'll create this
import { configureNetwork } from "../utils/config";

interface TokenBalance {
  token: FlattenedToken;
  balance: string; // Big string
}

/** The interface for BalanceContext data */
interface BalanceContextType {
  balances: TokenBalance[];
  refreshBalances: () => Promise<void>;
}

export const BalanceContext = createContext<BalanceContextType>({
  balances: [],
  refreshBalances: async () => {},
});

export const BalanceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { accountMetadata, derivedDepositAddress } = useContext(AuthContext);
  const [balances, setBalances] = useState<TokenBalance[]>([]);

  const config = configureNetwork(
    process.env.NEXT_PUBLIC_APP_NETWORK_ID as "testnet" | "mainnet"
  );

  const flattened = flattenTokens(LIST_TOKENS);

  /**
   *  Poll NEAR for batch balances
   *  If derivedDepositAddress is null, user not logged in
   */
  const refreshBalances = useCallback(async () => {
    if (!derivedDepositAddress) {
      setBalances([]);
      return;
    }
    try {
      const tokenIds = flattened.map((t) => t.defuseAssetId);
      const results = await fetchBatchBalances(
        config.nearNodeURL,
        derivedDepositAddress,
        tokenIds
      );
      // results is an array of string balances in the same order
      const newBalances: TokenBalance[] = flattened.map((token, idx) => ({
        token,
        balance: results[idx] || "0",
      }));
      setBalances(newBalances);
    } catch (error) {
      console.error("Error fetching balances:", error);
      setBalances([]);
    }
  }, [derivedDepositAddress, flattened, config.nearNodeURL]);

  // Poll every 10 seconds
  useEffect(() => {
    refreshBalances();
    const interval = setInterval(() => {
      refreshBalances();
    }, 10000);
    return () => {
      clearInterval(interval);
    };
  }, [refreshBalances]);

  return (
    <BalanceContext.Provider value={{ balances, refreshBalances }}>
      {children}
    </BalanceContext.Provider>
  );
};
