type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function isValidLogLevel(level: string | undefined): level is LogLevel {
  return level !== undefined && level in LOG_LEVELS;
}

function getDefaultLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  return isValidLogLevel(envLevel) ? envLevel : "info";
}

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

export function createLogger(name: string, level?: LogLevel): Logger {
  const minLevel = LOG_LEVELS[level ?? getDefaultLogLevel()];
  const prefix = `[${name}]`;

  const log = (logLevel: LogLevel, message: string, ...args: unknown[]) => {
    if (LOG_LEVELS[logLevel] < minLevel) {
      return;
    }
    const timestamp = new Date().toISOString();
    const levelStr = logLevel.toUpperCase().padEnd(5);
    console.log(`${timestamp} ${levelStr} ${prefix} ${message}`, ...args);
  };

  return {
    debug: (message: string, ...args: unknown[]) => log("debug", message, ...args),
    info: (message: string, ...args: unknown[]) => log("info", message, ...args),
    warn: (message: string, ...args: unknown[]) => log("warn", message, ...args),
    error: (message: string, ...args: unknown[]) => log("error", message, ...args),
  };
}

export const logger = createLogger("Default");
