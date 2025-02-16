/**
 * @file config.ts
 *
 * Contains the primary network configuration object used throughout the scripts.
 */

import { UnencryptedFileSystemKeyStore } from "@near-js/keystores-node";
import path from "path";
import os from "os";

// Path to the credentials folder where NEAR CLI stores key files
const homedir = os.homedir();
const CREDENTIALS_DIR = ".near-credentials";
const credentialsPath = path.join(homedir, CREDENTIALS_DIR);

/**
 * Interface describing how we store network-related config for each environment.
 */
export interface AppConfig {
  appNetwork: "testnet" | "mainnet";
  nearKeyStore: UnencryptedFileSystemKeyStore;
  nearNodeURL: string;
  mpcContractId: string;
  nearExplorerBaseUrl: string;
}

export function configureNetwork(appNetwork: "testnet" | "mainnet"): AppConfig {
  console.log("Configuring network:", appNetwork);

  if (appNetwork === "mainnet") {
    // Example mainnet config
    return {
      appNetwork,
      nearKeyStore: new UnencryptedFileSystemKeyStore(credentialsPath),
      nearNodeURL: "https://rpc.mainnet.near.org",
      mpcContractId: "v1.signer",
      nearExplorerBaseUrl: "https://nearblocks.io",
    };
  } else {
    // Example testnet config
    return {
      appNetwork,
      nearKeyStore: new UnencryptedFileSystemKeyStore(credentialsPath),
      nearNodeURL: "https://rpc.testnet.fastnear.com",
      mpcContractId: "v1.signer-prod.testnet",
      nearExplorerBaseUrl: "https://testnet.nearblocks.io",
    };
  }
}
