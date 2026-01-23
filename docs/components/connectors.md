# Connectors

Companion to [requirements-ux.md](../requirements-ux.md), [solution-design.md](../solution-design.md), and data plane placeholders in [data-plane.md](./data-plane.md). Covers Kafka Connect usage plus in-repo HTTP source/sink services.

## Kafka Connect (platform-managed)
- Runtime: Confluent Kafka Connect, configured via REST.
- Plugin catalogue: Confluent Hub (e.g., PagerDuty, Elastic, jsonata SMT).
- Core operations (REST):
  1) `GET /connector-plugins`
  2) `POST /connectors` (name + config: `connector.class`, `tasks.max`, `topics`, plugin settings)
  3) `PUT /connectors/<name>/config`
  4) `POST /connectors/<name>/pause` / `/resume`
  5) `GET /connectors/<name>/status`
  6) `DELETE /connectors/<name>`
- If a connector class is missing, install the plugin in the Connect image and retry.

## HTTP Source & Sink (repo services)

### Shared package
- `packages/connector-core`: shared HTTP connector primitives and validation.
  - Request/response types, telemetry hooks.
  - `defaultRetryPolicy`: 3 attempts, exponential-ish backoff up to 2s on 408/429/5xx.
  - `validateTopicName(topic: unknown)`: trimmed string, alphanumerics plus `._-`, no `.`/`..`, max 249 chars; throws `InvalidTopicNameError`.

### HTTP Source (`services/connector-http-source`)
- Endpoints: `GET /health`, `POST /ingest/:topic`.
- Requirements: `Content-Type: application/json`; path topic validated; body must be non-empty JSON object/array.
- Behavior: propagates/generates `x-request-id`; responds `202 { status: "accepted", topic, requestId }`; centralized 404/500.

### HTTP Sink (`services/connector-http-sink`)
- Endpoints: `GET /health`.
- Mock behavior (current): subscribes to Kafka topics listed in env var `HTTP_SINK_TOPICS` (comma-separated), validates topic names, and logs each received record to stdout/stderr with request/trace ids for observability. Uses env for `KAFKA_BROKERS`, `KAFKA_CLIENT_ID`, `KAFKA_GROUP_ID`, `PORT` (default 8086).
- Real behavior (future): post each record to configured REST endpoint (config to be moved to dynamic DB-driven settings).
- Uses `connector-core` types, telemetry hooks, and `defaultRetryPolicy`; propagates/generates `x-request-id`; logs delivery with retry context.
