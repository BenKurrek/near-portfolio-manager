// src/context/BalanceContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { AuthContext } from "@context/AuthContext";
import { flattenTokens } from "@src/utils/intents/flattenTokens";
import { LIST_TOKENS } from "@src/constants/tokens";
import { fetchBatchBalances } from "@src/utils/helpers/nearIntents";
import { configureNetwork } from "@src/utils/config";

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

  // Memoize the deposit address so it doesn't change every render.
  const depositAddress = useMemo(
    () => accountMetadata?.contractMetadata?.contracts.userDepositAddress || "",
    [accountMetadata]
  );

  const [balances, setBalances] = useState<TokenBalance[]>([]);

  // Memoize the network config so it doesn't change on every render.
  const config = useMemo(
    () =>
      configureNetwork(
        process.env.NEXT_PUBLIC_APP_NETWORK_ID as "testnet" | "mainnet"
      ),
    []
  );

  // Memoize the flattened tokens (LIST_TOKENS is a constant so this will be stable).
  const flattened = useMemo(() => flattenTokens(LIST_TOKENS), []);

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
