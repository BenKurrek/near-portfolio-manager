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
  token: any;
  // Use a string for the formatted balance
  balance: string;
}

interface BalanceContextType {
  balances: TokenBalance[];
  allTokens: FlattenedToken[];
  refreshBalances: () => Promise<void>;
}

export const BalanceContext = createContext<BalanceContextType>({
  balances: [],
  allTokens: [],
  refreshBalances: async () => {},
});

export const BalanceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { accountMetadata } = useContext(AuthContext);

  // Memoize the deposit address so it doesn't change every render.
  const intentsAddress = useMemo(
    () => accountMetadata?.contractMetadata?.contracts.nearIntentsAddress || "",
    [accountMetadata]
  );
  console.log("intentsAddress: ", intentsAddress);

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
    if (!intentsAddress) {
      setBalances([]);
      return;
    }
    try {
      const tokenIds = flattened.map((t) => t.defuseAssetId);
      const results = await fetchBatchBalances(
        config.nearNodeURL,
        intentsAddress,
        tokenIds
      );
      // Convert each raw balance using its token's decimals
      const newBalances = flattened.map((token, idx) => ({
        token,
        balance: Number(
          BigInt(results[idx] || "0") / BigInt(10 ** token.decimals)
        ).toString(),
      }));
      setBalances(newBalances);
    } catch (error) {
      console.error("Error fetching balances:", error);
      setBalances([]);
    }
  }, [intentsAddress, flattened, config.nearNodeURL]);

  useEffect(() => {
    refreshBalances();
    const interval = setInterval(refreshBalances, 10000);
    return () => clearInterval(interval);
  }, [refreshBalances]);

  return (
    <BalanceContext.Provider
      value={{ balances, refreshBalances, allTokens: flattened }}
    >
      {children}
    </BalanceContext.Provider>
  );
};
