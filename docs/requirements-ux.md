# Requirements & UX: REST → Kafka → Transform → Kafka → REST / S3

**Related documents:** [Solution Design](./solution-design.md) and component chapters under `./solution-design/`.

## 1. Purpose & Scope

This blueprint showcases an **in-house, event-based application integration platform** where:

- The **platform team owns the Kafka-based runtime** (ingest, transform, delivery, observability).
- **Product / integration teams configure integrations** via UI (schemas, mappings, destinations).
- Kafka remains **internal-only**.
- External exposure is limited to:
  - REST ingest endpoints
  - Platform Control API (driven by UI)

### 1.1 Team Responsibilities

| Area                             | Platform Team | Product Teams    |
| -------------------------------- | ------------- | ---------------- |
| Kafka cluster                    | ✅             | ❌                |
| Connect, ksqlDB, Streams runtime | ✅             | ❌                |
| Connectors (HTTP, S3, etc.)      | ✅             | ❌                |
| Schema Registry                  | ✅             | ❌                |
| Platform UI                      | ✅             | ❌                |
| Transformation logic             | ❌             | ✅ (SQL / config) |
| Topic ownership                  | ❌             | ✅                |
| Mapping lifecycle                | ❌             | ✅                |
| Alerts & SLAs                    | Shared        | Shared           |


---

## 2. Goals

- End-to-end integration defined and operated via UI:
  - REST source ingest
  - Schema binding & validation
  - ksqlDB-based transformation
  - Multi-destination delivery (REST, S3)
  - DLQ and replay control
- Clear **ownership boundaries**:
  - Platform provides capabilities and guardrails
  - Product teams own mappings and activation
- Strong **operability & observability** suitable for on-call and demos

---

## 3. Personas & Responsibilities

### Integration Engineer (Product Team)
- Defines source and destination schemas
- Selects and versions ksqlDB transformations
- Configures destinations (REST/S3)
- Activates / pauses integrations

### Operator / On-call (Platform or Shared)
- Monitors lag, failures, DLQ growth
- Triggers replay or backfill
- Pauses/resumes integrations (circuit breaker)
- Reviews deployment and runtime status

### Security / Compliance
- Reviews schema metadata (PII flags)
- Audits configuration changes and replays
- Verifies access and RBAC boundaries

---

## 4. Core UI Flows

### 4.1 Create Integration (Wizard)

**Step 1 – Source (REST Ingest)**
- Endpoint pattern: `POST /ingest/:topic` (env-aware base URL)
- Topic path param validated via `validateTopicName` (trimmed string, alphanumerics plus `._-`, no `.`/`..`, max 249 chars)
- Requires `Content-Type: application/json`; body must be a non-empty JSON object or array; 400/415 on violation
- Request tracing: propagate or generate `x-request-id`; response `202 { status: "accepted", topic, requestId }`
- Authentication fronted by gateway (API key/OIDC), not baked into the connector service
- Rate limits & payload size limits applied at the gateway/front-door
- Validation mode (schema-bound downstream):
  - Reject on schema violation
  - Send invalid messages to DLQ

**Step 2 – Kafka Topics (Auto-generated)**
- Source topic (caller-provided via `/:topic`, validated by `validateTopicName`)
- Transformed topic
- DLQ topic
- Display (read-only):
  - Retention
  - Compaction
  - Partitioning
- Naming follows platform convention per environment

**Step 3 – Transformation**
- Select ksqlDB SQL mapping
- Version pinning (explicit version, not “latest”)
- Optional toggles:
  - PII masking / field redaction
- Destination schema selection
- Preview:
  - Sample input → output (dry run)

**Step 4 – Destinations (Multi-select)**

**REST Sink**
- Target URL
- Authentication
- Retry & backoff policy (default: 3 attempts with exponential-ish backoff up to 2s on 408/429/5xx from `defaultRetryPolicy`)
- Timeout
- Idempotency key:
  - Header or payload field
- Custom headers
- Configured and managed via Kafka Connect REST (create/update/pause/resume/delete)

**S3 Sink**
- Bucket and region
- Prefix template (e.g. `/domain/entity/date=YYYY-MM-DD/`)
- Output format: JSON or Parquet
- Compression
- Batch size & flush interval

**Step 5 – Observability & Alerts**
- Alert routes:
  - Slack
  - Email
  - PagerDuty
- Thresholds:
  - Consumer lag
  - DLQ rate
  - Destination failure rate
- Error budget per integration

**Step 6 – Access & Governance**
- Environment selection (dev / test / prod)
- RBAC:
  - Who can edit
  - Who can replay
  - Who can approve promotion

---

## 5. Schema Catalog

- Search & filter by:
  - Name
  - Domain
  - Tags
  - PII flag
- Schema lifecycle:
  - Draft
  - Active
  - Deprecated
- Versioning:
  - Compatibility policy (e.g. BACKWARD)
  - Diff view between versions
- Developer aids:
  - Sample payloads
- Impact visibility:
  - Topics using schema
  - Integrations depending on it

---

## 6. Replay & DLQ Management

- Replay selection:
  - Time window
  - Correlation ID(s)
- Controls:
  - Rate limit
  - Target version:
    - Schema version
    - Mapping version
- Safety:
  - Impact preview (message count, target topics)
  - Warnings for production
- Dry-run mode:
  - Validate without producing

---

## 7. Runtime Visibility (Demo-Critical)

### Integration Status
- Active
- Paused (manual or automatic circuit breaker)
- Failed (requires intervention)

### Per-Run Trace (Single Message View)
- REST ingress:
  - Validation result
  - Schema ID/version
- Transformation:
  - Mapping version
  - Output payload
- Delivery:
  - REST response or S3 object link
  - Retry attempts
- DLQ (if applicable):
  - Failure reason
  - Stack/context metadata

All views link to:
- Schema versions
- Mapping versions
- Config snapshot used

---

## 8. Functional Requirements

- REST ingest requires `Content-Type: application/json`, enforces non-empty JSON object/array bodies, validates topic names with `validateTopicName`, attaches/propagates `x-request-id`, and returns `202` on accept; schema validation happens in the downstream processing stage.
- Kafka Connect REST drives connector lifecycle (list/create/update/configure/pause/resume/delete).
- Schema ID/version is attached to every message.
- ksqlDB / Streams runtime:
  - Consumes source topic
  - Applies SQL mapping
  - Validates against destination schema
- On transform or validation failure:
  - Write to DLQ with full context
- REST destination:
  - Enforces retries and backoff
  - Supports idempotency
- S3 destination:
  - Supports batching and compression
- Breaking schema changes:
  - Blocked by default
  - Require explicit override with blast-radius view
- All configurations are:
  - Versioned
  - Audited
  - Replayable

---

## 9. Non-Functional Requirements

### Security & Access
- RBAC per environment and per integration
- Secrets stored centrally (no UI exposure)
- Least-privilege access model

### Reliability & SLOs
- Ingest success rate
- p99 end-to-end latency
- Max consumer lag
- DLQ ceiling per integration

### Observability
- Metrics:
  - Consumer lag
  - DLQ rate
  - Transform errors
  - Destination failures
- Traces per message (correlation ID)
- Structured logs

### Performance & UX
- Near-real-time lag & DLQ visibility
- Config changes applied within seconds
- Clear deployment and runtime status feedback

---

## 10. Demo Expectations (Explicit)

The demo must show:
- Creating an integration without writing code
- Schema-driven validation and transformation
- A failing message going to DLQ
- Replay after fixing mapping or schema
- End-to-end traceability

---
