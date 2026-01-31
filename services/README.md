# Major Platform Services

High-level guide to platform services and what each one owns. Use this as a quick capability map when reasoning about flows or ownership.

## Control API
- Presents the control plane for UI/automation; no data-path ingestion/delivery.
- Persists state in MongoDB using shared Mongoose models (`Workspace`, `Client`, `User`, `Session`, `JsonataTransform`, etc.).
- Kafka admin via KafkaJS: create/list topics, fetch offsets/lag metrics; enforces platform naming/ACL conventions.
- Exposes REST endpoints for workspaces, pipelines (start/stop), connectors, clients/users, topics, logs/traces, and Jsonata transform configs (`draft|active|deprecated`).
- Consumes Authorizer-issued JWTs on all `/api/*` routes; structured logging with `x-request-id`.

## Authorizer
- Issues short-lived HS256 JWTs for clients (`/ingest/*`) and users/UI/control callers (`/api/*`); stores sessions in MongoDB.
- Validates client status/secrets and workspace association before issuing; supports user registration/auth and workspace membership selection.
- Claims include session/principal IDs, optional workspace (`wid`), scopes/topics; refresh flow updates TTL and re-issues tokens.
- CORS allowlist + structured logging; configuration via `AUTH_JWT_SECRET`, `MONGO_URI`, `SESSION_TTL_MINUTES`, etc.

## UI & Control Surface
- Operator-facing UI that drives the wizard: source → topics → transform → destinations → observability → access.
- Enforces RBAC per environment, audits all mutations, and delegates auth to Authorizer.
- Surfaces pipeline lifecycle (create/update/publish/start/pause/resume), connector configuration, schema catalog (browse/diff/tag/pin), transform selection/preview, replay/DLQ workflows, observability dashboards, and embedded docs.
- Backs its flows with Control API and Authorizer; read-only guardrails for broker settings.

## Connectors (Kafka Connect + HTTP services)
- Platform-managed Kafka Connect via REST (`/connector-plugins`, create/update/pause/resume/delete/status); Confluent Hub plugins catalog.
- Shared `connector-core` package: request/response types, telemetry hooks, `validateTopicName`, `defaultRetryPolicy` (3 attempts, exponential-ish backoff up to 2s on 408/429/5xx).
- HTTP Source (`connector-http-source`): `POST /ingest/:topic`, requires `application/json` with non-empty object/array, validates topic, propagates/generates `x-request-id`, returns `202`.
- HTTP Sink (`connector-http-sink`): consumes configured topics, validates names, logs records with correlation IDs; future: real REST delivery using retry policy.

## Workers / Transform Runtime
- Purpose-built runtimes that consume `raw` topics, validate payloads, apply mappings, and emit to `enriched` or `dlq`.
- Current: `worker-jsonata` watches versioned `JsonataTransform` configs from Mongo (via Control API models), subscribes to active `sourceTopic`s, applies Jsonata expression, produces to `targetTopic`, DLQs on failure with context/headers (`x-request-id`, `x-dlq-reason`).
- Roadmap runtimes: ksqlDB (SQL-first), Kafka Streams (stateful/custom). Config: `KAFKA_BROKERS`, `KAFKA_CLIENT_ID/GROUP_ID`, `WORKSPACE_ID`, `DLQ_TOPIC`, `MONGO_URI/DB`.

## Broker (Kafka)
- Operated by platform team; all topics/ACLs provisioned via control plane.
- Naming pattern: `<env>.<workspace>.<stream>.<variant>` (`raw|enriched|dlq|retry`), chars `a-zA-Z0-9._-`, max 249, no `.`/`..`.
- Best practices: right-size partitions, per-topic retention (raw shorter, DLQ longer), always provision DLQ (and optional retry), strict ACLs, schema binding, and robust observability/alerting.

## Schema Registry
- Confluent Schema Registry at `http://schema-registry:8081`; used by Kafka Connect and custom services for Avro/JSON Schema/Protobuf.
- Connect converter envs: `io.confluent.connect.avro.AvroConverter` (or JSON/Proto equivalents) with corresponding `...SCHEMA_REGISTRY_URL`.
- Custom services should use Schema Registry-aware producers/consumers (`@kafkajs/confluent-schema-registry`) to serialize/deserialize payloads.

## Data Models Package
- Shared package `@event-streaming-platform/data-models` exposing Mongoose schemas/models for `Workspace`, `Client`, `User`, `Session`, `Notification`, `Contact` plus `makeModels(conn)`.
- Used by Authorizer and Control API for consistent tenant-scoped persistence with indexes on status, workspace, and identifiers.
