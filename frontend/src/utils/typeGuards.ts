// src/utils/typeGuards.ts

import { IToken } from "@src/constants/tokens";
import { BaseTokenInfo, UnifiedTokenInfo } from "@utils/models/intents";

/**
 * Type guard to check if a token is UnifiedTokenInfo
 */
export const isUnifiedToken = (token: IToken): token is UnifiedTokenInfo => {
  return (token as UnifiedTokenInfo).groupedTokens !== undefined;
};

/**
 * Type guard to check if a token is BaseTokenInfo
 */
export const isBaseToken = (token: IToken): token is BaseTokenInfo => {
  return (token as BaseTokenInfo).defuseAssetId !== undefined;
};
