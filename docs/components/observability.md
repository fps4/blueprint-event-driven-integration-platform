# Observability

This document describes the observability architecture for the Event Streaming Platform, covering logging, monitoring, and alerting for both end-users and platform operators.

## 1. Design Philosophy

### 1.1 Separation of Concerns

The platform uses a **two-tier observability model**:

- **End-User Tier (Product Teams)**: Simplified monitoring and alerting integrated into the **Control API + WebApp**
  - Integration-level metrics (lag, DLQ counts, success rates)
  - Message-level tracing (correlation ID → full trace)
  - Self-service alerting configuration
  - Business-focused dashboards
  
- **Platform Tier (Ops Team)**: Deep system-level observability using **Grafana + Loki + Prometheus**
  - Raw service logs with full context
  - Infrastructure metrics (CPU, memory, Kafka internals)
  - Cross-service debugging and troubleshooting
  - Incident response and root-cause analysis

**Rationale**: End-users need curated, integration-centric views without needing to understand Kafka internals or service logs. Platform operators need unrestricted access to all system data for debugging and operations.

---

## 2. Platform Tier: Ops Observability Stack

### 2.1 Log Aggregation (Loki + Promtail)

**Stack Components**:

- **Loki**: Horizontally-scalable log aggregation system (Grafana-native)
- **Promtail**: Log collection agent (scrapes Docker container logs)
- **Grafana**: Visualization and query interface

**Deployment** (via `compose.yaml`):

```yaml
loki:
  image: grafana/loki:latest
  container_name: loki
  ports:
    - "3100:3100"
  command: -config.file=/etc/loki/local-config.yaml
  networks:
    - event-streaming-platform
  volumes:
    - loki_data:/loki

promtail:
  image: grafana/promtail:latest
  container_name: promtail
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - ./docker/promtail-config.yaml:/etc/promtail/config.yml
  command: -config.file=/etc/promtail/config.yml
  networks:
    - event-streaming-platform
  depends_on:
    - loki

grafana:
  image: grafana/grafana:latest
  container_name: grafana
  ports:
    - "3000:3000"
  environment:
    GF_SECURITY_ADMIN_USER: ${GRAFANA_ADMIN_USER:-admin}
    GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-admin}
    GF_INSTALL_PLUGINS: grafana-piechart-panel
  networks:
    - event-streaming-platform
  volumes:
    - grafana_data:/var/lib/grafana
    - ./docker/grafana/provisioning:/etc/grafana/provisioning
  depends_on:
    - loki
```

**Promtail Configuration** (`docker/promtail-config.yaml`):

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'
      - source_labels: ['__meta_docker_container_label_com_docker_compose_service']
        target_label: 'service'
```

### 2.2 Service Logging Standards

All platform services use **Pino** for structured JSON logging with the following conventions:

**Standard Fields**:
- `level`: Pino log level (trace, debug, info, warn, error, fatal)
- `time`: ISO 8601 timestamp
- `msg`: Human-readable message
- `service`: Service name (e.g., `control-api`, `worker-jsonata`)
- `requestId`: Correlation ID (`x-request-id` header, propagated across services)
- `workspaceId`: Workspace context (when applicable)
- `topic`: Kafka topic (when applicable)

**Example Log Entry**:
```json
{
  "level": "info",
  "time": "2026-02-08T15:00:00.000Z",
  "service": "connector-http-source",
  "requestId": "req_abc123",
  "topic": "prod.acme.orders.raw",
  "msg": "Message accepted for topic",
  "statusCode": 202
}
```

**Environment Variable** (`LOG_PRETTY`):
- `LOG_PRETTY=true`: Human-readable output (development)
- `LOG_PRETTY=false`: JSON structured logs (production, parsed by Promtail)

### 2.3 Key Ops Queries (LogQL Examples)

**Trace request across all services**:
```logql
{service=~".+"} |= "req_abc123"
```

**DLQ errors from worker-jsonata**:
```logql
{service="worker-jsonata"} | json | reason="dlq" | line_format "{{.msg}}: {{.error}}"
```

**Control API errors in last hour**:
```logql
{service="control-api"} | json | level="error" | __timestamp__ > 1h
```

**HTTP 5xx responses from connector-http-source**:
```logql
{service="connector-http-source"} | json | statusCode >= 500
```

### 2.4 Metrics Collection (Future: Prometheus)

**Roadmap**: Add Prometheus + exporters for:
- Kafka broker metrics (JMX exporter)
- Consumer lag (kafka-lag-exporter)
- Node.js service metrics (prom-client in each service)
- MongoDB metrics (mongodb_exporter)

---

## 3. End-User Tier: WebApp Monitoring

### 3.1 Integration-Level Metrics

The **Control API** exposes curated metrics for the WebApp UI, stored and aggregated from:

- **Kafka Admin API** (via KafkaJS): topic lag, partition offsets
- **MongoDB collections**: pipeline run history, DLQ message counts, transform success/failure rates
- **Prometheus queries** (future): service-level metrics when available

**Key Metrics Exposed**:

| Metric                     | Source                | API Endpoint                          |
|----------------------------|-----------------------|---------------------------------------|
| Consumer lag               | Kafka Admin           | `GET /api/pipelines/:id/metrics/lag`  |
| DLQ message count          | Kafka + MongoDB       | `GET /api/pipelines/:id/metrics/dlq`  |
| Transform success rate     | MongoDB (aggregation) | `GET /api/pipelines/:id/metrics/transforms` |
| Destination delivery rate  | MongoDB (aggregation) | `GET /api/pipelines/:id/metrics/delivery` |
| Throughput (msg/s)         | Kafka Admin           | `GET /api/pipelines/:id/metrics/throughput` |

### 3.2 Message-Level Tracing

**Correlation ID (`x-request-id`) Propagation**:

1. **Ingress** (connector-http-source): Accept or generate `x-request-id`
2. **Kafka Headers**: Attach `requestId` as message header
3. **Worker**: Read header, include in logs and DLQ messages
4. **Sink**: Propagate to downstream systems (HTTP header or payload field)

**WebApp Trace View**:

```
GET /api/traces/:requestId
```

Returns full lifecycle:
```json
{
  "requestId": "req_abc123",
  "events": [
    {
      "timestamp": "2026-02-08T15:00:00.000Z",
      "stage": "ingress",
      "service": "connector-http-source",
      "topic": "prod.acme.orders.raw",
      "status": "accepted"
    },
    {
      "timestamp": "2026-02-08T15:00:01.123Z",
      "stage": "transform",
      "service": "worker-jsonata",
      "transformVersion": "v2",
      "status": "success",
      "outputTopic": "prod.acme.orders.enriched"
    },
    {
      "timestamp": "2026-02-08T15:00:02.456Z",
      "stage": "delivery",
      "service": "connector-http-sink",
      "destination": "https://api.example.com/orders",
      "status": "delivered",
      "httpStatus": 201
    }
  ]
}
```

**Implementation Notes**:
- WebApp queries MongoDB for trace events (stored by each service)
- Falls back to Loki queries for ops users (via platform admin panel)

### 3.3 Self-Service Alerting (WebApp)

**Configuration Model** (persisted in MongoDB via Control API):

```typescript
interface AlertRule {
  pipelineId: string;
  workspaceId: string;
  name: string;
  condition: {
    metric: 'consumer_lag' | 'dlq_rate' | 'delivery_failure_rate' | 'transform_error_rate';
    operator: 'gt' | 'lt' | 'eq';
    threshold: number;
    windowMinutes: number; // Evaluation window
  };
  actions: {
    slack?: { webhookUrl: string; channel: string };
    email?: { recipients: string[] };
    pagerduty?: { integrationKey: string };
  };
  enabled: boolean;
  createdBy: string;
  createdAt: Date;
}
```

**WebApp UI Flows**:
- **Create Alert Rule**: Form to select metric, set threshold, configure destinations
- **Alert History**: Timeline of fired alerts with acknowledge/snooze controls
- **Alert Status Dashboard**: Current alert state per pipeline (green/yellow/red)

**Evaluation Engine** (runs in Control API or dedicated alerting service):
- Periodic job (every 1-5 minutes) evaluates all enabled rules
- Queries Kafka Admin + MongoDB for current metric values
- Fires webhooks/emails when threshold breached
- Debounces repeated alerts (e.g., only fire once per 15 minutes per rule)

---

## 4. Operational Playbooks

### 4.1 Debugging a Failed Message (Ops)

1. **User reports**: "Message X failed"
2. **Get correlation ID** from user or WebApp trace view
3. **Query Loki**:
   ```logql
   {service=~".+"} |= "req_abc123"
   ```
4. **Identify failure stage** from logs
5. **Inspect DLQ** (if applicable):
   ```bash
   kafka-console-consumer --bootstrap-server broker:9092 \
     --topic prod.acme.orders.dlq \
     --property print.headers=true | grep req_abc123
   ```
6. **Fix mapping/schema** via Control API
7. **Replay from DLQ** via WebApp UI

### 4.2 Investigating High Lag (Ops)

1. **Check Grafana dashboard**: Identify service/consumer group
2. **Query Loki for errors**:
   ```logql
   {service="worker-jsonata"} | json | level="error" | __timestamp__ > 1h
   ```
3. **Check Kafka consumer group state**:
   ```bash
   kafka-consumer-groups --bootstrap-server broker:9092 \
     --describe --group worker-jsonata
   ```
4. **Scale workers** (increase replicas) or **pause integration** if degraded

### 4.3 Service Health Check (Ops)

**Grafana Dashboard Panels**:
- Service uptime (container status)
- Log error rate by service
- Kafka topic lag (all consumer groups)
- MongoDB connection pool stats
- HTTP 5xx rate per service

---

## 5. Implementation Roadmap

### Phase 1: Platform Tier (Ops) ✅
- [x] Pino structured logging in all services
- [x] `x-request-id` propagation in connector-http-source
- [ ] Deploy Loki + Promtail + Grafana
- [ ] Create Grafana dashboards for common queries
- [ ] Document LogQL query library

### Phase 2: End-User Tier (WebApp)
- [ ] Control API: Metrics endpoints (lag, DLQ, throughput)
- [ ] Control API: Trace endpoint (`GET /api/traces/:requestId`)
- [ ] MongoDB: Trace event collection (written by all services)
- [ ] WebApp UI: Integration metrics dashboard
- [ ] WebApp UI: Message trace view

### Phase 3: Alerting
- [ ] Control API: Alert rule CRUD endpoints
- [ ] Control API: Alert evaluation engine (scheduled job)
- [ ] Integrations: Slack webhook, email (Nodemailer), PagerDuty
- [ ] WebApp UI: Alert rule management
- [ ] WebApp UI: Alert history and status

### Phase 4: Advanced (Future)
- [ ] Prometheus + exporters for infrastructure metrics
- [ ] Anomaly detection (ML-based thresholds)
- [ ] SLO/error budget tracking per pipeline
- [ ] ClickHouse for long-term metric storage and fast queries

---

## 6. Configuration Reference

### 6.1 Environment Variables

**All Services**:
- `LOG_PRETTY`: `true` (dev) | `false` (prod) — Pino output format
- `LOG_LEVEL`: `trace|debug|info|warn|error|fatal` — Minimum log level

**Grafana**:
- `GRAFANA_ADMIN_USER`: Admin username (default: `admin`)
- `GRAFANA_ADMIN_PASSWORD`: Admin password (default: `admin`, change in prod)

**Control API** (future alerting config):
- `ALERT_EVALUATION_INTERVAL_MS`: How often to check alert rules (default: `60000`)
- `ALERT_SLACK_ENABLED`: `true|false`
- `ALERT_EMAIL_SMTP_HOST`: SMTP server for email alerts
- `ALERT_PAGERDUTY_ENABLED`: `true|false`

### 6.2 Access Control

**Grafana Access** (Platform Team Only):
- Exposed on `http://localhost:3000` (dev) or internal network (prod)
- RBAC: Admin role required for query/dashboard editing
- Anonymous viewer access disabled in production

**WebApp Metrics** (End-Users):
- Scoped to workspace via JWT claims
- Users can only view metrics for pipelines in their workspace
- RBAC: `workspace:read` scope required

---

## 7. Best Practices

### 7.1 Logging Guidelines

**DO**:
- Always include `requestId` when available
- Log at appropriate levels (info for normal flow, warn for retries, error for failures)
- Include structured context (topic, workspaceId, pipelineId) as separate fields, not in message strings
- Use `msg` for human-readable summary, structured fields for machine parsing

**DON'T**:
- Log sensitive data (PII, credentials, full payloads unless explicitly debug mode)
- Log excessively in hot paths (> 1000 msg/s = use sampling)
- Concatenate context into message strings (breaks Loki queries)

### 7.2 Correlation ID Propagation

- HTTP services: Read from `x-request-id` header, generate if missing (nanoid/uuid)
- Kafka messages: Store in `requestId` header (string)
- MongoDB writes: Include `requestId` field in trace event docs
- Downstream HTTP calls: Forward `x-request-id` header

### 7.3 Metric Naming

**End-User Metrics** (WebApp):
- Use business terms: "Messages Delivered", "Failed Transformations"
- Aggregate to pipeline level (hide Kafka internals)

**Platform Metrics** (Grafana):
- Use technical terms: "Consumer Lag (Partitions 0-2)", "Broker Disk Usage"
- Expose raw Kafka/service data

---

## 8. References

- **Grafana Loki**: https://grafana.com/oss/loki/
- **LogQL Query Language**: https://grafana.com/docs/loki/latest/logql/
- **Pino Logger**: https://getpino.io/
- **Kafka Monitoring**: https://kafka.apache.org/documentation/#monitoring
- **Platform Requirements**: [requirements-ux.md](../requirements-ux.md) (§7, §9)
- **Solution Design**: [solution-design.md](../solution-design.md)
