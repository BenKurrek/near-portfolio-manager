// src/utils/challenges.ts

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Creates or updates a challenge for a given userId.
 * If the user doesn't have a challenge row yet, creates one.
 * If one exists, updates it.
 */
export async function upsertChallenge(
  userId: string,
  challenge: string
): Promise<void> {
  const existing = await prisma.challenge.findFirst({
    where: { userId },
  });
  if (existing) {
    await prisma.challenge.update({
      where: { id: existing.id },
      data: { challenge },
    });
  } else {
    await prisma.challenge.create({
      data: { userId, challenge },
    });
  }
}

/**
 * Retrieves a user's challenge string.
 */
export async function getChallenge(userId: string): Promise<string | null> {
  const chal = await prisma.challenge.findFirst({
    where: { userId },
  });
  return chal?.challenge || null;
}

/**
 * Deletes a user's challenge row entirely.
 */
export async function deleteChallenge(userId: string): Promise<void> {
  await prisma.challenge.deleteMany({
    where: { userId },
  });
}

/**
 * Get or create a single "global login user" row in the DB.
 * This is for "global" login challenge flows (no username known yet).
 */
export async function getOrCreateGlobalLoginUser() {
  const specialUsername = "__global_login__";

  let user = await prisma.user.findUnique({
    where: { username: specialUsername },
  });

  if (!user) {
    // Create a stub user
    user = await prisma.user.create({
      data: {
        username: specialUsername,
        sudoKey: null,
        authenticators: "[]",
      },
    });
  }

  return user;
}
