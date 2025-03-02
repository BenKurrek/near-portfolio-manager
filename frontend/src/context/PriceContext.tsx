import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { fetchQuote } from "@src/utils/helpers/nearIntents";
import { useTokenContext } from "@context/TokenContext";
import { bundles } from "@src/constants/bundles"; // Import the bundles constant

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

  const { tokens: flattened } = useTokenContext();
  const usdcToken = useMemo(
    () => flattened.find((t) => t.symbol === "USDC"),
    [flattened]
  );

  // Build an allowlist of symbols from the bundles distributions.
  const allowedSymbols = useMemo(() => {
    const symbols = new Set<string>();
    bundles.forEach((bundle) => {
      bundle.distribution.forEach((item) => symbols.add(item.symbol));
    });
    return symbols;
  }, []);

  const fetchPrices = useCallback(async () => {
    if (!initialLoadComplete) {
      setLoading(true);
    }

    try {
      const newPrices: PriceMap = {};

      // USDC is required for the quotes.
      if (!usdcToken) {
        console.warn("No USDC token found. Cannot fetch quotes without USDC.");
        setLastUpdated(Date.now());
        setLoading(false);
        setInitialLoadComplete(true);
        return;
      }

      // Set USDC price to 1.
      newPrices["USDC"] = 1;

      // Filter the tokens to only include those allowed by the bundles.
      const uniqueSymbols = Array.from(
        new Set(
          flattened
            .filter((t) => allowedSymbols.has(t.symbol))
            .map((t) => t.symbol)
        )
      );

      console.log("Allowed symbols for price fetching:", uniqueSymbols);

      // Helper function to get the price for a token using retries.
      const getPriceForToken = async (
        token: (typeof flattened)[0]
      ): Promise<number | undefined> => {
        const maxTries = 2;
        const minAmount = 10; // starting input amount in dollars
        const maxAmount = 1000; // maximum input amount in dollars
        // Calculate multiplier so that after (maxTries-1) increases we hit maxAmount.
        const multiplier = Math.pow(maxAmount / minAmount, 1 / (maxTries - 1));

        for (let attempt = 0; attempt < maxTries; attempt++) {
          const currentAmount = Math.min(
            minAmount * Math.pow(multiplier, attempt),
            maxAmount
          );
          // Instead of doing floating point arithmetic here,
          // we convert the currentAmount to the smallest unit of USDC using BigInt arithmetic.
          const exact_amount_in = (
            BigInt(Math.round(currentAmount)) *
            BigInt(10) ** BigInt(usdcToken.decimals)
          ).toString();

          try {
            const quoteResult = await fetchQuote({
              defuse_asset_identifier_in: usdcToken.defuseAssetId,
              defuse_asset_identifier_out: token.defuseAssetId,
              exact_amount_in,
            });
            if (quoteResult && quoteResult.length > 0) {
              const q = quoteResult[0];
              // Use BigInt for the amount_out until we normalize it
              const amountOutBigInt = BigInt(q.amount_out);
              const tokenDecimalsFactor = BigInt(10) ** BigInt(token.decimals);
              // Normalize by converting to a number after the division.
              const normalizedAmountOut =
                Number(amountOutBigInt) / Number(tokenDecimalsFactor);
              if (normalizedAmountOut > 0) {
                // Calculate the price using the current input amount.
                const price = currentAmount / normalizedAmountOut;
                return price;
              }
            }
          } catch (err) {
            console.error(
              `Error fetching price for ${token.symbol} on attempt ${
                attempt + 1
              }:`,
              err
            );
          }
        }
        console.warn(
          `No valid quote found for ${token.symbol} after ${maxTries} tries.`
        );
        return undefined;
      };

      await Promise.all(
        uniqueSymbols.map(async (symbol) => {
          const token = flattened.find((t) => t.symbol === symbol);
          if (!token) return;

          const tokenPrice = await getPriceForToken(token);
          if (tokenPrice !== undefined) {
            newPrices[symbol] = tokenPrice;
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
  }, [flattened, usdcToken, initialLoadComplete, allowedSymbols]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 45000);
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
