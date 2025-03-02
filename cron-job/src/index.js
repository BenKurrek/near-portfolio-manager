// Import tweetnacl and bs58 for key decoding from a CDN.
import nacl from "tweetnacl";
import bs58 from "bs58";

// Generate a 32-byte random nonce as a hex string.
function generateNonce() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Sign the message using your private key.
// Adjust this function if your signing process needs to include the nonce in a specific way.
function signMessage(message, privateKeyBase58) {
  // Remove "ed25519:" prefix if present.
  if (privateKeyBase58.startsWith("ed25519:")) {
    privateKeyBase58 = privateKeyBase58.slice(8);
  }
  // Decode the private key from base58.
  const privateKey = bs58.decode(privateKeyBase58);
  const encoder = new TextEncoder();
  const msgUint8 = encoder.encode(message);
  // Sign the message.
  const signatureUint8 = nacl.sign.detached(msgUint8, privateKey);
  // Convert the signature to base64.
  let binary = "";
  for (let i = 0; i < signatureUint8.length; i++) {
    binary += String.fromCharCode(signatureUint8[i]);
  }
  return btoa(binary);
}

export default {
  // HTTP handler for test pings
  async fetch(request, env, ctx) {
    const now = new Date().toISOString();
    console.log("HTTP request received at:", now);
    return new Response(`Test Ping: Worker is running. Time: ${now}`);
  },

  // Scheduled handler – normally triggered by a CRON job in production
  async scheduled(event, env, ctx) {
    const scheduledTime = new Date(event.scheduledTime).toISOString();
    console.log("Scheduled event triggered at:", scheduledTime);

    // Retrieve your NEAR credentials from the Worker’s environment (set as secrets)
    const accountId = env.NEAR_ACCOUNT_ID; // e.g., "zachman.near"
    const publicKey = env.NEAR_PUBLIC_KEY; // e.g., "ed25519:54esjzDMmVydh17eHVkHGSFrX7cos5PEzuDsXTZG7FQd"
    const privateKey = env.NEAR_PRIVATE_KEY; // e.g., "ed25519:..." (stored without exposure)

    // Generate a fresh nonce
    const nonce = generateNonce();
    // Define the message to sign (you can adjust this as needed)
    const messageToSign = "Welcome to NEAR AI Hub!";
    // Concatenate message and nonce (if required by the signing scheme)
    const fullMessage = messageToSign + nonce;
    // Sign the full message with your private key
    const signature = signMessage(fullMessage, privateKey);

    // Build the dynamic auth token object
    const authToken = {
      account_id: accountId,
      public_key: publicKey,
      signature: signature,
      callback_url: "https://app.near.ai/", // Adjust if needed
      message: messageToSign,
      nonce: nonce,
      recipient: "ai.near",
    };

    // Use the dynamic auth token in your Authorization header
    const url = "https://api.near.ai/v1/threads/runs";
    const headers = {
      "Content-Type": "application/json",
      // The API expects the token as a JSON string after 'Bearer '
      Authorization: `Bearer ${JSON.stringify(authToken)}`,
    };

    // Define your API payload
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
      console.log("Sending request to NEAR AI API with dynamic auth...");
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data),
      });
      const result = await response.json();
      console.log("API Response:", JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("Error during scheduled fetch:", error);
    }

    return new Response(`Scheduled task completed at ${scheduledTime}`);
  },
};
