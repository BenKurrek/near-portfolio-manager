// .global.d.ts
export {}; // Ensures the file is treated as a module

declare global {
  var users: User[] | undefined;
  var loggedInUsers: Record<string, string> | undefined;

  interface Authenticator {
    credentialID: string;
    credentialPublicKey: string;
    counter: number;
    transports: string[];
  }

  /**
   * Represents keys used by the contract.
   */
  interface ContractKeys {
    sudo_key: string; // PublicKey serialized as string
    platform_key: string; // PublicKey serialized as string
    recovery_key: string; // PublicKey serialized as string
    recovery_btc_address: string; // Immutable once set
  }

  /**
   * Represents the contract data.
   */
  interface ContractData {
    userDepositAddress: string;
  }

  /**
   * Represents the unified metadata.
   */
  interface ContractMetadata {
    keys: ContractKeys;
    contracts: ContractData;
  }

  interface User {
    id: string;
    username: string;
    authenticators: Authenticator[];
    // Removed: nearAccountId, turnKey, recoveryKey
    contractMetadata: ContractMetadata | null;
  }
}
