import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import { defaultRetryPolicy, InvalidTopicNameError, validateTopicName } from "@event-streaming-platform/connector-core";

// Because server.ts starts the app on import, we recreate an instance of the routes here for isolated testing.
import { randomUUID } from "node:crypto";
import pino from "pino";

const logger = pino({ level: "silent" });

function buildApp() {
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

  app.post("/ingest/:topic", (req, res) => {
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

      logger.info(
        {
          payload,
          retryPolicy: defaultRetryPolicy,
          topic,
          requestId: res.locals.requestId
        },
        "ingest event accepted"
      );

      res.status(202).json({ status: "accepted", topic, requestId: res.locals.requestId });
    } catch (error) {
      handleRouteError(error, res, logger);
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ status: "error", message: "route not found", requestId: res.locals.requestId });
  });

  return app;
}

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

function handleRouteError(error: unknown, res: express.Response, log: typeof logger): void {
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

test("GET /health responds ok and sets requestId", async () => {
  const app = buildApp();
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.ok(res.body.requestId);
  assert.ok(res.headers["x-request-id"]);
});

test("POST /ingest rejects non-json content type", async () => {
  const app = buildApp();
  const res = await request(app).post("/ingest/topic1").send("plain text");
  assert.equal(res.status, 415);
  assert.equal(res.body.status, "error");
});

test("POST /ingest rejects empty payloads", async () => {
  const app = buildApp();
  const resObj = await request(app).post("/ingest/topic1").set("Content-Type", "application/json").send({});
  assert.equal(resObj.status, 400);
  const resArr = await request(app).post("/ingest/topic1").set("Content-Type", "application/json").send([]);
  assert.equal(resArr.status, 400);
});

test("POST /ingest rejects invalid topic", async () => {
  const app = buildApp();
  const res = await request(app)
    .post("/ingest/bad topic")
    .set("Content-Type", "application/json")
    .send({ a: 1 });
  assert.equal(res.status, 400);
});

test("POST /ingest returns 404 for unknown route", async () => {
  const app = buildApp();
  const res = await request(app).post("/unknown").set("Content-Type", "application/json").send({ a: 1 });
  assert.equal(res.status, 404);
});

test("POST /ingest accepts valid payload", async () => {
  const app = buildApp();
  const res = await request(app)
    .post("/ingest/topic1")
    .set("Content-Type", "application/json")
    .send({ a: 1 });
  assert.equal(res.status, 202);
  assert.equal(res.body.status, "accepted");
  assert.equal(res.body.topic, "topic1");
  assert.ok(res.body.requestId);
});
