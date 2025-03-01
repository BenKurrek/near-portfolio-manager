// src/pages/api/auth/utils/user.ts
import prisma from "@src/db";
import type { User as PrismaUser } from "@prisma/client";
import { Account } from "near-api-js";
import { createAccount } from "../utils/near";

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
  authenticators: StoredAuthenticator[];
};

/**
 * Helper to parse authenticators from DB (stored as a JSON string).
 */
function parseAuthenticators(authStr?: string | null): StoredAuthenticator[] {
  if (!authStr) return [];
  try {
    const arr = JSON.parse(authStr);
    return Array.isArray(arr) ? arr : [];
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
  });
  if (!user) return null;

  return {
    ...user,
    authenticators: parseAuthenticators(user.authenticators?.toString()),
  };
}

/**
 * Fetch a user by credential ID.
 */
export async function getUserByCredentialId(
  credentialID: string
): Promise<ExtendedUser | null> {
  // No longer including portfolios or agents since the schema is simpler.
  const users = await prisma.user.findMany();
  for (const user of users) {
    const auths = parseAuthenticators(user.authenticators?.toString());
    if (auths.some((auth) => auth.id === credentialID)) {
      return { ...user, authenticators: auths };
    }
  }
  return null;
}

/**
 * Create a new user with an empty "[]" for authenticators,
 * PLUS generate and store a random ED25519 key in sudoKey.
 */
export async function addUser(username: string): Promise<ExtendedUser> {
  const normalizedUsername = username.replace(/\s+/g, "").toLowerCase();

  const user = await prisma.user.create({
    data: {
      username: normalizedUsername,
      authenticators: "[]", // store as JSON string
    },
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
  const currentAuths = parseAuthenticators(currentStr.toString());
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
 * Optionally, if you have a contract that returns a deposit address after creation,
 * store that in userDepositAddress.
 */
export async function setUserContractData(
  userId: string,
  contractMetadata: {
    sudo_key: string;
    userDepositAddress: string;
  }
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      sudoKey: contractMetadata.sudo_key,
      userDepositAddress: contractMetadata.userDepositAddress,
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

  const currentAuths = parseAuthenticators(user.authenticators?.toString());
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
