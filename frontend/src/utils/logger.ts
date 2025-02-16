// src/utils/logger.ts
export const logger = {
  info: (...args: unknown[]) => console.info("[Fluxfolio] [INFO]", ...args),
  warn: (...args: unknown[]) => console.warn("[Fluxfolio] [WARN]", ...args),
  error: (...args: unknown[]) => console.error("[Fluxfolio] [ERROR]", ...args),
  debug: (...args: unknown[]) => console.debug("[Fluxfolio] [DEBUG]", ...args),
};
