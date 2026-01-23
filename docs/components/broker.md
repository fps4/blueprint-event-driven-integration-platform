# Broker (Kafka) Service

Companion to the topic expectations in [requirements-ux.md](../requirements-ux.md) and high-level architecture in [solution-design.md](../solution-design.md).

Kafka cluster operated by the platform team; all topics and ACLs are created via the control plane, never ad-hoc.

## Scope & Responsibilities
- Run Kafka brokers with replication, retention, and compaction policies defined per domain.
- Enforce platform topic conventions and ACLs for workspaces/clients.
- Expose metrics for broker health, topic storage, partition skew, and consumer lag.
- Provide DLQ/retry topics per integration with clear ownership.

## Topic Naming Standard
- Characters: alphanumerics plus `._-`; max length 249; no `.` or `..` path segments (matches `validateTopicName` from `@event-streaming-platform/connector-core`).
- Pattern (env-scoped, multi-tenant):
  ```
  <env>.<workspace>.<stream>.<variant>
  ```
  - `env`: dev|test|prod
  - `workspace`: normalized workspace slug/ID (lowercase, `-` or `_`)
  - `stream`: business domain/entity (e.g., `orders`, `payments`)
  - `variant`: `raw` (ingest), `enriched` (post-transform), `dlq`, `retry`
- Client scoping: when clients own subsets, append client identifier before variant, e.g.:
  ```
  <env>.<workspace>.client-<clientId>.<stream>.<variant>
  ```
- Examples:
  - `dev.ws-acme.orders.raw`
  - `prod.ws-acme.client-billing.payments.enriched`
  - `prod.ws-acme.orders.dlq`

## Best Practices
- **Partitioning**: size partitions to keep consumer lag within SLO; avoid over-partitioning small streams.
- **Retention**: set per-topic retention (raw shorter, DLQ longer for replay); compaction only where idempotent keys exist.
- **DLQ/Retry**: always provision `dlq` (and optional `retry`) topics alongside source/transformed topics.
- **ACLs**: producers limited to their workspace/client topics; consumers restricted to needed streams; block wildcard access.
- **Schema binding**: all produce/consume paths must register schemas in Schema Registry; enforce compatibility (`BACKWARD`/`FULL`).
- **Observability**: export metrics for partition sizes, ISR health, controller status, and consumer lag; alert on lag, DLQ rate, offline partitions.
- **Change management**: topic creation/update only via Control API; audit who/when/what for compliance.

## Manual Topic Read (docker exec)
- Get a shell into the broker container: `docker exec -it <broker-container-name> bash`.
- The Apache image ships CLI tools under `/opt/kafka/bin`; either prefix commands with that path or add it to `PATH`.
- Optionally list topics inside the container to confirm naming: `/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list`.
- Read from a topic without reusing application consumer groups (avoids stealing offsets):

  ```bash
  /opt/kafka/bin/kafka-console-consumer.sh \
    --bootstrap-server localhost:9092 \
    --topic dev.ws-acme.orders.raw \
    --from-beginning \
    --group tmp-inspect-$(date +%s) \
    --property print.key=true \
    --property print.timestamp=true \
    --timeout-ms 10000
  ```

- For a quick peek at only the newest records, drop `--from-beginning` and `--timeout-ms`.
