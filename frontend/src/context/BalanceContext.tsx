// src/context/BalanceContext.tsx

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useContext,
} from "react";
import { AuthContext } from "@context/AuthContext";
import { flattenTokens } from "@utils/intents/flattenTokens";
import { LIST_TOKENS } from "@src/constants/tokens";
import { FlattenedToken } from "@src/types/tokens";
import { fetchBatchBalances } from "@utils/helpers/nearIntents";
import { configureNetwork } from "@utils/config";

interface TokenBalance {
  token: FlattenedToken;
  balance: string; // Big string
}

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
