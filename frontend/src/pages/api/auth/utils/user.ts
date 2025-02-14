// api/auth/utils/user.ts

import { Base64URLString, WebAuthnCredential } from "@simplewebauthn/server";
import { v4 as uuidv4 } from "uuid";
import { ContractMetadata } from "../../../../utils/models/metadata";

// Define the User interface
export interface User {
  id: string;
  username: string;
  authenticators: WebAuthnCredential[];
  contractMetadata: ContractMetadata | null;
  nearAccountId?: string | null;
  turnKey?: string | null;
  recoveryKey?: string | null;
}

// Extend the NodeJS Global interface to include our mock databases
declare global {
  var users: User[];
  var credentialIdToUserId: Record<Base64URLString, string>;
}

global.users = global.users || [];
global.credentialIdToUserId = global.credentialIdToUserId || {};

// Export the reference
export const users = global.users;
export const credentialIdToUserId = global.credentialIdToUserId;

/**
 * Fetch a user by their username.
 * @param username - The username of the user.
 * @returns The User object if found, otherwise undefined.
 */
export const getUserByUsername = async (
  username: string
): Promise<User | undefined> => {
  const normalizedUsername = username.toLowerCase();
  console.log(`Fetching user by username: '${normalizedUsername}'.`);
  const user = users.find((user) => user.username === normalizedUsername);
  if (user) {
    console.log(`User '${normalizedUsername}' found.`);
  } else {
    console.warn(`User '${normalizedUsername}' not found.`);
  }
  return user;
};

// Fetch user by credential ID
export const getUserByCredentialId = async (
  credentialID: string
): Promise<User | undefined> => {
  console.log(`Fetching user by credentialID: '${credentialID}'.`);
  const userId = credentialIdToUserId[credentialID];
  if (!userId) {
    console.warn(`No user found for credentialID '${credentialID}'.`);
    return undefined;
  }
  const user = users.find((user) => user.id === userId);
  if (user) {
    console.log(
      `User '${user.username}' found for credentialID '${credentialID}'.`
    );
  } else {
    console.warn(
      `User ID '${userId}' not found for credentialID '${credentialID}'.`
    );
  }
  return user;
};

/**
 * Add a new user to the system.
 * @param username - The username of the new user.
 * @returns The newly created User object.
 */
export const addUser = async (username: string): Promise<User> => {
  const normalizedUsername = username.toLowerCase();
  const newUser: User = {
    id: uuidv4(),
    username: normalizedUsername,
    authenticators: [],
    nearAccountId: null,
    contractMetadata: null,
    turnKey: null,
    recoveryKey: null,
  };

  console.log(`Adding new user: '${normalizedUsername}'.`);
  users.push(newUser);
  console.log(`User '${normalizedUsername}' added with ID '${newUser.id}'.`);
  return newUser;
};

/**
 * Add an authenticator to a user.
 * @param userId - The ID of the user.
 * @param authenticator - The WebAuthn authenticator credential.
 */
export const addAuthenticatorToUser = async (
  userId: string,
  authenticator: WebAuthnCredential
): Promise<void> => {
  console.log(`Adding authenticator to user ID '${userId}'.`);

  // Check if the credential is already associated with another user
  if (
    credentialIdToUserId[authenticator.id] &&
    credentialIdToUserId[authenticator.id] !== userId
  ) {
    console.error(
      "Authenticator credential ID already in use by another user."
    );
    throw new Error("Passkey already associated with another account.");
  }

  // Associate the credential with the user
  credentialIdToUserId[authenticator.id] = userId;

  // Add the authenticator to the user's record
  const user = users.find((user) => user.id === userId);
  if (user) {
    // Prevent duplicate authenticators
    const existingAuth = user.authenticators.find(
      (authr) => authr.id === authenticator.id
    );
    if (!existingAuth) {
      user.authenticators.push(authenticator);
      console.log(
        `Authenticator '${authenticator.id}' added to user '${user.username}'.`
      );
    } else {
      console.log(
        `User '${user.username}' already has authenticator '${authenticator.id}'.`
      );
    }
  } else {
    throw new Error("User not found.");
  }
};

/**
 * Update NEAR Account ID and related metadata for a user.
 * @param userId - The ID of the user.
 * @param contractMetadata - The contract metadata to set.
 * @param turnKey - The turn key.
 * @param recoveryKey - The recovery key.
 */
export const setUserContractData = async (
  userId: string,
  contractMetadata: ContractMetadata,
  turnKey: string
): Promise<void> => {
  console.log(`Setting contract data for user ID '${userId}'.`);
  const user = users.find((user) => user.id === userId);
  if (user) {
    user.nearAccountId = contractMetadata.contracts.userContractId;
    user.contractMetadata = contractMetadata;
    user.turnKey = turnKey;
    console.log(
      `Contract data set for user '${user.username}'. NEAR Account ID: '${user.nearAccountId}'.`
    );
  } else {
    console.error(`SetUserContractData failed: User ID '${userId}' not found.`);
    throw new Error("User not found.");
  }
};

/**
 * Update the authenticator counter to prevent replay attacks.
 * @param userId - The ID of the user.
 * @param credentialID - The credential ID of the authenticator.
 * @param newCounter - The new counter value.
 */
export const updateAuthenticatorCounter = async (
  userId: string,
  credentialID: string,
  newCounter: number
): Promise<void> => {
  console.log(
    `Updating authenticator counter for user ID '${userId}', credentialID '${credentialID}'.`
  );
  const user = users.find((user) => user.id === userId);
  if (user) {
    const authenticator = user.authenticators.find(
      (authr) => authr.id === credentialID
    );
    if (authenticator) {
      authenticator.counter = newCounter;
      console.log(
        `Authenticator counter updated to '${newCounter}' for user '${user.username}'.`
      );
    } else {
      console.warn(
        `Authenticator ID '${credentialID}' not found for user '${user.username}'.`
      );
    }
  } else {
    console.error(
      `UpdateAuthenticatorCounter failed: User ID '${userId}' not found.`
    );
    throw new Error("User not found.");
  }
};
