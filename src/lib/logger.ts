// Centralized logging utility
// Provides structured, timestamped logging for debugging
//
// Usage:
//   - Logs are stored in a buffer for later retrieval
//   - Console output can be enabled/disabled at runtime
//   - In browser console: window.__appLogger.enable() / window.__appLogger.disable()
//   - Or: window.__appLogger.setLevel('info') to only show info and above

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
  error?: Error | undefined;
}

// Store recent logs for debugging (circular buffer)
const LOG_BUFFER_SIZE = 200;
const logBuffer: LogEntry[] = [];

// Configuration
let consoleEnabled = true; // Set to false for production if desired
let minLevel: LogLevel = 'info'; // Only show info and above by default

function formatTimestamp(): string {
  return new Date().toISOString();
}

function addToBuffer(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.shift();
  }
}

function formatLogMessage(context: string, message: string): string {
  return `[${formatTimestamp()}] [${context}] ${message}`;
}

function shouldLog(level: LogLevel): boolean {
  return consoleEnabled && LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

export const logger = {
  // Enable/disable console output at runtime
  enable(): void {
    consoleEnabled = true;
    console.info('[logger] Console output enabled');
  },

  disable(): void {
    console.info('[logger] Console output disabled (logs still buffered)');
    consoleEnabled = false;
  },

  // Set minimum log level ('debug', 'info', 'warn', 'error')
  setLevel(level: LogLevel): void {
    minLevel = level;
    console.info(`[logger] Log level set to: ${level}`);
  },

  // Check current settings
  getSettings(): { enabled: boolean; level: LogLevel } {
    return { enabled: consoleEnabled, level: minLevel };
  },

  debug(context: string, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: formatTimestamp(),
      level: 'debug',
      context,
      message,
      data,
    };
    addToBuffer(entry);

    if (shouldLog('debug')) {
      if (data !== undefined) {
        console.log(formatLogMessage(context, message), data);
      } else {
        console.log(formatLogMessage(context, message));
      }
    }
  },

  info(context: string, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: formatTimestamp(),
      level: 'info',
      context,
      message,
      data,
    };
    addToBuffer(entry);

    if (shouldLog('info')) {
      if (data !== undefined) {
        console.info(formatLogMessage(context, message), data);
      } else {
        console.info(formatLogMessage(context, message));
      }
    }
  },

  warn(context: string, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: formatTimestamp(),
      level: 'warn',
      context,
      message,
      data,
    };
    addToBuffer(entry);

    if (shouldLog('warn')) {
      if (data !== undefined) {
        console.warn(formatLogMessage(context, message), data);
      } else {
        console.warn(formatLogMessage(context, message));
      }
    }
  },

  error(context: string, message: string, error?: unknown, data?: unknown): void {
    const err = error instanceof Error ? error : undefined;
    const entry: LogEntry = {
      timestamp: formatTimestamp(),
      level: 'error',
      context,
      message,
      data,
      error: err,
    };
    addToBuffer(entry);

    // Always show errors regardless of settings
    const formatted = formatLogMessage(context, message);
    if (err) {
      console.error(formatted, {
        error: err.message,
        stack: err.stack,
        ...(data as object),
      });
    } else if (data !== undefined) {
      console.error(formatted, data);
    } else {
      console.error(formatted);
    }
  },

  // Get recent logs for debugging (all logs, regardless of level setting)
  getRecentLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      const minLevelValue = LOG_LEVELS[level];
      return logBuffer.filter((entry) => LOG_LEVELS[entry.level] >= minLevelValue);
    }
    return [...logBuffer];
  },

  // Export logs as JSON string for copy/paste debugging
  exportLogs(): string {
    return JSON.stringify(logBuffer, null, 2);
  },

  // Clear the log buffer
  clearLogs(): void {
    logBuffer.length = 0;
    console.info('[logger] Log buffer cleared');
  },

  // Print a summary of what's in the buffer
  summary(): void {
    const counts = { debug: 0, info: 0, warn: 0, error: 0 };
    for (const entry of logBuffer) {
      counts[entry.level]++;
    }
    console.info('[logger] Buffer summary:', {
      total: logBuffer.length,
      ...counts,
      settings: { enabled: consoleEnabled, minLevel },
    });
  },
};

// Expose logger on window for debugging in browser console
if (typeof window !== 'undefined') {
  (window as unknown as { __appLogger: typeof logger }).__appLogger = logger;

  // Log instructions on how to use
  console.info(
    '%c[App Logger] Available via window.__appLogger',
    'color: #4CAF50; font-weight: bold',
    '\n  .enable() / .disable() - Toggle console output',
    '\n  .setLevel("debug"|"info"|"warn"|"error") - Set min level',
    '\n  .getRecentLogs() - Get buffered logs',
    '\n  .exportLogs() - Export as JSON',
    '\n  .summary() - Show buffer stats'
  );
}
