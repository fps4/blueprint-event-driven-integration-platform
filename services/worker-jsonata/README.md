# worker-jsonata

Jsonata-based transform worker that consumes raw topics, applies workspace-scoped Jsonata expressions, and produces enriched events (or DLQ records on failure).

## Configuration
- `KAFKA_BROKERS` (comma-separated, default `broker:9092`)
- `KAFKA_CLIENT_ID` (default `worker-jsonata`)
- `KAFKA_GROUP_ID` (default `worker-jsonata`)
- `WORKSPACE_ID` (optional; when set, only processes transforms for that workspace)
- `DLQ_TOPIC` (optional; overrides per-topic `<source>.dlq` default)
- `MONGO_URI` (default `mongodb://localhost:27017`)
- `MONGO_DB` (default `control-api`)
- `LOG_LEVEL` (default `info`)
- `REFRESH_INTERVAL_MS` (default `60000`) — how often to reload active transforms from Mongo and subscribe to new source topics

## Behavior
- Loads **active** Jsonata transforms from Mongo (`JsonataTransform` model) and keeps the highest version per `sourceTopic`.
- Subscribes to each `sourceTopic`, transforms JSON payloads with the compiled expression, and produces to `targetTopic`.
- On transform/JSON errors, writes a structured error to DLQ (`DLQ_TOPIC` or `<source>.dlq`) with headers `x-request-id` and `x-dlq-reason`.

## Scripts
- `npm run dev` — start in dev mode with ts-node.
- `npm run build` — compile TypeScript.
- `npm start` — run compiled output.
