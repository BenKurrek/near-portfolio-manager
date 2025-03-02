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
import { FlattenedToken } from "@src/types/tokens";

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

  // Flatten the tokens list
  const flattened = useMemo(() => flattenTokens(LIST_TOKENS), []);

  const refreshBalances = useCallback(async () => {
    // Only set loading=true if we have NOT completed initial load yet.
    if (!initialLoadComplete) {
      setLoading(true);
    }

    if (!intentsAddress) {
      setBalances([]);
      setLoading(false);
      return;
    }

    try {
      const tokenIds = flattened.map((t) => t.defuseAssetId);
      const results = await fetchBatchBalances(
        config.nearNodeURL,
        intentsAddress,
        tokenIds
      );

      const newBalances: TokenBalance[] = flattened.map((token, idx) => {
        const rawBal = BigInt(results[idx] || "0");
        const decimals = token.decimals;
        const numeric = Number(rawBal) / 10 ** decimals;

        return {
          token,
          balance: numeric.toString(),
        };
      });

      const nonZero = newBalances.filter((b) => parseFloat(b.balance) > 0);

      setBalances(nonZero);
    } catch (error) {
      console.error("Error fetching balances:", error);
      setBalances([]);
    } finally {
      setLoading(false);
      // Mark that we've done at least one successful fetch
      setInitialLoadComplete(true);
    }
  }, [intentsAddress, flattened, config.nearNodeURL, initialLoadComplete]);

  useEffect(() => {
    refreshBalances();
    const interval = setInterval(refreshBalances, 10000);
    return () => clearInterval(interval);
  }, [refreshBalances]);

  return (
    <BalanceContext.Provider
      value={{
        balances,
        allTokens: flattened,
        refreshBalances,
        loading: loading && !initialLoadComplete,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
};
