# UI & Control Surface

How operators and integration engineers interact with the platform via the UI and Control API. Companion to the user flows in [requirements-ux.md](../requirements-ux.md) and the API surface in [control-api.md](./control-api.md).

## Responsibilities
- Present the platform control plane for end-user flows; no direct data-path ingestion or delivery.
- Enforce RBAC per environment; audit all mutations (who/when/what); relies on **Authorizer** for tokens.
- Backed by Kafka, Schema Registry, Kafka Connect, Custom Connectors, and ksqlDB metadata via **Control API**.
- Drives the wizard steps described in `requirements-ux.md` (source → topics → transform → destinations → observability → access).

## End User Goals (surfaced in UI)
- Access & Authentication: sign in, register/manage access.
- Pipeline & Workspace Management: create workspaces; create pipelines with source/sink configuration and transformation logic; start/stop pipelines.
- Observability & Operations: view dashboards with key pipeline statistics; view run logs/traces; monitor Kafka metrics; receive alerts/notifications on source/sink connector failures.
- Metadata & Governance: browse/search schema catalog, diff schemas (PII, impact), pin schema versions to integrations.
- Documentation: view user documentation inside the UI.

## Capabilities (UI-facing)
- Workspaces: create/edit workspaces with codes and allowed origins; list/filter workspaces.
- Pipelines: create/edit pipelines with streams and source/sink connectors; visualize pipeline flows with React Flow; start/stop pipelines.
- **Pipeline Flow Visualization**: Interactive drag-and-drop canvas with auto-positioned nodes; positions persist to MongoDB; horizontal left-to-right flow (Client → Source Connector → Stream → Transformation → Stream → Sink Connector → Connection).
- **Streams**: Create individual streams with type selection (source, sink, dlq, replay); streams positioned in column layout under "Add Stream" button; color-coded by variant (source=green, sink=blue, dlq=red, replay=orange).
- Clients: create/edit global authenticated clients (source producers); manage allowed scopes/topics; list/filter clients.
- Connections: create/edit external sink destinations (HTTP endpoints, S3 buckets); manage type-specific configurations; list/filter connections.
- Source Connectors: link clients to pipeline source streams with connector type (HTTP, S3); visualize in pipeline flow diagram as Client → Source Connector → Stream (source).
- Sink Connectors: link connections to pipeline sink streams for data delivery; visualize in pipeline flow diagram as Stream (sink) → Sink Connector → Connection.
- **Transformations (Jsonata)**: Configure JSONata expressions for pipeline transforms; select transformation type from dropdown (currently JSONata only); specify source stream, target stream, and optional failure queue (DLQ); visualize as Stream (source) → Transformation → Stream (target) with optional dashed red line to failure queue.
- Topics & broker config: display retention/partitioning/compaction per naming convention; read-only guardrails.
- Observability: integration status (active/paused/failed), per-message trace (ingest → transform → delivery/DLQ), Kafka metrics, alerts/notifications for connector failures.
- Schema catalog: browse, diff, tag (PII), view impact; pin versions to integrations (future).
- Replay & DLQ: select window or IDs, dry-run validation, rate limiting, target schema/mapping versions, audit trail (future).
- Docs aggregation: shared Swagger/Redoc portal for platform services and user docs.

## Pipeline Flow UX
- **Action Buttons**: Fixed row at top (non-draggable) - Add Source Connector, Add Stream, Add Transformation, Add Sink Connector.
- **Column-Based Layout**: Each node type positioned in its own column directly under corresponding action button.
- **Draggable Nodes**: All nodes (except action buttons) can be repositioned; positions saved to backend and persist across sessions.
- **Auto-Positioning**: New nodes use default column positions; existing nodes use saved positions.
- **Edge Visualization**: Animated connections between nodes show data flow; transformation edges prefer sink variant for target streams.
- **Shared Node Styling**: All nodes use consistent dimensions (220x100), border radius, colors defined in `shared-node-styles.js`.

## Related Services
- **Control API** (`control-api.md`): primary backend for UI flows.
- **Authorizer** (`authorizer.md`): issues tokens for UI/control usage.
- **Connectors** (`connectors.md`): connector lifecycle surfaced in UI.
