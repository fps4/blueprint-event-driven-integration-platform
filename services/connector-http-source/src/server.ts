import { randomUUID } from "node:crypto";
import express, { ErrorRequestHandler, Response } from "express";
import pino from "pino";
import { Kafka, logLevel } from "kafkajs";
import {
  defaultRetryPolicy,
  InvalidTopicNameError,
  validateTopicName
} from "@event-streaming-platform/connector-core";

declare module "express-serve-static-core" {
  interface ResponseLocals {
    requestId: string;
  }
}

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true }
  }
});

type EnvLike = NodeJS.ProcessEnv & {
  KAFKA_BROKERS?: string;
  KAFKA_CLIENT_ID?: string;
};

type SourceConfig = {
  brokers: string[];
  clientId: string;
};

const loadConfig = (env: EnvLike): SourceConfig => {
  const brokers = (env.KAFKA_BROKERS ?? "broker:9092")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  if (!brokers.length) {
    throw new Error("KAFKA_BROKERS is required (comma-separated)");
  }

  const clientId = env.KAFKA_CLIENT_ID?.trim() || "connector-http-source";

  return { brokers, clientId };
};

const config = loadConfig(process.env);
const kafka = new Kafka({
  clientId: config.clientId,
  brokers: config.brokers,
  logLevel: logLevel.ERROR
});
const producer = kafka.producer();

const app = express();

app.use((req, res, next) => {
  const incoming = typeof req.header("x-request-id") === "string" ? req.header("x-request-id")!.trim() : "";
  const requestId = incoming || randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", requestId: res.locals.requestId });
});

app.post("/ingest/:topic", async (req, res) => {
  try {
    if (!req.is("application/json")) {
      res.status(415).json({
        status: "error",
        message: "content-type must be application/json",
        requestId: res.locals.requestId
      });
      return;
    }

    const topic = validateTopicName(req.params.topic);
    const payload = req.body;

    if (!isSupportedPayload(payload)) {
      res.status(400).json({
        status: "error",
        message: "payload must be a non-empty JSON object or array",
        requestId: res.locals.requestId
      });
      return;
    }

    const requestId = res.locals.requestId;

    await producer.send({
      topic,
      messages: [
        {
          key: requestId,
          value: JSON.stringify(payload),
          headers: { "x-request-id": requestId }
        }
      ]
    });

    logger.info(
      {
        payload,
        retryPolicy: defaultRetryPolicy,
        topic,
        requestId
      },
      "ingest event accepted"
    );

    res.status(202).json({ status: "accepted", topic, requestId });
  } catch (error) {
    handleRouteError(error, res, logger);
  }
});

app.use((_req, res) => {
  res.status(404).json({ status: "error", message: "route not found", requestId: res.locals.requestId });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  logger.error({ err, requestId: res.locals.requestId }, "unhandled error");
  res.status(500).json({ status: "error", message: "internal server error", requestId: res.locals.requestId });
};

app.use(errorHandler);

const port = Number(process.env.PORT ?? 8081);

async function start() {
  await producer.connect();

  const server = app.listen(port, () => {
    logger.info({ port, brokers: config.brokers }, "connector-http-source listening");
  });

  const shutdown = async () => {
    logger.info("shutdown requested");
    await producer
      .disconnect()
      .catch((err) => logger.error({ err }, "error disconnecting producer"));
    server.close();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  logger.error({ err }, "failed to start connector-http-source");
  process.exit(1);
});

function isSupportedPayload(body: unknown): body is Record<string, unknown> | unknown[] {
  if (body === null || body === undefined) {
    return false;
  }

  if (Array.isArray(body)) {
    return body.length > 0;
  }

  if (typeof body === "object") {
    return Object.keys(body as Record<string, unknown>).length > 0;
  }

  return false;
}

function handleRouteError(error: unknown, res: Response, log: typeof logger): void {
  if (error instanceof InvalidTopicNameError) {
    res.status(400).json({ status: "error", message: error.message, requestId: res.locals.requestId });
    return;
  }

  if (error instanceof Error) {
    log.error({ err: error, requestId: res.locals.requestId }, "route error");
  } else {
    log.error({ err: { message: String(error) }, requestId: res.locals.requestId }, "route error");
  }

  res.status(500).json({ status: "error", message: "internal server error", requestId: res.locals.requestId });
}
