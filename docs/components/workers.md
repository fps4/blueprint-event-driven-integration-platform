# Workers / Transform Runtime

Purpose-built runtimes that take raw events from source topics, apply user-defined mappings/validations, and emit enriched events (or DLQ failures). These are controlled by the UI/Control API and share topic/schema conventions from [broker.md](./broker.md).

## Runtimes (initial set)
- **worker-jsonata**: lightweight JavaScript worker for simple mappings and field reshaping; great for rapid iteration and demos.
- **worker-ksqldb**: SQL-first transformation using ksqlDB; suited for joins/windows and team-owned queries.
- **worker-streams**: Kafka Streams (Java) for complex/stateful flows or custom processors where SQL/Jsonata fall short.

Current implementation: `services/worker-jsonata` consumes `JsonataTransform` configs from Mongo (via control-api data models), subscribes to each active `sourceTopic`, applies the compiled Jsonata expression, and produces to the configured `targetTopic`. On errors, it writes to DLQ (`<source>.dlq` or `DLQ_TOPIC`) with context and headers (`x-request-id`, `x-dlq-reason`).

## Responsibilities
- Consume `raw` topics for an integration (pattern: `<env>.<workspace>.<stream>.raw`).
- Validate payloads against the registered schema; attach schema ID/version to outbound records.
- Apply the selected mapping (Jsonata/SQL/Streams) and emit to the corresponding `enriched` topic.
- On transform/validation failure, emit to the integration’s `dlq` (and optionally `retry`) with failure context.
- Propagate correlation/request IDs in headers for end-to-end tracing.

## Control & Configuration
- Control API stores versions of mappings and binds them to topics; workers fetch config on startup and watch for updates.
- Mappings and schema references are immutable/versioned; rollouts should be atomic with the ability to roll back.
- Secrets (e.g., downstream API keys for side effects) are injected via secure config, never baked into images.

## Operational Expectations
- Deploy workers per environment (dev/test/prod) with minimal privileges: consume raw, produce enriched/dlq for their workspace.
- Observability: metrics for throughput, lag, transform error rate, DLQ rate; structured logs with request/topic metadata.
- Backpressure/health: surface readiness when config is loaded and producer/consumer are connected; pause consumption on repeated failures.

## Demo/POC defaults
- Use `worker-jsonata` for quick demos; map `http-source` payloads to an `*.enriched` topic.
- Provision `dlq` topics alongside raw/enriched and demonstrate a failing message landing there with context.

### worker-jsonata runtime config
- `KAFKA_BROKERS` (comma-separated; default `broker:9092`)
- `KAFKA_CLIENT_ID` / `KAFKA_GROUP_ID` (default `worker-jsonata`)
- `WORKSPACE_ID` (optional filter to only load transforms for a single workspace)
- `DLQ_TOPIC` (optional override; otherwise `<source>.dlq`)
- `MONGO_URI` / `MONGO_DB` for control-api Mongo
- `LOG_LEVEL`, `NODE_ENV`
