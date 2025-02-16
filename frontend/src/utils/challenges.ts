// src/utils/challenges.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Creates or updates a challenge for a given user.
 */
export async function upsertChallenge(
  userId: string,
  challenge: string
): Promise<void> {
  const existing = await prisma.challenge.findFirst({ where: { userId } });
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
 * Retrieves a user's challenge.
 */
export async function getChallenge(userId: string): Promise<string | null> {
  const chal = await prisma.challenge.findFirst({ where: { userId } });
  return chal?.challenge || null;
}

/**
 * Deletes a user's challenge.
 */
export async function deleteChallenge(userId: string): Promise<void> {
  await prisma.challenge.deleteMany({ where: { userId } });
}
