import { FinalExecutionOutcome, FinalExecutionStatus } from "@near-js/types";
import { Near } from "@near-js/wallet-account";
import { AppConfig } from "../config";
import { sleep } from "./deploymentUtils";

/**
 * Initializes a NEAR connection using the provided configuration.
 * @param config - The configuration object containing network ID, key store, etc.
 * @returns A Promise that resolves to a Near instance.
 */
export async function initNear(config: AppConfig): Promise<Near> {
  const nearConfig = {
    networkId: config.appNetwork,
    nodeUrl: config.nearNodeURL,
    keyStore: config.nearKeyStore,
  };
  const near = new Near(nearConfig);
  return near;
}

/**
 * Helper function to retry an async operation with exponential backoff.
 *
 * @param fn - The async function to retry.
 * @param retries - Number of retries.
 * @param delay - Initial delay in milliseconds.
 * @param factor - Multiplicative factor for delay.
 * @returns The result of the async function if successful.
 * @throws The last error encountered if all retries fail.
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  retries: number = 5,
  delay: number = 10000,
  factor: number = 1,
): Promise<T> {
  let attempt = 0;
  let currentDelay = delay;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (attempt >= retries) {
        throw error;
      }
      console.warn(
        `Attempt ${attempt} failed. Retrying in ${currentDelay}ms...`,
        `Error: ${error.message || error}`,
      );
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= factor; // Exponential backoff
    }
  }

  // This point should never be reached
  throw new Error("Unexpected error in retryAsync");
}

/**
 * Waits for a NEAR transaction to be confirmed.
 * @param provider - NEAR provider instance.
 * @param txHash - Transaction hash to wait for.
 * @param contractId - Contract ID associated with the transaction.
 * @param totalTimeout - Total timeout in milliseconds.
 * @param pollInterval - Polling interval in milliseconds.
 * @returns FinalExecutionOutcome of the transaction.
 */
export async function waitForTransaction(
  provider: any,
  txHash: string,
  contractId: string,
  totalTimeout: number = 40000, // 40 seconds
  pollInterval: number = 3000, // 3 seconds
): Promise<FinalExecutionOutcome> {
  const startTime = Date.now();

  while (Date.now() - startTime < totalTimeout) {
    try {
      const result: FinalExecutionOutcome = await provider.txStatus(
        txHash,
        contractId,
        "FINAL",
      );

      // Type guard: Check if status is FinalExecutionStatus (object)
      if (typeof result.status === "object") {
        const status = result.status as FinalExecutionStatus;

        if ("SuccessValue" in status) {
          return result;
        } else if ("Failure" in status) {
          throw new Error(
            `Transaction failed: ${JSON.stringify(status.Failure)}`,
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
