// src/context/TokenContext.tsx
import React, { createContext, useContext, useMemo } from "react";
import { LIST_TOKENS } from "@src/constants/tokens";
import { flattenTokens } from "@src/utils/intents/flattenTokens";
import { FlattenedToken } from "@src/types/tokens";

/** The shape of our TokenContext. */
interface TokenContextType {
  tokens: FlattenedToken[];

  /** Helper to find a token by its symbol (e.g. "AAVE"). */
  getTokenBySymbol: (symbol: string) => FlattenedToken | undefined;

  /** Helper to find a token by its defuseAssetId (e.g. "nep141:eth-0x7fc6…"). */
  getTokenByDefuseAssetId: (assetId: string) => FlattenedToken | undefined;
}

/** Default context, in case no provider is found. */
const TokenContext = createContext<TokenContextType>({
  tokens: [],
  getTokenBySymbol: () => undefined,
  getTokenByDefuseAssetId: () => undefined,
});

/**
 * Provider that flattens all tokens from LIST_TOKENS
 * and exposes handy helpers to retrieve metadata.
 */
export const TokenProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Flatten the “unified tokens” array once and memoize:
  const flattenedTokens = useMemo(() => flattenTokens(LIST_TOKENS), []);

  /** Find a token by its symbol (case-insensitive). */
  const getTokenBySymbol = (symbol: string) => {
    return flattenedTokens.find(
      (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
    );
  };

  /** Find a token by its defuseAssetId. */
  const getTokenByDefuseAssetId = (assetId: string) => {
    return flattenedTokens.find(
      (t) => t.defuseAssetId.toLowerCase() === assetId.toLowerCase()
    );
  };

  return (
    <TokenContext.Provider
      value={{
        tokens: flattenedTokens,
        getTokenBySymbol,
        getTokenByDefuseAssetId,
      }}
    >
      {children}
    </TokenContext.Provider>
  );
};

/** Custom hook so it's a bit easier to consume in components. */
export const useTokenContext = () => useContext(TokenContext);
