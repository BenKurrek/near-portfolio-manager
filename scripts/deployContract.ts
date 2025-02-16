import {
  loadEnv,
  initNearConnection,
  updateEnv,
} from "./utils/deploymentUtils";
import { KeyPair } from "@near-js/crypto";
import path from "path";
import { configureNetwork } from "./config";
import { deployContract } from "./utils/deploy";
import { formatNearAmount, parseNearAmount } from "@near-js/utils";
import fs from "fs";

async function main(): Promise<void> {
  const networkId = "mainnet";

  // Load environment
  const { sponsorAccountId, envPath, mpcContract } = loadEnv(networkId);

  // Configure NEAR
  const config = configureNetwork(networkId);
  const near = await initNearConnection(config);
  const sponsorAccount = await near.account(sponsorAccountId);

  //@ts-ignore
  const domainSuffix = networkId === "testnet" ? "testnet" : "near";
  const contractId = `proxy-${Date.now()}.${domainSuffix}`;

  const initArgs = {
    mpc_contract_id: mpcContract,
  };

  try {
    const wasmPath = path.join(__dirname, "../out/proxy.wasm");
    if (!fs.existsSync(wasmPath)) {
      throw new Error(`Wasm file not found: ${wasmPath}`);
    }

    const fullAccessKey = await deployContract({
      near,
      config,
      signerAccount: sponsorAccount,
      contractAccountId: contractId,
      args: initArgs,
      wasmFilePath: wasmPath,
      initialBalance: "10",
    });

    // Update .env with the newly created account
    updateEnv(envPath, "PROXY_CONTRACT_ID", contractId);

    // Save the full-access key to local key store for subsequent calls
    await config.nearKeyStore.setKey(
      config.appNetwork,
      contractId,
      KeyPair.fromString(fullAccessKey),
    );

    console.log(`${config.nearExplorerBaseUrl}/address/${contractId}`);
  } catch (error) {
    console.error("Error deploying Beacon:", error);
    process.exit(1);
  }
}

// Start the script
main().catch((err) => {
  console.error("Unexpected error in deployBeacon:", err);
  process.exit(1);
});
