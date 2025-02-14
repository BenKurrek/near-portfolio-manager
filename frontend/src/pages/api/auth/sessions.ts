// api/auth/sessions.ts

// Initialize global.loggedInUsers if not already initialized
// @ts-ignore
global.loggedInUsers = global.loggedInUsers || {};

// Export the reference
// @ts-ignore
export const loggedInUsers: Record<string, string> = global.loggedInUsers!;
