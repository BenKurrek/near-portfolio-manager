import { loadEnv, initNearConnection } from "./utils/deploymentUtils";
import path from "path";
import { configureNetwork } from "./config";
import fs from "fs";

async function main(): Promise<void> {
  const networkId = "mainnet";

  // Load environment
  const { proxyContractId } = loadEnv(networkId);

  // Configure NEAR
  const config = configureNetwork(networkId);
  const near = await initNearConnection(config);
  const contractAccount = await near.account(proxyContractId);

  try {
    const wasmPath = path.join(__dirname, "../out/proxy.wasm");
    if (!fs.existsSync(wasmPath)) {
      throw new Error(`Wasm file not found: ${wasmPath}`);
    }

    const contractCode = fs.readFileSync(wasmPath);
    await contractAccount.deployContract(contractCode);
    console.log("Done!");
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
