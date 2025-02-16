// src/types/flattenedToken.ts

export type SupportedChainName =
  | "eth"
  | "near"
  | "base"
  | "arbitrum"
  | "bitcoin"
  | "solana"
  | "dogecoin"
  | "turbochain"
  | "aurora"
  | "xrpledger"; // Added xrpledger as a supported chain name

export interface FlattenedToken {
  defuseAssetId: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
  chainIcon: string;
  chainName: SupportedChainName;
  isUnified: boolean; // Indicates if the token is part of a unified group
  parentUnifiedAssetId?: string; // Reference to the unifiedAssetId if applicable
}
