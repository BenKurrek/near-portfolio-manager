import {
  loadEnv,
  initNearConnection,
  updateEnv,
} from "./utils/deploymentUtils";
import { KeyPair } from "@near-js/crypto";
import { configureNetwork } from "./config";
import { createAccount, sendTransaction } from "./utils/deploy";

async function main(): Promise<void> {
  const networkId = "mainnet";

  // Load environment
  const { envPath, proxyContractId } = loadEnv(networkId);

  // Configure NEAR
  const config = configureNetwork(networkId);
  const near = await initNearConnection(config);
  const sponsorAccount = await near.account(proxyContractId);

  //@ts-ignore
  const domainSuffix = networkId === "testnet" ? "testnet" : "near";

  try {
    const agentId = `agent-${Date.now()}.${domainSuffix}`;
    console.log("Creating Agent: ", agentId);
    const agentKey = await createAccount({
      signerAccount: sponsorAccount,
      newAccountId: agentId,
      amount: "2",
      config,
    });
    updateEnv(envPath, "AGENT_ACCOUNT_ID", agentId);
    updateEnv(envPath, "AGENT_PRIVATE_KEY", agentKey);
    await config.nearKeyStore.setKey(
      config.appNetwork,
      agentId,
      KeyPair.fromString(agentKey),
    );

    console.log("Registering Agent");
    await sendTransaction({
      signerAccount: sponsorAccount,
      receiverId: proxyContractId,
      methodName: "register_agent",
      args: {
        agent_id: agentId,
      },
      deposit: "0",
      gas: "300000000000000",
    });
    console.log("Done!");

    console.log(`${config.nearExplorerBaseUrl}/address/${agentId}`);
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
