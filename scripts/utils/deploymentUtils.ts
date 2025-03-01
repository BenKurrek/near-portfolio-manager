import * as dotenv from "dotenv";
import { Near } from "@near-js/wallet-account";
import fs from "fs";
import path from "path";
import { AppConfig } from "../config";
import { KeyPairString } from "@near-js/crypto";

/**
 * Loads environment variables from the specified network's .env file.
 * @param network - The network name (e.g., 'mainnet' or 'testnet').
 * @returns An object containing the loaded environment variables.
 */
export function loadEnv(network: "mainnet" | "testnet"): {
  sponsorAccountId: string;
  agentAccountId: string;
  agentPrivateKey: KeyPairString;
  proxyContractId: string;
  proxyContractKey: KeyPairString;
  mpcContract: string;
  envPath: string;
} {
  const envPath = path.join(__dirname, `../env/.env.${network}`);
  if (!fs.existsSync(envPath)) {
    throw new Error(`Environment file not found: ${envPath}`);
  }

  dotenv.config({ path: envPath });

  const sponsorAccountId = process.env.SPONSOR_ACCOUNT!;
  const mpcContract = process.env.MPC_CONTRACT!;
  const proxyContractId = process.env.PROXY_CONTRACT_ID!;
  const proxyContractKey = process.env.PROXY_CONTRACT_KEY! as KeyPairString;
  const agentAccountId = process.env.AGENT_ACCOUNT_ID!;
  const agentPrivateKey = process.env.AGENT_PRIVATE_KEY! as KeyPairString;

  return {
    sponsorAccountId,
    mpcContract,
    envPath,
    agentAccountId,
    agentPrivateKey,
    proxyContractId,
    proxyContractKey,
  };
}

/**
 * Initializes a NEAR connection using the provided configuration.
 * @param config - Application config containing network and NEAR setup.
 * @returns The initialized Near instance.
 */
export async function initNearConnection(config: AppConfig): Promise<Near> {
  const nearConfig = {
    networkId: config.appNetwork,
    nodeUrl: config.nearNodeURL,
    keyStore: config.nearKeyStore,
  };
  const near = new Near(nearConfig);
  return near;
}

/**
 * Updates the .env file with a new key-value pair.
 * @param envPath - Path to the .env file.
 * @param key - The key to update.
 * @param value - The value to assign to the key.
 */
export function updateEnv(envPath: string, key: string, value: string): void {
  const existingEnv = fs.readFileSync(envPath, "utf8");
  const updatedEnv = updateEnvVar(existingEnv, key, value);
  fs.writeFileSync(envPath, updatedEnv);
  console.log(`Updated .env.${envPath.split(".env.")[1]} with ${key}=${value}`);
}

/**
 * Helper function to update a specific environment variable.
 * @param envContent - Current content of the .env file.
 * @param key - Key to update.
 * @param value - Value to assign.
 * @returns Updated environment file content.
 */
function updateEnvVar(envContent: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*`, "m");
  if (envContent.match(regex)) {
    return envContent.replace(regex, `${key}="${value}"`);
  } else {
    return envContent + `\n${key}="${value}"\n`;
  }
}

// Sleep
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
