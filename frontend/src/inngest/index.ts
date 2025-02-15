// src/inngest/index.ts

import { Inngest } from "inngest";
import { schemas } from "@inngest/events"; // or "./events"

export const inngest = new Inngest({
  id: "platform-main",
  schemas,
  isDev: true,
});
