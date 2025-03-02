/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.js` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.js --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env, ctx) {
    console.log("Cron job triggered at:");
    return new Response("Hello Wrld!");
  },
  async scheduled(event, env, ctx) {
    const url = "https://api.near.ai/v1/threads/runs";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer {"account_id":"zachman.near","public_key":"ed25519:54esjzDMmVydh17eHVkHGSFrX7cos5PEzuDsXTZG7FQd","signature":"3aCgrG5gjOEa5LPhjHlxEx6t0fCcbLCCWM3A3Dn8o5Cp1UwyZWcZB87wtqPihABbRSj7VH7fW88oBsBJeYBOBw==","callback_url":"https://app.near.ai/","message":"Welcome to NEAR AI Hub!","recipient":"ai.near","nonce":"1739330291646"}`,
    };

    const data = {
      agent_id: "flatirons.near/xela-agent/5.0.1",
      thread_id: "a_previous_thread_id",
      new_message: "Rebalance request",
      max_iterations: "1",
      env_vars: {
        agent_id: "agent-1740901697549.near",
        contract_id: "proxy-1740901684353.near",
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log(result);
    } catch (error) {
      console.error("Error:", error);
    }

    return new Response("OK");
  },
};

addEventListener("scheduled", (event) => {
  event.waitUntil(doScheduledThing(event.request));
});

async function doScheduledThing(request) {
  console.log(
    "Cron job triggered at:",
    new Date(event.scheduledTime).toISOString(),
  );
  return new Response("OK");
}
