import { createLogger } from '@event-streaming-platform/logging-utils';

export type WorkerConfig = {
  brokers: string[];
  clientId: string;
  groupId: string;
  workspaceId?: string;
  dlqTopic?: string;
  mongoUri: string;
  mongoDb: string;
  refreshIntervalMs: number;
};

function parseList(input: string | undefined, fallback: string[] = []): string[] {
  if (!input) return fallback;
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function loadConfig(): WorkerConfig {
  const brokers = parseList(process.env.KAFKA_BROKERS, ['broker:9092']);
  if (!brokers.length) {
    throw new Error('KAFKA_BROKERS is required');
  }
  const clientId = (process.env.KAFKA_CLIENT_ID || 'worker-jsonata').trim();
  const groupId = (process.env.KAFKA_GROUP_ID || 'worker-jsonata').trim();
  const workspaceId = process.env.WORKSPACE_ID?.trim() || undefined;
  const dlqTopic = process.env.DLQ_TOPIC?.trim() || undefined;
  const mongoBase = (process.env.MONGO_URI || 'mongodb://mongodb:27017').trim().replace(/\/+$/, '');
  const mongoDb = (process.env.MONGO_DB || 'control-api').trim();
  const refreshIntervalMs = Number(process.env.REFRESH_INTERVAL_MS ?? 60_000);

  return {
    brokers,
    clientId,
    groupId,
    workspaceId,
    dlqTopic,
    mongoUri: `${mongoBase}/${mongoDb}`,
    mongoDb,
    refreshIntervalMs
  };
}

export const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  environment: process.env.NODE_ENV ?? 'development',
  enablePretty: (process.env.NODE_ENV ?? 'development') !== 'production'
});
