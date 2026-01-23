# Event Streaming Platform — Solution Design

Companion to [requirements-ux.md](./requirements-ux.md). Component deep-dives live under `solution-design/`.

## 1. Goals & Principles

### 1.1 Primary Goals

* Build an **in-house event-based integration platform**
* Enable **product teams to own mappings & transformations**
* Centralize **runtime, governance, observability, and operations**
* Avoid tight coupling to any cloud vendor or SaaS

### 1.2 Design Principles

* **Configuration over code** (especially for product teams)
* **Clear separation of responsibilities**
* **Kafka-native first**
* **Fail-fast & observable**
* **Composable architecture**

---

## 2. High-Level Architecture

Authoritative diagram: `architecture/structurizr/workspace.dsl`.

- Decisions: `decisions/adr-xxx-<name>.md`
- Requirements: `requirements-ux.md`
- Components: see `solution-design/*.md`

### 2.1 Kafka Platform Layer

* **Apache Kafka (self-hosted)**
* Deployed via **Docker Compose (local)** and **Kubernetes (prod)**
* Topics:

  * Raw ingestion topics
  * Enriched topics
  * Dead-letter topics (DLQ)
* Naming convention enforced by platform

### 2.2 Schema Management

* **Confluent Schema Registry (self-hosted)**
* Supports:

  * JSON Schema (initial)
  * Avro (future)
* Compatibility mode:

  * `BACKWARD` or `FULL` (per domain)

---

### 2.3 Ingestion & Delivery (Connectors)

* Connector runtime is **Confluent Kafka Connect**, configured via REST (`/connector-plugins`, `/connectors`, `/connectors/<name>/config`, pause/resume/delete). Confluent Hub plugins (PagerDuty, Elastic, etc.) are supported.
* Repo ships HTTP connectors built on `packages/connector-core` which provides shared request/response types, `validateTopicName`, telemetry hooks, and `defaultRetryPolicy` (3 attempts, exponential backoff up to 2s on 408/429/5xx).
* `services/connector-http-source`: Express ingress `POST /ingest/:topic`, requires `Content-Type: application/json`, non-empty JSON object/array, validates topic names, propagates/generates `x-request-id`, returns `202` on accept with centralized 404/500 handling. Only performs lightweight checks; full schema validation happens in the worker/transform runtime before emitting `enriched` or DLQ messages.

Supported Connectors (Initial)

| Connector                          | Type   | Notes                                                                                   |
| ---------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| HTTP Source (`connector-http-source`) | Source | Webhook-style ingest at `/ingest/:topic`; topic path validated via `validateTopicName`. |
| HTTP Sink (Kafka Connect plugin)   | Sink   | REST delivery using shared retry defaults; configured through Kafka Connect REST.       |

Transformation config: Control API persists versioned Jsonata mappings (by workspace, source/target topic, optional schema IDs) that the `worker-jsonata` runtime consumes; mappings are published as `draft|active|deprecated` for rollout/rollback.

See component chapters:
- [Connectors](./solution-design/connectors.md)
- [Worker / Transform Runtime](./components/workers.md)
- [Broker](./components/broker.md)
- [Control API](./components/control-api.md)
- [UI](./components/ui.md)
