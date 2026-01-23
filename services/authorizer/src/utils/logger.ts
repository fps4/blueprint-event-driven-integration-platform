import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger } from '@event-streaming-platform/logging-utils';

const shouldPrettyPrint = (() => {
  const flag = process.env.LOG_PRETTY?.toLowerCase();
  if (flag === 'true' || flag === '1') {
    return true;
  }
  if (flag === 'false' || flag === '0') {
    return false;
  }
  return process.env.NODE_ENV !== 'production';
})();

const softwareSystem = (process.env.SOFTWARE_SYSTEM || '').trim();
const baseMeta: Record<string, string> = {
  container: process.env.CONTAINER || 'authorizer',
  software_system: softwareSystem || 'project-undefined'
};

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  environment: process.env.NODE_ENV || 'development',
  enablePretty: shouldPrettyPrint,
  prettyOptions: { translateTime: 'SYS:standard', colorize: true },
  base: baseMeta
});

function toFilePath(source: string): string {
  return source.startsWith('file:')
    ? fileURLToPath(source)
    : source;
}

export function componentLogger(source: string) {
  const fileName = path.basename(toFilePath(source));
  return logger.child({ component: fileName });
}

export default logger;
