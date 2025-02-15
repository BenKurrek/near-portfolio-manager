// src/inngest/functions/create-portfolio.ts

import { inngest } from "@inngest/index";
import { configureNetwork } from "@utils/config";
import { initNearConnection } from "@services/contractService";
import {
  addInngestRunIdToJob,
  updateJobStep,
} from "@src/pages/api/auth/utils/jobs";
import {
  getUserByUsername,
  setUserContractData,
} from "@src/pages/api/auth/utils/user";
import { NonRetriableError } from "inngest";
import { generateKeyPair } from "@utils/helpers/keyUtils";
import { ContractMetadata } from "@utils/models/metadata";

export const createPortfolio = inngest.createFunction(
  {
    name: "Create Portfolio",
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

    // 1) Initialize job
    addInngestRunIdToJob(jobId, inngestRunId);
    updateJobStep(jobId, "Adding User Portfolio", "in-progress");

    // 2) Get user
    const user = await getUserByUsername(username);
    if (!user) throw new NonRetriableError("User not found.");

    // 3) Generate "sudo" key
    logger.info("Generating a new sudo key for user...");
    const sudoKeyPair = generateKeyPair();
    const sudoPublicKey = sudoKeyPair.getPublicKey().toString();

    // 4) Connect to NEAR & call contract
    const networkId = process.env.NEXT_PUBLIC_APP_NETWORK_ID! as
      | "testnet"
      | "mainnet";
    const config = configureNetwork(networkId);
    const near = await initNearConnection(networkId, config.nearNodeURL);
    const signerAccount = await near.account(
      process.env.NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_ID!
    );

    const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID!;
    logger.info(
      `Calling add_user_portfolio(${user.id}, ${sudoPublicKey}) on contract ${contractId}`
    );

    const result = await signerAccount.functionCall({
      contractId,
      methodName: "add_user_portfolio",
      args: {
        user_id: user.id,
        sudo_pubkey: sudoPublicKey,
      },
      gas: "300000000000000",
      attachedDeposit: "0",
    });

    // 5) Parse result from NEAR
    const outcome = result.status as any;
    if (!("SuccessValue" in outcome)) {
      throw new Error("add_user_portfolio failed or returned no data");
    }

    const successValB64 = outcome.SuccessValue;
    const portfolioId = Buffer.from(successValB64, "base64").toString("utf8");

    logger.info(`Portfolio created on-chain with ID '${portfolioId}'`);

    // 6) Save the portfolio ID + sudoKey to user
    const userMetadata: ContractMetadata = {
      keys: {
        sudo_key: sudoKeyPair.toString(),
      },
      contracts: {
        userDepositAddress: "",
        userContractId: portfolioId,
        mpcContractId: "n/a",
      },
    };

    await setUserContractData(user.id, userMetadata, sudoKeyPair.toString());
    logger.info(`Portfolio ID saved for user '${user.username}'.`);

    // 7) Mark job success
    updateJobStep(jobId, "Adding User Portfolio", "completed");
  }
);
