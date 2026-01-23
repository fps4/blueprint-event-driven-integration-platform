# Control API Service

Minimal control-plane API used by UI/automation to manage workspaces, clients, users, and Kafka topics.

## Scope & Responsibilities
- Present a basic control plane; no data-path ingestion/delivery.
- Persist state in MongoDB; broker interactions via KafkaJS admin.

## Representative Endpoints (REST-style)
- `GET /health` — service liveness/readiness.
- `GET /api/health` — API health.
- Workspaces: `GET /api/workspaces`, `POST /api/workspaces`.
- Clients: `GET /api/workspaces/:id/clients`, `POST /api/workspaces/:id/clients`.
- Users: `GET /api/workspaces/:id/users`, `POST /api/workspaces/:id/users`.
- Topics (Kafka admin via KafkaJS): `POST /api/topics` (create), `GET /api/topics` (list), `GET /api/topics/:name/metrics` (per-partition offsets/lag).
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

## Non-Functional
- **Security**: basic validation; CORS allowlist; no secrets echoed.
- **Reliability**: fail-fast validation; structured error responses.
- **Observability**: structured logs with `x-request-id`; per-request logging.
- **Performance**: lightweight admin calls; topic metrics are per-partition offset snapshots.
