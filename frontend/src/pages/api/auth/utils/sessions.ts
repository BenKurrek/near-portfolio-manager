// src/utils/sessions.ts

import { PrismaClient, Session } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Creates a new session row in DB with optional expiration.
 */
export async function createSession(
  token: string,
  userId: string,
  expiresAt?: Date
): Promise<Session> {
  // You can decide if you allow only 1 session per user or not.
  // If you want to allow multiple, just do a create.
  // If you only want 1, you'd do an upsert or something.
  return prisma.session.create({
    data: { token, userId, expiresAt },
  });
}

/**
 * Retrieves a session by token.
 */
export async function getSession(token: string): Promise<Session | null> {
  return prisma.session.findUnique({
    where: { token },
  });
}

/**
 * Deletes a session (logging out).
 */
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.delete({
    where: { token },
  });
}

/**
 * OPTIONAL: Wipe out all sessions for a user, etc.
 */
export async function deleteAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
