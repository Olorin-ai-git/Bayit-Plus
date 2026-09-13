export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  scope: string;
  message: string;
  context?: Record<string, unknown>;
  correlationId?: string;
  timestamp: string;
}

export type LogSink = (entry: LogEntry) => void;

let sink: LogSink | undefined;
let correlationId: string | undefined;

export function setLogSink(nextSink: LogSink | undefined): void {
  sink = nextSink;
}

function emit(level: LogEntry['level'], scope: string, message: string, context?: Record<string, unknown>): void {
  sink?.({ level, scope, message, context, correlationId, timestamp: new Date().toISOString() });
}

export function createLogger(scope: string) {
  return {
    debug: (message: string, context?: Record<string, unknown>) => emit('debug', scope, message, context),
    info: (message: string, context?: Record<string, unknown>) => emit('info', scope, message, context),
    warn: (message: string, context?: Record<string, unknown>) => emit('warn', scope, message, context),
    error: (message: string, context?: Record<string, unknown>) => emit('error', scope, message, context),
  };
}

export const logger = createLogger('Extension');

export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

export function setCorrelationId(id: string | undefined): void {
  correlationId = id;
}
