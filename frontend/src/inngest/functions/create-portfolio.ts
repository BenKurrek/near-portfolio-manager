// src/inngest/functions/create-portfolio.ts
import { inngest } from "@inngest/index";
import { configureNetwork } from "@utils/config";
import { initNearConnection } from "@utils/services/contractService";
import { NonRetriableError } from "inngest";
import { generateKeyPair } from "@utils/helpers/keyUtils";
import prisma from "@src/db";
import {
  addInngestRunIdToJob,
  updateJobStep,
} from "@src/pages/api/auth/utils/jobs";
import {
  getUserByUsername,
  setUserContractData,
} from "@src/pages/api/auth/utils/user";

export const createPortfolio = inngest.createFunction(
  { id: "platform-create-portfolio", name: "platform/create-portfolio" },
  { event: "platform/create-portfolio" },
  async ({ event: { data, id: inngestRunId }, step, logger }) => {
    const { jobId, username, ownerPubkey } = data;
    await addInngestRunIdToJob(jobId, inngestRunId);
    await updateJobStep(jobId, "Creating Portfolio", "in-progress");

    const user = await getUserByUsername(username);
    if (!user) throw new NonRetriableError("User not found");

    const sudoKeyPair = generateKeyPair();
    const networkId = process.env.NEXT_PUBLIC_APP_NETWORK_ID!;
    const config = configureNetwork(networkId as "testnet" | "mainnet");
    const near = await initNearConnection(networkId, config.nearNodeURL);
    const signerAccount = await near.account(
      process.env.NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_ID!
    );
    const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID!;

    logger.info(
      `Calling create_portfolio(${ownerPubkey}) on contract ${contractId}`
    );
    const result = await signerAccount.functionCall({
      contractId,
      methodName: "create_portfolio",
      args: { owner_pubkey: ownerPubkey },
      gas: BigInt("300000000000000"),
      attachedDeposit: BigInt("0"),
    });
    const outcome = result.status as any;
    if (!("SuccessValue" in outcome)) {
      await updateJobStep(
        jobId,
        "Creating Portfolio",
        "failed",
        "NEAR call failed"
      );
      throw new Error("create_portfolio failed");
    }
    const portfolioId = Buffer.from(outcome.SuccessValue, "base64").toString(
      "utf8"
    );
    logger.info(`Portfolio created with ID '${portfolioId}'`);

    const userMetadata = {
      keys: { sudo_key: sudoKeyPair.toString() },
      contracts: {
        userDepositAddress: "",
        userContractId: portfolioId,
        mpcContractId: "n/a",
      },
    };
    await setUserContractData(user.id, userMetadata, sudoKeyPair.toString());
    await prisma.portfolio.create({
      data: {
        id: portfolioId,
        ownerId: user.id,
        contractId: portfolioId,
      },
    });
    await updateJobStep(jobId, "Creating Portfolio", "completed");
  }
);
