// pages/api/auth/challenges.ts

// @ts-ignore
// Initialize global.challenges if not already initialized
global.challenges = global.challenges || {};

// @ts-ignore
// Export the reference
export const challenges: Record<string, string> = global.challenges!;
