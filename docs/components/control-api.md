# Control API Service

Control-plane API used by UI/automation to power end-user flows (workspaces, pipelines, connectors, schemas, observability).

## Scope & Responsibilities
- Present the control plane; no data-path ingestion/delivery.
- Persist state in MongoDB; broker interactions via KafkaJS admin.
- Expose APIs that satisfy end-user goals: authentication, workspace/pipeline lifecycle, connector/source/sink config, transformations, observability (stats, logs, traces), schema catalog access.

## Representative Endpoints (REST-style)
- `GET /health` — service liveness/readiness.
- `GET /api/health` — API health.
- User auth: integrates with Authorizer-issued tokens; user registration/auth flows exposed via `/api/users` (delegated auth token issuance through Authorizer).
- Workspaces: `GET /api/workspaces`, `POST /api/workspaces`.
- Pipelines: `GET /api/pipelines` (list all), `GET /api/pipelines/:pipelineId` (get single pipeline), `POST /api/pipelines` (create; requires `workspaceId`), `PUT /api/pipelines/:pipelineId` (update status/streams/clients/transform; requires `workspaceId`), `POST /api/pipelines/:id/start`, `POST /api/pipelines/:id/stop`.
- Connectors: source/sink config management surfaced through pipelines endpoints.
- Clients: `GET /api/workspaces/:id/clients`, `POST /api/workspaces/:id/clients`.
- Users: `GET /api/workspaces/:id/users`, `POST /api/workspaces/:id/users`.
- Topics (Kafka admin via KafkaJS): `POST /api/topics` (create), `GET /api/topics` (list), `GET /api/topics/:name/metrics` (per-partition offsets/lag).
- Pipeline run logs & traces: `GET /api/pipelines/:id/logs`, `GET /api/pipelines/:id/traces` (backs UI observability views).
- Connector statistics: `GET /api/connectors/:id/stats`; Kafka statistics: `GET /api/kafka/stats`.
- Jsonata transforms (config for worker-jsonata): `GET /api/workspaces/:id/jsonata-transforms`, `POST /api/workspaces/:id/jsonata-transforms` (versioned expressions mapped to source/target topics, optional schema IDs, status `draft|active|deprecated`).

## Integration with Other Services
- **MongoDB (via `@event-streaming-platform/data-models`)**: uses shared Mongoose models for multi-tenant state:
  - `Workspace`: tenants with status and allowed origins.
  - `Client`: per-workspace clients with secret hash/salt, allowed scopes/topics.
  - `User`: per-workspace users with roles and credentials.
  - `Session`: issued tokens for clients/users with scopes/topics and expiry.
  - `JsonataTransform`: versioned Jsonata expressions bound to source/target topics (plus schema IDs) for the transform runtime.
  - Access patterns: workspace scoping on every query, status `active` checks, audit on mutations.
- **Kafka (via KafkaJS admin)**: topic creation/listing and offset metrics; configured by `KAFKA_BROKERS`, SSL/SASL envs.
- **Authorizer**: issues JWTs for UI/control callers; Control API validates bearer tokens on `/api/*`.

## Non-Functional
- **Security**: basic validation; CORS allowlist; no secrets echoed.
- **Reliability**: fail-fast validation; structured error responses.
- **Observability**: structured logs with `x-request-id`; per-request logging.
- **Performance**: lightweight admin calls; topic metrics are per-partition offset snapshots.
