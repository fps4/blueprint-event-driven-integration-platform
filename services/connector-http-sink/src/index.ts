import { randomUUID } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import express, { ErrorRequestHandler } from "express";
import { Kafka, EachMessagePayload, logLevel } from "kafkajs";
import pino from "pino";
import { InvalidTopicNameError, validateTopicName } from "@event-streaming-platform/connector-core";
import { loadConfigForTest, SinkConfig } from "./test-helpers.js";

declare module "express-serve-static-core" {
  interface ResponseLocals {
    requestId: string;
  }
}

const loadConfig = (): SinkConfig => loadConfigForTest(process.env);

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true }
  }
});

const app = express();

app.use((req, res, next) => {
  const incoming = typeof req.header("x-request-id") === "string" ? req.header("x-request-id")!.trim() : "";
  const requestId = incoming || randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", requestId: res.locals.requestId });
});

app.use((_req, res) => {
  res.status(404).json({ status: "error", message: "route not found", requestId: res.locals.requestId });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  logger.error({ err, requestId: res.locals.requestId }, "unhandled error");
  res.status(500).json({ status: "error", message: "internal server error", requestId: res.locals.requestId });
};

app.use(errorHandler);

async function runConsumer(config: SinkConfig) {
  const kafka = new Kafka({
    clientId: config.clientId,
    brokers: config.brokers,
    logLevel: logLevel.ERROR
  });

  const consumer = kafka.consumer({ groupId: config.groupId });
  await consumer.connect();
  await consumer.subscribe({ topics: config.topics, fromBeginning: false });

  await consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      const { topic, partition, message } = payload;
      const key = message.key?.toString();
      const value = message.value?.toString();
      const headers = Object.fromEntries(
        Object.entries(message.headers ?? {}).map(([k, v]) => [k, v?.toString()])
      );

      logger.info(
        {
          topic,
          partition,
          offset: message.offset,
          key,
          value,
          headers
        },
        "received sink event"
      );
    }
  });

  return consumer;
}

async function main() {
  const config = loadConfig();
  const port = Number(process.env.PORT ?? 8086);

  const consumer = await runConsumer(config);

  const server = app.listen(port, () => {
    logger.info({ port, topics: config.topics }, "connector-http-sink listening");
  });

  const shutdown = async () => {
    logger.info("shutdown requested");
    await consumer.stop().catch((err) => logger.error({ err }, "error stopping consumer"));
    await consumer.disconnect().catch((err) => logger.error({ err }, "error disconnecting consumer"));
    server.close();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  if (err instanceof InvalidTopicNameError) {
    logger.error({ err }, "invalid topic in HTTP_SINK_TOPICS");
  } else {
    logger.error({ err }, "connector-http-sink failed to start");
  }
  // Give logs time to flush
  wait(200).finally(() => process.exit(1));
});
