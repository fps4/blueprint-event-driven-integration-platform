# UI & Control Surface

How operators and integration engineers interact with the platform via the UI and Control API. Companion to the user flows in [requirements-ux.md](../requirements-ux.md) and the API surface in [control-api.md](./control-api.md).

## Responsibilities
- Present the platform control plane; no direct data-path ingestion or delivery.
- Enforce RBAC per environment; audit all mutations (who/when/what).
- Backed by Kafka, Schema Registry, Kafka Connect, and ksqlDB metadata.
- Drives the wizard steps described in `requirements-ux.md` (source → topics → transform → destinations → observability → access).

## Capabilities (UI-facing)
- Integrations lifecycle: create/update/publish/pause/resume; environment promotion with version pinning.
- Topics & broker config: display retention/partitioning/compaction per naming convention; read-only guardrails.
- Schema catalog: browse, diff, tag (PII), view impact; pin versions to integrations.
- Mappings / ksqlDB: select and preview SQL; validate against source/destination schemas; version pinning.
- Destinations: REST/S3 configuration with retries/backoff (default from connector-core), timeouts, idempotency hints, headers.
- Replay & DLQ: select window or IDs, dry-run validation, rate limiting, target schema/mapping versions, audit trail.
- Observability: integration status (active/paused/failed), per-message trace (ingest → transform → delivery/DLQ), alerts.
- Docs aggregation: shared Swagger/Redoc portal for platform services.

## Related Services
- **Control API** (`control-api.md`): primary backend for UI flows.
- **Authorizer** (`authorizer.md`): issues tokens for UI/control usage.
- **Connectors** (`connectors.md`): connector lifecycle surfaced in UI.
