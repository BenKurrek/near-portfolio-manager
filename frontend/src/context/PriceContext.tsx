import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { flattenTokens } from "@src/utils/intents/flattenTokens";
import { LIST_TOKENS } from "@src/constants/tokens";
import { fetchQuote } from "@src/utils/helpers/nearIntents";

/** Key=Symbol => price in USD */
interface PriceMap {
  [symbol: string]: number;
}

interface PriceContextType {
  prices: PriceMap;
  loading: boolean;
  lastUpdated: number | null;
  refreshPrices: () => void;
}

export const PriceContext = createContext<PriceContextType>({
  prices: {},
  loading: true,
  lastUpdated: null,
  refreshPrices: () => {},
});

export const PriceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [prices, setPrices] = useState<PriceMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] =
    useState<boolean>(false);

  const flattened = useMemo(() => flattenTokens(LIST_TOKENS), []);

  const usdcToken = useMemo(
    () => flattened.find((t) => t.symbol === "USDC"),
    [flattened]
  );

  const fetchPrices = useCallback(async () => {
    // Only show "loading" again if we haven't completed the initial load
    if (!initialLoadComplete) {
      setLoading(true);
    }

    try {
      const newPrices: PriceMap = {};

      if (!usdcToken) {
        console.warn("No USDC token found. Using price=1 for fallback.");
        flattened.forEach((token) => {
          newPrices[token.symbol] = 1;
        });
        setPrices(newPrices);
        setLastUpdated(Date.now());
        setLoading(false);
        setInitialLoadComplete(true);
        return;
      }

      // USDC is always 1
      newPrices["USDC"] = 1;

      const uniqueSymbols = Array.from(
        new Set(flattened.map((t) => t.symbol))
      ).filter((sym) => sym !== "USDC");

      await Promise.all(
        uniqueSymbols.map(async (symbol) => {
          const token = flattened.find((t) => t.symbol === symbol);
          if (!token) return;

          const exact_amount_in = "1000000000"; // 1000 USDC
          try {
            const quoteResult = await fetchQuote({
              defuse_asset_identifier_in: usdcToken.defuseAssetId,
              defuse_asset_identifier_out: token.defuseAssetId,
              exact_amount_in,
            });
            if (quoteResult && quoteResult.length > 0) {
              const q = quoteResult[0];
              const amountOut = Number(q.amount_out) / 10 ** token.decimals;
              const price = amountOut ? 1000 / amountOut : 1;
              newPrices[symbol] = price;
            } else {
              newPrices[symbol] = 1;
            }
          } catch (err) {
            console.error("Error fetching price for", symbol, err);
            newPrices[symbol] = 1;
          }
        })
      );

      setPrices(newPrices);
      setLastUpdated(Date.now());
    } catch (err) {
      console.error("Error in fetchPrices()", err);
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [flattened, usdcToken, initialLoadComplete]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(() => {
      fetchPrices();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const refreshPrices = useCallback(() => {
    fetchPrices();
  }, [fetchPrices]);

  return (
    <PriceContext.Provider
      value={{
        prices,
        loading: loading && !initialLoadComplete,
        lastUpdated,
        refreshPrices,
      }}
    >
      {children}
    </PriceContext.Provider>
  );
};
