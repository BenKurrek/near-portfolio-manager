// src/services/api.ts

import axios, { AxiosInstance } from "axios";
import { ContractMetadata } from "@src/utils/models/metadata";
import { BundleQuote } from "@src/components/Dashboard/BuyBundleModal";

/**
 * Create a pre-configured axios instance
 */
const client: AxiosInstance = axios.create({
  baseURL: "/api", // Same-domain calls in Next.js
  timeout: 15000,
});

/**
 * Interface for job steps from your job manager
 */
export interface JobStep {
  name: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  message?: string;
}

/**
 * Our unified API service
 */
export const apiService = {
  /**
   * Get bundle quotes.
   * @param token - The authentication token.
   * @param items - An array of quote request items.
   * Each item should include:
   *   - defuse_asset_identifier_in
   *   - defuse_asset_identifier_out
   *   - exact_amount_in
   *   - (optional) min_deadline_ms
   */
  async getBundleQuotes(token: string, items: any[]) {
    const res = await client.get("/quote/fetch-quotes", {
      params: {
        token,
        items: JSON.stringify(items), // URL-encode the JSON array
      },
    });
    return res.data; // Expects { quotes: [...] }
  },

  // ------------------- AUTH REGISTER -------------------
  async createUser(username: string) {
    const res = await client.post("/auth/register/create-user", { username });
    return res.data; // { message: string, user?: any }
  },

  async getRegisterOptions(username: string) {
    const res = await client.post("/auth/register/options", { username });
    return res.data; // Registration options
  },

  async verifyRegistration(username: string, attestationResponse: any) {
    const res = await client.post("/auth/register/verify", {
      username,
      attestationResponse,
    });
    return res.data; // { verified, token, error? }
  },

  // ------------------- AUTH LOGIN -------------------
  async getLoginOptions() {
    const res = await client.post("/auth/login/options", {});
    return res.data; // { challenge, allowCredentials, ... }
  },

  async verifyLogin(assertionResponse: any) {
    const res = await client.post("/auth/login/verify", {
      assertionResponse,
    });
    return res.data as {
      verified: boolean;
      token?: string;
      username?: string;
      accountMetadata?: ContractMetadata | null;
      error?: string;
    };
  },

  // ------------------- LOGOUT -------------------
  async logout(token: string) {
    return client.post("/auth/logout", { token });
  },

  // ------------------- WHOAMI -------------------
  async whoami(token: string) {
    const res = await client.get(`/auth/user/whoami?token=${token}`);
    return res.data; // { username, userMetadata }
  },

  // ------------------- JOBS -------------------
  async getJobStatus(jobId: string) {
    const res = await client.get(`/auth/jobs/${jobId}`);
    return res.data as {
      id: string;
      type: string;
      steps: JobStep[];
      createdAt: number;
      updatedAt: number;
      returnValue?: any;
      // Removed any `inngestRunId` reference
    };
  },

  /** Create portfolio (no more passing a pubkey) */
  async createAccount(token: string) {
    const res = await client.post("/auth/user/create-account", { token });
    return res.data;
  },

  /**
   * “Buy a bundle” is effectively the same or calls the same `balance_portfolio`.
   */
  async buyBundle(token: string, bundleId: string, quoteData: BundleQuote) {
    const res = await client.post("/auth/user/buy-bundle", {
      token,
      bundleId,
      quoteData,
    });
    return res.data;
  },

  /**
   * Rebalance with some new allocations.
   * We'll let the backend figure out agent assignment and call `balance_portfolio`.
   */
  async rebalance(token: string, newAllocations: Record<string, number>) {
    const res = await client.post("/auth/user/rebalance", {
      token,
      newAllocations,
    });
    return res.data;
  },

  /**
   * “Withdraw” calls our ephemeral signing route.
   */
  async withdraw(
    token: string,
    asset: string,
    amount: string,
    toAddress: string
  ) {
    const res = await client.post("/auth/user/withdraw", {
      token,
      asset,
      amount,
      toAddress,
    });
    return res.data;
  },

  // E.g. Add AI Agent
  async addAiAgent(token: string, agentData: any) {
    const res = await client.post("/auth/user/assign-agent", {
      token,
      agentData,
    });
    return res.data; // { success, jobId }
  },

  // Placeholder "receive-ext"
  async receiveExt(quote: any, token: string, withdrawAddress?: string) {
    const res = await client.post("/auth/receive-ext", {
      quote,
      token,
      withdrawAddress,
    });
    return res.data; // { success: boolean }
  },
};
