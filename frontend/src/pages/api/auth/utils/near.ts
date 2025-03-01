import { computeAddress } from "ethers";
import { configureNetwork } from "@src/utils/config";
import { initNearConnection } from "@src/utils/services/contractService";
import { KeyPair } from "near-api-js";
import { parseNearAmount } from "near-api-js/lib/utils/format";
import { base_decode } from "near-api-js/lib/utils/serialize";
import { fetchDepositAddress } from "./intents";

export async function createAccount({
  newAccountId,
  amount,
  network,
}: {
  newAccountId: string;
  amount: string;
  network: "mainnet" | "testnet";
}) {
  const keyPair = KeyPair.fromRandom("ed25519");
  console.log(keyPair.toString());
  const publicKey = keyPair.getPublicKey().toString();

  const config = configureNetwork(network);
  const { sponsorAccount: signerAccount, near } = await initNearConnection(
    network,
    config.nearNodeURL
  );

  await signerAccount.functionCall({
    contractId: network === "testnet" ? "testnet" : "near",
    methodName: "create_account",
    args: {
      new_account_id: newAccountId,
      new_public_key: publicKey,
    },
    gas: BigInt("300000000000000"),
    attachedDeposit: BigInt(parseNearAmount(amount)!),
  });

  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID!;
  const viewAccount = await near.account("foo.near");
  const mpcKey = await viewAccount.viewFunction({
    contractId: "v1.signer",
    methodName: "derived_public_key",
    args: { path: newAccountId, predecessor: contractId },
  });

  const [curve, encodedKey] = mpcKey.split(":");
  if (curve !== "secp256k1") {
    throw new Error(`Unsupported curve: ${curve}`);
  }

  const uncompressedKeyData = Buffer.from(base_decode(encodedKey));
  const ethereumAddress = computeAddress(
    "0x" + uncompressedKeyData.toString("hex")
  );
  console.log("Ethereum address:", ethereumAddress);

  const evmAddr = await fetchDepositAddress("EVM", ethereumAddress);
  console.log("Found EVM deposit address:", evmAddr);

  return {
    keyPairString: keyPair.toString(),
    evmDepositAddress: evmAddr,
    nearIntentsAddress: ethereumAddress,
  };
}
