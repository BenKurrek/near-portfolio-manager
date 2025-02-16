// src/utils/sessions.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Creates a new session.
 */
export async function createSession(
  token: string,
  userId: string,
  expiresAt?: Date
): Promise<void> {
  await prisma.session.create({
    data: { token, userId, expiresAt },
  });
}

/**
 * Retrieves a session by token.
 */
export async function getSession(token: string) {
  return prisma.session.findUnique({ where: { token } });
}

/**
 * Deletes a session.
 */
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.delete({ where: { token } });
}
