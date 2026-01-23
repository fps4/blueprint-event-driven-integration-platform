import pino, {
  type Logger,
  type LoggerOptions,
  type TransportSingleOptions,
  type TransportMultiOptions,
  type TransportPipelineOptions
} from 'pino';
import { getLogContextSnapshot } from './log-context.js';

export interface CreateLoggerOptions {
  level?: string;
  environment?: string;
  enablePretty?: boolean;
  prettyOptions?: Record<string, unknown>;
  base?: Record<string, unknown>;
  transport?: TransportSingleOptions | TransportMultiOptions | TransportPipelineOptions;
  pinoOptions?: LoggerOptions;
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const {
    level = 'info',
    environment = 'development',
    enablePretty = false,
    prettyOptions,
    base,
    transport,
    pinoOptions,
  } = options;

  const transportConfig = transport ?? (enablePretty
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ...(prettyOptions || {}) }
      }
    : undefined);

  const logger = pino({
    level,
    base: { environment, ...(base || {}) },
    ...(pinoOptions || {}),
    mixin() {
      return getLogContextSnapshot();
    },
    transport: transportConfig
  });

  return logger;
}
