// deploy.ts

import { Account } from "@near-js/accounts";
import { Near } from "@near-js/wallet-account";
import { KeyPair, KeyPairString } from "@near-js/crypto";
import { Action, actionCreators } from "@near-js/transactions";
import fs from "fs";
import { parseNearAmount } from "@near-js/utils";
import { retryAsync } from "./nearUtils";
import { AppConfig } from "../config";

/**
 * Parameters required to deploy a contract.
 */
interface DeployContractParams {
  near: Near;
  config: AppConfig;
  signerAccount: Account;
  contractAccountId: string;
  args: any;
  wasmFilePath: string;
  initialBalance: string;
}

/**
 * Deploys a NEAR contract with the specified parameters.
 * @param params - Deployment parameters.
 * @returns The deployed contract's key pair string.
 */
export async function deployContract(
  params: DeployContractParams,
): Promise<KeyPairString> {
  const {
    near,
    signerAccount,
    contractAccountId,
    config,
    args,
    wasmFilePath,
    initialBalance,
  } = params;

  const executeTransaction = async () => {
    const res = await createAccountDeployContract({
      config,
      near,
      signerAccount,
      newAccountId: contractAccountId,
      amount: initialBalance,
      wasmPath: wasmFilePath,
      methodName: "new",
      args,
    });
    return res;
  };

  try {
    return await retryAsync(executeTransaction);
  } catch (e) {
    console.error(e);
    throw new Error("Transaction failed");
  }
}

/**
 * Creates a new NEAR account and deploys the contract.
 * @param params - Parameters for account creation and contract deployment.
 * @returns The new account's key pair string.
 */
export async function createAccountDeployContract({
  signerAccount,
  newAccountId,
  amount,
  near,
  wasmPath,
  methodName,
  args,
  deposit = "0",
  config,
  gas = "300000000000000",
}: {
  signerAccount: Account;
  newAccountId: string;
  amount: string;
  near: Near;
  wasmPath: string;
  methodName: string;
  args: any;
  config: AppConfig;
  deposit?: string;
  gas?: string;
}): Promise<KeyPairString> {
  console.log("Creating account:", newAccountId);
  const keyPairString = await createAccount({
    signerAccount,
    newAccountId,
    amount,
    config,
  });
  console.log(keyPairString)
  // Save the full-access key to local key store for subsequent calls
  await config.nearKeyStore.setKey(
    config.appNetwork,
    newAccountId,
    KeyPair.fromString(keyPairString),
  );

  console.log("Deploying contract:", newAccountId);
  const accountObj = await near.account(newAccountId);
  await sendTransaction({
    signerAccount: accountObj,
    receiverId: newAccountId,
    methodName,
    args,
    deposit,
    gas,
    wasmPath,
  });

  console.log("Contract deployed successfully.");
  return keyPairString;
}

export async function sendTransaction({
  signerAccount,
  receiverId,
  methodName,
  args,
  deposit,
  gas,
  wasmPath = undefined,
}: {
  signerAccount: Account;
  receiverId: string;
  methodName: string;
  args: any;
  deposit: string;
  gas: string;
  wasmPath?: string;
}) {
  const serializedArgsBuffer = Buffer.from(JSON.stringify(args));
  const serializedArgs = new Uint8Array(serializedArgsBuffer);

  let actions: Action[] = [];

  if (wasmPath) {
    const contractCode = fs.readFileSync(wasmPath);
    actions.push(actionCreators.deployContract(contractCode));
  }

  actions.push(
    actionCreators.functionCall(
      methodName,
      serializedArgs,
      BigInt(gas),
      BigInt(parseNearAmount(deposit)!),
    ),
  );

  const result = await signerAccount.signAndSendTransaction({
    receiverId: receiverId,
    actions,
  });

  return result;
}

export async function createAccount({
  signerAccount,
  newAccountId,
  amount,
  config,
}: {
  signerAccount: Account;
  newAccountId: string;
  amount: string;
  config: AppConfig;
}) {
  const keyPair = KeyPair.fromRandom("ed25519");
  const publicKey = keyPair.getPublicKey().toString();
  await config.nearKeyStore.setKey(config.appNetwork, newAccountId, keyPair);

  await signerAccount.functionCall({
    contractId: config.appNetwork === "testnet" ? "testnet" : "near",
    methodName: "create_account",
    args: {
      new_account_id: newAccountId,
      new_public_key: publicKey,
    },
    gas: BigInt("300000000000000"),
    attachedDeposit: BigInt(parseNearAmount(amount)!),
  });
  return keyPair.toString();
}
