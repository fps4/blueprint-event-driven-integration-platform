# Logging

- Structured logs with correlation IDs and tenant/integration tags.
- Mask PII at the source; enforce redaction filters in pipelines.
- Key events: ingestion, validation result, transformation result, publish attempt, retries, DLQ enqueue, replay/backfill actions.
- Ship to central log store with retention per compliance needs; enable search on correlation ID.
