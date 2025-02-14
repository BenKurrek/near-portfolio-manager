import { inngest } from "./inngest/main";
import { functions } from "./inngest/functions";
import { serve } from "inngest/next";

export default serve({
    client: inngest,
    functions: functions
})