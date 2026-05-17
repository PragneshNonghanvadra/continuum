export type LogLevel = "debug" | "info" | "warn" | "error";

export type ServerLogger = {
  debug(message: string, metadata?: LogMetadata): void;
  error(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
};

export type LogMetadata = Record<string, unknown>;

export type ServerLoggerOptions = {
  now?: () => string;
  service?: string;
  sink?: (line: string) => void;
};

const secretKeyPattern = /(authorization|api[-_]?key|secret|token|password|credential)/i;

export function createServerLogger(options: ServerLoggerOptions = {}): ServerLogger {
  const now = options.now ?? (() => new Date().toISOString());
  const service = options.service ?? "continuum";
  const sink = options.sink ?? ((line) => console.log(line));

  const write = (level: LogLevel, message: string, metadata: LogMetadata = {}) => {
    sink(
      JSON.stringify({
        ...(redactSecrets(metadata) as LogMetadata),
        level,
        message,
        service,
        timestamp: now()
      })
    );
  };

  return {
    debug: (message, metadata) => write("debug", message, metadata),
    error: (message, metadata) => write("error", message, metadata),
    info: (message, metadata) => write("info", message, metadata),
    warn: (message, metadata) => write("warn", message, metadata)
  };
}

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSecrets);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      secretKeyPattern.test(key) ? "[redacted]" : redactSecrets(nestedValue)
    ])
  );
}
