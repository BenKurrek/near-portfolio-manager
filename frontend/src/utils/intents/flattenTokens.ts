// src/utils/intents/flattenTokens.ts
import { IToken } from "../../constants/tokens";
import { FlattenedToken } from "../../types/tokens";
import { isUnifiedToken } from "../typeGuards";

export const flattenTokens = (tokens: IToken[]): FlattenedToken[] => {
  const flattened: FlattenedToken[] = [];

  tokens.forEach((token) => {
    if (isUnifiedToken(token)) {
      // Unified token, iterate its groupedTokens
      token.groupedTokens.forEach((groupedToken) => {
        flattened.push({
          defuseAssetId: groupedToken.defuseAssetId,
          address: groupedToken.address,
          symbol: groupedToken.symbol,
          name: groupedToken.name,
          decimals: groupedToken.decimals,
          icon: groupedToken.icon,
          chainIcon: groupedToken.chainIcon,
          chainName: groupedToken.chainName,
          isUnified: true,
          parentUnifiedAssetId: token.unifiedAssetId,
        });
      });
    } else {
      // BaseTokenInfo
      flattened.push({
        defuseAssetId: token.defuseAssetId,
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        icon: token.icon,
        chainIcon: token.chainIcon,
        chainName: token.chainName,
        isUnified: false,
      });
    }
  });

  return flattened;
};
