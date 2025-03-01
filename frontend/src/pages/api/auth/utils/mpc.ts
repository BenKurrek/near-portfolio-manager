import { Account } from "near-api-js";
import {
  FinalExecutionOutcome,
  FinalExecutionStatus,
} from "near-api-js/lib/providers";
import bs58 from "bs58";

export interface MpcSignature {
  big_r: {
    affine_point: string;
  };
  s: {
    scalar: string;
  };
  recovery_id: number;
}

export type Secp256k1Signature = `secp256k1:${string}`;

export async function requestMpcSignature(payload: {
  signerAccount: Account;
  contractId: string;
  methodName: string;
  args: any;
}): Promise<MpcSignature> {
  const { signerAccount, contractId, methodName, args } = payload;
  const extractBase64Signature = async (
    txn: FinalExecutionOutcome
  ): Promise<string> => {
    if (
      txn.status &&
      typeof txn.status === "object" &&
      "SuccessValue" in txn.status
    ) {
      return txn.status.SuccessValue as string;
    }
    throw new Error("Failed to extract signature from transaction outcome.");
  };

  try {
    const promise = await signerAccount.functionCall({
      contractId,
      methodName,
      args,
      gas: BigInt("300000000000000"),
      attachedDeposit: BigInt("0"),
    });

    const base64Signature = await extractBase64Signature(promise);
    // Decode from base64 -> JSON -> Vec<Option<MPCSignature>>
    const rawBuffer = Buffer.from(base64Signature!, "base64");
    const parsed = JSON.parse(rawBuffer.toString()) as MpcSignature;
    console.log("MPC Signatures:", parsed);
    return parsed;
  } catch (e: any) {
    if (e.context?.transactionHash) {
      const txHash = e.context.transactionHash;

      let signatures: MpcSignature | undefined = undefined;
      try {
        const finalResult = await waitForTransaction(
          signerAccount.connection.provider,
          txHash,
          contractId,
          400000,
          3000
        );

        const base64Signature = await extractBase64Signature(finalResult);
        // Decode from base64 -> JSON -> Vec<Option<MPCSignature>>
        const rawBuffer = Buffer.from(base64Signature!, "base64");
        const parsed = JSON.parse(rawBuffer.toString()) as MpcSignature;
        console.log("MPC Signatures:", parsed);
        return parsed;
      } catch (pollError: any) {
        console.error(`Polling failed: ${pollError.message}`);
      }

      if (!signatures) {
        console.error("No signatures found in the final transaction.");
        throw new Error("No signatures found in the final transaction.");
      }

      return signatures;
    } else {
      console.error("Unexpected error during function call:", e);
      throw e;
    }
  }

  return [];
}

export async function waitForTransaction(
  provider: any,
  txHash: string,
  contractId: string,
  totalTimeout: number = 40000, // 40 seconds
  pollInterval: number = 3000 // 3 seconds
): Promise<FinalExecutionOutcome> {
  const startTime = Date.now();

  while (Date.now() - startTime < totalTimeout) {
    try {
      const result: FinalExecutionOutcome = await provider.txStatus(
        txHash,
        contractId,
        "FINAL"
      );

      // Type guard: Check if status is FinalExecutionStatus (object)
      if (typeof result.status === "object") {
        const status = result.status as FinalExecutionStatus;

        if ("SuccessValue" in status) {
          return result;
        } else if ("Failure" in status) {
          throw new Error(
            `Transaction failed: ${JSON.stringify(status.Failure)}`
          );
        }
      } else {
        // status is FinalExecutionStatusBasic (enum)
        console.log(`Transaction status: ${result.status}`);
      }
    } catch (error: any) {}

    await sleep(pollInterval);
  }

  throw new Error("Transaction polling timed out after 40 seconds.");
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function convertMpcSignatureToSecp256k1(
  sig: MpcSignature
): Secp256k1Signature {
  // Helper to remove a "0x" prefix if present
  const strip0x = (hex: string) => (hex.startsWith("0x") ? hex.slice(2) : hex);

  // Get the r value and remove the compressed point prefix (first byte) if present
  let r = strip0x(sig.big_r.affine_point);
  if (r.length === 66) {
    // 66 hex chars = 33 bytes
    r = r.slice(2); // remove the first byte (prefix)
  }
  r = r.padStart(64, "0"); // Ensure it's 32 bytes (64 hex characters)

  // Process s (ensure no "0x" and pad to 64 characters)
  const s = strip0x(sig.s.scalar).padStart(64, "0");

  // Convert recovery_id to a 2-character hex string (1 byte)
  const recoveryId = sig.recovery_id.toString(16).padStart(2, "0");

  // Correct concatenation: r + s + recoveryId
  const hexCombined = r + s + recoveryId;

  // Convert hex string to a byte array
  const bytes = Buffer.from(hexCombined, "hex");

  // Encode the bytes in base58
  const base58Combined = bs58.encode(bytes);

  // Return with the proper prefix
  return `secp256k1:${base58Combined}`;
}
