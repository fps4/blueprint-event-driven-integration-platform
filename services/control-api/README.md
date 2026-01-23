# control-api

Control plane API for managing workspaces, clients, and users in the event streaming platform.

## Overview
- Exposes REST endpoints under `/api` for CRUD-style operations.
- Connects to MongoDB for persistence.
- Provides health probes at `/health` (root) and `/api/health`.

## Requirements
- Node.js 20+
- MongoDB (connection string via `MONGO_URI`/`MONGO_BASE_URI` and `MONGO_DB`/`MONGO_MASTER_DB`)
- pnpm/npm for scripts

## Configuration
Environment variables (see `src/config.ts`):
- `CONTROL_API_PORT` or `API_PORT` (default `7304`)
- `MONGO_URI` or `MONGO_BASE_URI` (default `mongodb://localhost:27017`)
- `MONGO_DB` or `MONGO_MASTER_DB` (default `control-api`)
- `CORS_ORIGINS` (comma-separated allowlist)
- `AUTH_JWT_ISSUER` (default `control-api`)
- `AUTH_JWT_AUDIENCE` (default `control-api-ui`)
- `KAFKA_BROKERS` (comma-separated `host:port` list; required for topic creation)
- `KAFKA_CLIENT_ID` (default `control-api`)
- `KAFKA_USE_SSL` (`true` to enable SSL)
- `KAFKA_SASL_MECHANISM` (e.g., `plain`, `scram-sha-256`, `scram-sha-512`)
- `KAFKA_SASL_USERNAME`, `KAFKA_SASL_PASSWORD` (set when SASL auth is required)

## Running
Install deps and start (dev):
```bash
cd services/control-api
npm install
npm run dev
```

Build and start (prod):
```bash
npm run build
npm start
```

## API
- Base path: `/api`
- Health: `GET /health` and `GET /api/health`
- Topics:
  - `POST /api/topics` — create a Kafka topic `{ name, partitions?, replication? }` (defaults: `partitions=1`, `replication=1`)
  - `GET /api/topics` — list Kafka topics
  - `GET /api/topics/:name/metrics` — per-partition offsets `{ startOffset, endOffset, offsetLag }`
- Workspaces:
  - `GET /api/workspaces` — list
  - `POST /api/workspaces` — create `{ id, name, allowedOrigins? }`
- Clients (scoped to workspace):
  - `GET /api/workspaces/:id/clients` — list
  - `POST /api/workspaces/:id/clients` — create `{ id, secretHash, secretSalt?, allowedScopes?, allowedTopics? }`
- Users (scoped to workspace):
  - `GET /api/workspaces/:id/users` — list
  - `POST /api/workspaces/:id/users` — create `{ id, username, passwordHash?, passwordSalt?, roles? }`

Errors are returned as JSON with `error` messages and HTTP status codes (400/500).
