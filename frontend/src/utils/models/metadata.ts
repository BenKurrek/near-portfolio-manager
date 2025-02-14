// src/models/metadata.ts

export interface ContractKeys {
  sudo_key: string; // PublicKey serialized as string
}

export interface ContractData {
  userDepositAddress: string;
  userContractId: string;
  mpcContractId: string;
}

/**
 * Represents the unified metadata.
 */
export interface ContractMetadata {
  keys: ContractKeys;
  contracts: ContractData;
}
