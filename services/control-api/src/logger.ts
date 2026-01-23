import type { Logger } from 'pino';
import { createLogger, runWithLogContext, mergeLogContext, type LogContext } from '@event-streaming-platform/logging-utils';

const enablePretty = process.env.LOG_PRETTY !== 'false' && process.env.LOG_PRETTY !== '0';
const level = process.env.LOG_LEVEL || 'info';
const environment = process.env.NODE_ENV || process.env.APP_ENV || 'development';

export const logger: Logger = createLogger({
  level,
  environment,
  enablePretty,
  base: { service: 'control-api' },
  prettyOptions: { singleLine: true }
});

export function componentLogger(name: string): Logger {
  return logger.child({ component: name });
}

export function withLogContext<T>(ctx: LogContext, fn: () => T): T {
  return runWithLogContext(ctx, fn);
}

export function addLogContext(ctx: LogContext): void {
  mergeLogContext(ctx);
}
