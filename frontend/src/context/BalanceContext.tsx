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
import { fetchBatchBalances } from "@utils/helpers/nearIntents";
import { configureNetwork } from "@utils/config";

interface TokenBalance {
  token: any;
  balance: string;
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
  const { accountMetadata } = useContext(AuthContext);
  // Read deposit address from the structured metadata
  const depositAddress =
    accountMetadata?.contractMetadata?.contracts.userDepositAddress || "";
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const config = configureNetwork(
    process.env.NEXT_PUBLIC_APP_NETWORK_ID as "testnet" | "mainnet"
  );
  const flattened = flattenTokens(LIST_TOKENS);

  const refreshBalances = useCallback(async () => {
    if (!depositAddress) {
      setBalances([]);
      return;
    }
    try {
      const tokenIds = flattened.map((t) => t.defuseAssetId);
      const results = await fetchBatchBalances(
        config.nearNodeURL,
        depositAddress,
        tokenIds
      );
      const newBalances = flattened.map((token, idx) => ({
        token,
        balance: results[idx] || "0",
      }));
      setBalances(newBalances);
    } catch (error) {
      console.error("Error fetching balances:", error);
      setBalances([]);
    }
  }, [depositAddress, flattened, config.nearNodeURL]);

  useEffect(() => {
    refreshBalances();
    const interval = setInterval(refreshBalances, 10000);
    return () => clearInterval(interval);
  }, [refreshBalances]);

  return (
    <BalanceContext.Provider value={{ balances, refreshBalances }}>
      {children}
    </BalanceContext.Provider>
  );
};
