// src/inngest/events.ts
import { EventSchemas } from "inngest";

export type Events = {
  "platform/create-portfolio": {
    data: {
      jobId: string;
      username: string;
      ownerPubkey: string;
    };
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
  "platform/assign-agent": {
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
