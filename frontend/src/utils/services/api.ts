// src/services/api.ts

import axios, { AxiosInstance } from "axios";
import { ContractMetadata } from "@utils/models/metadata";

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
      inngestRunId?: string;
    };
  },

  // ------------------- PORTFOLIO + BUNDLES -------------------
  async createPortfolio(token: string) {
    const res = await client.post("/auth/user/create-portfolio", { token });
    return res.data; // { success, message, jobId? }
  },

  async buyBundle(token: string, bundleId: string, amount: number) {
    const res = await client.post("/auth/user/buy-bundle", {
      token,
      bundleId,
      amount,
    });
    return res.data; // { success, jobId, message }
  },

  async rebalance(token: string, newAllocations: Record<string, number>) {
    const res = await client.post("/auth/user/rebalance", {
      token,
      newAllocations,
    });
    return res.data; // { success, jobId }
  },

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
    return res.data; // { success, jobId }
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
