import { Admin, Kafka, logLevel } from 'kafkajs';
import { CONFIG } from './config';
import { componentLogger } from './logger';

const kafka = new Kafka({
  clientId: CONFIG.kafkaClientId,
  brokers: CONFIG.kafkaBrokers,
  ssl: CONFIG.kafkaUseSsl || undefined,
  sasl: CONFIG.kafkaSasl,
  logLevel: logLevel.ERROR
});

const log = componentLogger('kafka');

export async function createTopic(name: string, numPartitions: number, replicationFactor: number, config: Record<string, string> = {}) {
  const admin = kafka.admin();
  await withAdmin(admin, async () => {
    log.info({ name, numPartitions, replicationFactor, config }, 'creating topic');
    await admin.createTopics({
      topics: [{
        topic: name,
        numPartitions,
        replicationFactor,
        configEntries: Object.entries(config).map(([key, value]) => ({ name: key, value }))
      }],
      waitForLeaders: true
    });
    log.info({ name }, 'topic created');
  });
}

export async function listTopics() {
  const admin = kafka.admin();
  return withAdmin(admin, async () => {
    const topics = await admin.listTopics();
    log.info({ count: topics.length }, 'fetched topics');
    return topics;
  });
}

export interface TopicPartitionMetrics {
  topic: string;
  partition: number;
  startOffset: string;
  endOffset: string;
  offsetLag: string;
}

export async function fetchTopicOffsets(topic: string): Promise<TopicPartitionMetrics[]> {
  const admin = kafka.admin();
  return withAdmin(admin, async () => {
    const started = Date.now();
    const offsets = await admin.fetchTopicOffsets(topic);
    const metrics = offsets.map((o) => ({
      topic,
      partition: o.partition,
      startOffset: o.low ?? '0',
      endOffset: o.offset,
      offsetLag: (Number(o.offset) - Number(o.low ?? '0')).toString()
    }));
    log.info({ topic, durationMs: Date.now() - started, partitions: metrics.length }, 'fetched topic offsets');
    return metrics;
  });
}

async function withAdmin<T>(admin: Admin, fn: () => Promise<T>): Promise<T> {
  await admin.connect();
  try {
    return await fn();
  } finally {
    await admin.disconnect();
  }
}
