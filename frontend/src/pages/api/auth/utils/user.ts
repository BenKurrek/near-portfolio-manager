// src/pages/api/auth/utils/user.ts
import prisma from "@src/db";
import type { Portfolio, User as PrismaUser, Agent } from "@prisma/client";
import type { ContractMetadata } from "@utils/models/metadata";

/**
 * We'll define how each authenticator looks in code.
 */
interface StoredAuthenticator {
  id: string;
  publicKey: string;
  counter: number;
  transports: string[];
}

/**
 * Instead of 'extends PrismaUser', omit the "authenticators" property
 * from the PrismaUser and define it yourself.
 */
export type ExtendedUser = Omit<PrismaUser, "authenticators"> & {
  portfolios: Portfolio[];
  agents: Agent[];
  authenticators: StoredAuthenticator[];
};

/**
 * Helper to parse `authenticators` from DB (stored as a JSON string).
 */
function parseAuthenticators(authStr?: string | null): StoredAuthenticator[] {
  if (!authStr) return [];
  try {
    const arr = JSON.parse(authStr);
    if (Array.isArray(arr)) {
      return arr;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetch a user by username (case-insensitive).
 */
export async function getUserByUsername(
  username: string
): Promise<ExtendedUser | null> {
  const normalizedUsername = username.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { username: normalizedUsername },
    include: { portfolios: true, agents: true },
  });
  if (!user) return null;

  return {
    ...user,
    authenticators: parseAuthenticators(user.authenticators),
  };
}

/**
 * Fetch a user by credential ID.
 */
export async function getUserByCredentialId(
  credentialID: string
): Promise<ExtendedUser | null> {
  const users = await prisma.user.findMany({
    include: { portfolios: true, agents: true },
  });
  for (const user of users) {
    const auths = parseAuthenticators(user.authenticators);
    if (auths.some((auth) => auth.id === credentialID)) {
      return { ...user, authenticators: auths };
    }
  }
  return null;
}

/**
 * Create a new user with empty "[]" for authenticators (JSON string).
 */
export async function addUser(username: string): Promise<ExtendedUser> {
  const normalizedUsername = username.toLowerCase();
  const user = await prisma.user.create({
    data: {
      username: normalizedUsername,
      authenticators: "[]", // store as JSON string
    },
    include: { portfolios: true, agents: true },
  });
  return {
    ...user,
    authenticators: [],
  };
}

/**
 * Add an authenticator to an existing user by reading the old array,
 * pushing the new authenticator, then storing as JSON.
 */
export async function addAuthenticatorToUser(
  userId: string,
  authenticator: StoredAuthenticator
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  const currentStr = user.authenticators || "[]";
  const currentAuths = parseAuthenticators(currentStr);
  currentAuths.push(authenticator);

  await prisma.user.update({
    where: { id: userId },
    data: {
      authenticators: JSON.stringify(currentAuths),
    },
  });

  console.log(
    `Authenticator '${authenticator.id}' added for user '${user.username}'.`
  );
}

/**
 * Set contract data for the user (like deposit address, contract IDs, etc.).
 */
export async function setUserContractData(
  userId: string,
  contractMetadata: ContractMetadata,
  turnKey: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      sudoKey: contractMetadata.keys.sudo_key,
      userDepositAddress: contractMetadata.contracts.userDepositAddress,
      userContractId: contractMetadata.contracts.userContractId,
      mpcContractId: contractMetadata.contracts.mpcContractId,
      nearAccountId: contractMetadata.contracts.userContractId,
      turnKey,
    },
  });
  console.log(`Contract data set for user ID '${userId}'.`);
}

/**
 * Update the counter for an authenticator in the stored array.
 */
export async function updateAuthenticatorCounter(
  userId: string,
  credentialID: string,
  newCounter: number
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  const currentAuths = parseAuthenticators(user.authenticators);
  const updated = currentAuths.map((auth) =>
    auth.id === credentialID ? { ...auth, counter: newCounter } : auth
  );

  await prisma.user.update({
    where: { id: userId },
    data: {
      authenticators: JSON.stringify(updated),
    },
  });

  console.log(`Authenticator counter updated for user '${user.username}'.`);
}
