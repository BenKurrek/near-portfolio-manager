// src/inngest/events.ts

import { EventSchemas } from "inngest";
import { CreatePortfolioPayload } from "@utils/models/inngest";

/**
 * An example of typed Inngest events.
 * Adjust if you have more events.
 */
export type Events = {
  "platform/create-portfolio": {
    data: CreatePortfolioPayload;
  };
  "platform/buy-bundle": {
    data: {
      jobId: string;
      username: string;
      bundleId: string;
      amount: number;
    };
  };
  "platform/withdraw": {
    data: {
      jobId: string;
      username: string;
      asset: string;
      amount: string;
      toAddress: string;
    };
  };
  "platform/add-ai-agent": {
    data: {
      jobId: string;
      username: string;
      agentData: any;
    };
  };
  "platform/rebalance": {
    data: {
      jobId: string;
      username: string;
      newAllocations: Record<string, number>;
    };
  };
};

export const schemas = new EventSchemas().fromRecord<Events>();
