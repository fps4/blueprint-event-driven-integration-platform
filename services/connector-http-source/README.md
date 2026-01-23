# connector-http-source

HTTP source connector that accepts JSON over HTTP and forwards payloads to topics managed by the event streaming platform.

## Overview
- Exposes REST API on port `8081` (configurable via `PORT`).
- Validates topics using `@event-streaming-platform/connector-core`.
- Accepts non-empty JSON objects/arrays; enforces `application/json`.
- Attaches `x-request-id` on all responses (uses inbound header when provided).
- Logs accepted ingests and surfaces structured errors.

## Requirements
- Node.js 20+
- npm/pnpm for scripts

## Running
Install deps and start (dev):
```bash
cd services/connector-http-source
npm install
npm run dev
```

Build and start (prod):
```bash
npm run build
npm start
```

## Configuration
- `PORT` (default `8081`)

## API
- OpenAPI spec: `openapi.yaml`
- Shared components: `../../packages/openapi-components/connectors.yaml`

Key endpoints:
- `GET /health` — returns `{ status, requestId }`
- `POST /ingest/{topic}` — body must be non-empty JSON object/array; returns `202` on acceptance, `400/415/500` on errors.
  
Note: Topics must exist in the Kafka broker. You can create them via control-api’s `POST /api/topics` once configured with Kafka admin access.

Preview locally (example with Redoc):
```bash
npx redoc-cli serve openapi.yaml
```
