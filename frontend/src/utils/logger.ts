/**
 * Lightweight logging utility that limits noise in production builds.
 * Debug/info/warn output is suppressed outside development, while errors always surface.
 */
const isDevelopment = import.meta.env.DEV;
const enableInfo = isDevelopment || import.meta.env.VITE_LOG_INFO === 'true';
const enableWarnings = isDevelopment || import.meta.env.VITE_LOG_WARNINGS === 'true';

type LogMethod = (...args: unknown[]) => void;

const noOp: LogMethod = () => undefined;

export const logger = {
  debug: isDevelopment ? ((...args: unknown[]) => console.debug(...args)) : noOp,
  info: enableInfo ? ((...args: unknown[]) => console.info(...args)) : noOp,
  warn: enableWarnings ? ((...args: unknown[]) => console.warn(...args)) : noOp,
  error: (...args: unknown[]) => console.error(...args),
};

export type Logger = typeof logger;
