// src/config.ts

export interface AppConfig {
  appNetwork: "testnet" | "mainnet";
  nearNodeURL: string;
  mpcContractId: string;
  btcApiBaseUrl: string;
  btcExplorerBaseUrl: string;
}

/**
 * Configure network settings for both the BTC network and NEAR
 *
 * Supported networks:
 * - "mainnet" => mainnet: https://mempool.space/api and mainnet RPC on NEAR
 * - "testnet" => testnet4: https://mempool.space/testnet4/api and testnet RPC on NEAR
 */
export function configureNetwork(appNetwork: "testnet" | "mainnet"): AppConfig {
  console.log("Configuring network:", appNetwork);
  let nearNodeURL: string;
  let nearPlatformSignerId: string;
  let mpcContractId: string;
  let btcApiBaseUrl: string;
  let btcExplorerBaseUrl: string;

  if (appNetwork === "mainnet") {
    // Bitcoin mainnet
    nearNodeURL =
      "https://g.w.lavanet.xyz:443/gateway/near/rpc-http/f653c33afd2ea30614f69bc1c73d4940";
    mpcContractId = "v1.signer";
    btcExplorerBaseUrl = "https://mempool.space";
    btcApiBaseUrl = "https://mempool.space/api";
  } else {
    // Testnet 4
    nearNodeURL = "https://rpc.testnet.fastnear.com/";
    nearPlatformSignerId = "benjiman.testnet";
    mpcContractId = "v1.signer-dev.testnet";
    btcExplorerBaseUrl = "https://mempool.space/testnet4";
    btcApiBaseUrl = "https://mempool.space/testnet4/api";
  }

  return {
    appNetwork,
    nearNodeURL,
    mpcContractId,
    btcApiBaseUrl,
    btcExplorerBaseUrl,
  };
}
