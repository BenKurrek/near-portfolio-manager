import { Inngest } from "inngest";
import { schemas } from "./events";

export const inngest = new Inngest({
    id: 'platform-main',
    schemas,
    isDev: true,
});