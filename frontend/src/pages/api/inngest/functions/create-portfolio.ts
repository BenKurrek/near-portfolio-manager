// src/pages/api/inngest/functions/create-portfolio.ts

import { configureNetwork } from "../../../../utils/config";
import { initNearConnection } from "../../../../utils/services/contractService";
import { addInngestRunIdToJob, updateJobStep } from "../../auth/utils/jobs";
import { inngest } from "../main";
import { getUserByUsername, setUserContractData } from "../../auth/utils/user";
import { NonRetriableError } from "inngest";
import { generateKeyPair } from "../../../../utils/helpers/keyUtils";
import { ContractMetadata } from "../../../../utils/models/metadata";

/**
 * Our new "create-portfolio" Inngest function
 * calls `add_user_portfolio` in your contract (no new NEAR account!)
 */
export const createPortfolio = inngest.createFunction(
  {
    id: "platform/create-portfolio",
    onFailure: ({ event, error }) => {
      const { jobId, username } = event.data.event.data;
      console.error(
        `Error creating portfolio for user '${username}':`,
        error.message
      );
      updateJobStep(jobId, "Adding User Portfolio", "failed", error.message);
    },
  },
  { event: "platform/create-portfolio" },
  async ({ event: { data: input, id: inngestRunId }, step, logger }) => {
    logger.info("create-portfolio => input: ", input);
    const { jobId, username } = input;

    // 1) Initialize the job
    addInngestRunIdToJob(jobId, inngestRunId);
    updateJobStep(jobId, "Adding User Portfolio", "in-progress");

    // 2) Get the user
    const user = await getUserByUsername(username);
    if (!user) throw new NonRetriableError("User not found.");

    // 3) Generate a new “sudo” key
    logger.info("Generating a new sudo key for user...");
    const sudoKeyPair = generateKeyPair(); // KeyPair.fromRandom("ed25519");
    const sudoPublicKey = sudoKeyPair.getPublicKey().toString(); // "ed25519:xxxx"

    // 4) Connect to NEAR & call the contract
    const networkId = process.env.NEXT_PUBLIC_APP_NETWORK_ID! as
      | "testnet"
      | "mainnet";
    const config = configureNetwork(networkId);
    const near = await initNearConnection(networkId, config.nearNodeURL);
    const signerAccount = await near.account(
      process.env.NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_ID!
    );

    // Example: calling your existing contract with a method "add_user_portfolio"
    // that returns { portfolio_id: string } in the result
    const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID!; // e.g. "portfolios.near"
    logger.info(
      `Calling add_user_portfolio(${user.id}, ${sudoPublicKey}) on contract ${contractId}`
    );

    const result = await signerAccount.functionCall({
      contractId,
      methodName: "add_user_portfolio",
      args: {
        user_id: user.id,
        sudo_pubkey: sudoPublicKey, // e.g. "ed25519:..."
      },
      gas: "300000000000000",
      attachedDeposit: "0",
    });

    // Suppose the contract returns a portfolio_id in successValue
    // We parse it below (the real code may differ)
    const outcome = result.status as any;
    if (!("SuccessValue" in outcome)) {
      throw new Error("add_user_portfolio failed or returned no data");
    }
    // Typically NEAR returns base64
    const successValB64 = outcome.SuccessValue;
    const portfolioId = Buffer.from(successValB64, "base64").toString("utf8");

    logger.info(`Portfolio created on-chain with ID '${portfolioId}'`);

    // 5) Save the portfolio ID + sudoKey to user
    const userMetadata: ContractMetadata = {
      keys: {
        // store the entire private key, or just the public portion?
        // Up to your design, but let's do full “sudo_key” for example
        sudo_key: sudoKeyPair.toString(),
      },
      contracts: {
        userDepositAddress: "", // if relevant
        userContractId: portfolioId, // store the “portfolioId” as userContractId
        mpcContractId: "n/a", // if not used
      },
    };

    await setUserContractData(user.id, userMetadata, sudoKeyPair.toString());
    logger.info(`Portfolio ID saved for user '${user.username}'.`);

    // 6) Mark job success
    updateJobStep(jobId, "Adding User Portfolio", "completed");
  }
);
