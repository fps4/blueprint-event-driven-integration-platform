import { setTimeout as wait } from 'node:timers/promises';
import { Kafka, logLevel, type Consumer, type Producer } from 'kafkajs';
import mongoose from 'mongoose';
import { loadConfig, logger } from './config.js';
import { loadTransforms } from './transforms.js';
import { handleMessage } from './processor.js';

async function main() {
  const config = loadConfig();
  logger.info(
    {
      kafkaBrokers: config.brokers,
      clientId: config.clientId,
      groupId: config.groupId,
      workspaceId: config.workspaceId,
      dlqTopic: config.dlqTopic,
      mongoDb: config.mongoDb,
      mongoUri: config.mongoUri.replace(/\/\/.*@/, '//***:***@')
    },
    'starting worker-jsonata'
  );

  const conn = await mongoose.createConnection(config.mongoUri).asPromise();
  logger.info({ db: config.mongoDb }, 'connected to mongo');

  let transforms = await loadTransforms(conn, config.workspaceId);
  let topics = new Set(transforms.keys());

  const kafka = new Kafka({
    clientId: config.clientId,
    brokers: config.brokers,
    logLevel: logLevel.WARN
  });

  const consumer: Consumer = kafka.consumer({ groupId: config.groupId });
  const producer: Producer = kafka.producer();

  await producer.connect();
  await consumer.connect();

  for (const t of topics) {
    await consumer.subscribe({ topic: t, fromBeginning: false });
  }

  if (!topics.size) {
    logger.warn('no topics to consume; idling');
  } else {
    logger.info({ topics: Array.from(topics) }, 'subscribed to source topics');
  }

  const runConsumer = async () => {
    await consumer.run({
      eachMessage: async (payload) => {
        const transform = transforms.get(payload.topic);
        if (!transform) {
          logger.debug({ topic: payload.topic }, 'no transform registered for topic; skipping');
          return;
        }
        await handleMessage(producer, transform, payload, config.dlqTopic);
      }
    });
  };

  await runConsumer();

  const refresh = async () => {
    try {
      const fresh = await loadTransforms(conn, config.workspaceId);
      const nextTopics = new Set(fresh.keys());

      const newTopics: string[] = [];
      for (const topic of nextTopics) {
        if (!topics.has(topic)) {
          newTopics.push(topic);
        }
      }

      transforms = fresh;
      topics = nextTopics;

      if (newTopics.length) {
        await consumer.stop();
        for (const topic of newTopics) {
          await consumer.subscribe({ topic, fromBeginning: false });
          logger.info({ topic }, 'subscribed to new source topic');
        }
        await runConsumer();
      }
    } catch (err) {
      logger.error({ err }, 'failed to refresh transforms');
    }
  };

  const refreshInterval = setInterval(refresh, config.refreshIntervalMs);
  refreshInterval.unref();

  const shutdown = async () => {
    logger.info('shutdown requested');
    await consumer.disconnect().catch((err) => logger.error({ err }, 'error disconnecting consumer'));
    await producer.disconnect().catch((err) => logger.error({ err }, 'error disconnecting producer'));
    await conn.close().catch((err) => logger.error({ err }, 'error closing mongo connection'));
    clearInterval(refreshInterval);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    logger.error({ err }, 'worker-jsonata failed to start');
    wait(200).finally(() => process.exit(1));
  });
}

export { loadConfig, loadTransforms, handleMessage };
