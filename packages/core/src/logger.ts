// Simple logger for agent-core
// In production, replace with your preferred logging solution

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = 'warn';

function createConsoleLogger(): Logger {
  return {
    debug: (message, ...args) => {
      if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.debug) {
        console.debug(`[DEBUG] ${message}`, ...args);
      }
    },
    info: (message, ...args) => {
      if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.info) {
        console.info(`[INFO] ${message}`, ...args);
      }
    },
    warn: (message, ...args) => {
      if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.warn) {
        console.warn(`[WARN] ${message}`, ...args);
      }
    },
    error: (message, ...args) => {
      if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.error) {
        console.error(`[ERROR] ${message}`, ...args);
      }
    },
  };
}

let logger: Logger = createConsoleLogger();

export function setLogger(newLogger: Logger): void {
  logger = newLogger;
}

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLogger(): Logger {
  return logger;
}
