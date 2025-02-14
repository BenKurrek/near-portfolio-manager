import { EventSchemas } from "inngest";
import { CreatePortfolioPayload } from "../../../utils/models/inngest";

export type Events = {
  "platform/create-portfolio": {
    data: CreatePortfolioPayload;
  };
};

export const schemas = new EventSchemas().fromRecord<Events>();
