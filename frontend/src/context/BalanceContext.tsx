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
import { fetchBatchBalances } from "@src/utils/helpers/nearIntents";
import { configureNetwork } from "@src/utils/config";
import { FlattenedToken } from "@src/types/tokens";
import { useTokenContext } from "@context/TokenContext";

interface TokenBalance {
  token: FlattenedToken;
  balance: string;
}

interface BalanceContextType {
  balances: TokenBalance[];
  allTokens: FlattenedToken[];
  refreshBalances: () => Promise<void>;
  loading: boolean;
}

export const BalanceContext = createContext<BalanceContextType>({
  balances: [],
  allTokens: [],
  refreshBalances: async () => {},
  loading: true,
});

export const BalanceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { accountMetadata } = useContext(AuthContext);
  const { tokens: flattenedTokens } = useTokenContext();

  const intentsAddress = useMemo(
    () => accountMetadata?.contractMetadata?.contracts.nearIntentsAddress || "",
    [accountMetadata]
  );

  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const config = useMemo(
    () =>
      configureNetwork(
        process.env.NEXT_PUBLIC_APP_NETWORK_ID as "testnet" | "mainnet"
      ),
    []
  );

  const refreshBalances = useCallback(async () => {
    if (!initialLoadComplete) {
      setLoading(true);
    }
    if (!intentsAddress) {
      setBalances([]);
      setLoading(false);
      return;
    }

    try {
      const tokenIds = flattenedTokens.map((t) => t.defuseAssetId);
      const results = await fetchBatchBalances(
        config.nearNodeURL,
        intentsAddress,
        tokenIds
      );

      const newBalances: TokenBalance[] = flattenedTokens.map((token, idx) => {
        const rawBal = BigInt(results[idx] || "0");
        const decimals = token.decimals;
        const numeric = Number(rawBal) / 10 ** decimals;

        return {
          token,
          balance: numeric.toString(),
        };
      });
      console.log("newBalances", newBalances);

      const nonZero = newBalances.filter((b) => parseFloat(b.balance) > 0);
      console.log("nonZero", nonZero);
      setBalances(nonZero);
    } catch (error) {
      console.error("Error fetching balances:", error);
      setBalances([]);
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [
    intentsAddress,
    flattenedTokens,
    config.nearNodeURL,
    initialLoadComplete,
  ]);

  useEffect(() => {
    refreshBalances();
    const interval = setInterval(refreshBalances, 10000);
    return () => clearInterval(interval);
  }, [refreshBalances]);

  return (
    <BalanceContext.Provider
      value={{
        balances,
        allTokens: flattenedTokens,
        refreshBalances,
        loading: loading && !initialLoadComplete,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
};
