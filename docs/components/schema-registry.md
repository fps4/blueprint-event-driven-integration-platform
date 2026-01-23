# Schema Registry Integration

How to use the bundled Confluent Schema Registry (`schema-registry:8081`) with control-api, connector-http-source/sink, and Kafka Connect as wired in `compose.yaml`.

## Topology
- Registry host: `http://schema-registry:8081` (internal Docker network).
- Broker: `broker:9092`.
- Kafka Connect: `kafka-connect:8083` (Confluent image).

## Kafka Connect settings
Switch Connect to Schema Registry-aware converters (override defaults in `compose.yaml` or per-connector config):
- `CONNECT_KEY_CONVERTER=io.confluent.connect.avro.AvroConverter`
- `CONNECT_VALUE_CONVERTER=io.confluent.connect.avro.AvroConverter`
- `CONNECT_KEY_CONVERTER_SCHEMA_REGISTRY_URL=http://schema-registry:8081`
- `CONNECT_VALUE_CONVERTER_SCHEMA_REGISTRY_URL=http://schema-registry:8081`

If using JSON Schema or Protobuf, swap the converter classes accordingly.

Ensure the Confluent Hub plugins you need are installed in the Connect image (uncomment `confluent-hub install` lines in `services/kafka-connect/Dockerfile` and rebuild).

## HTTP Source via Kafka Connect
Example connector config posting to Connect:
```bash
curl -X POST http://localhost:8083/connectors -H "Content-Type: application/json" -d '{
  "name": "http-source-avro",
  "config": {
    "connector.class": "io.confluent.connect.http.HttpSourceConnector",
    "tasks.max": "1",
    "http.api.url": "http://connector-http-source:8085/ingest/my-topic",
    "kafka.topic": "my-topic",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter.schema.registry.url": "http://schema-registry:8081",
    "key.converter": "io.confluent.connect.avro.AvroConverter",
    "key.converter.schema.registry.url": "http://schema-registry:8081"
  }
}'
```

## HTTP Sink via Kafka Connect
Example connector config:
```bash
curl -X POST http://localhost:8083/connectors -H "Content-Type: application/json" -d '{
  "name": "http-sink-avro",
  "config": {
    "connector.class": "io.confluent.connect.http.HttpSinkConnector",
    "tasks.max": "1",
    "topics": "my-topic",
    "http.api.url": "http://your-downstream-service/endpoint",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter.schema.registry.url": "http://schema-registry:8081",
    "key.converter": "io.confluent.connect.avro.AvroConverter",
    "key.converter.schema.registry.url": "http://schema-registry:8081"
  }
}'
```

## Using the custom Node services directly
- `connector-http-source` (Node) currently validates and logs only; to publish with schemas, add a Kafka producer that serializes via Schema Registry (e.g., `@kafkajs/confluent-schema-registry`) pointing at `schema-registry:8081`.
- `connector-http-sink` (Node) should consume with a Schema Registry-aware consumer to deserialize Avro/JSON Schema/Protobuf payloads (same client).

## control-api
- Today only manages topics via KafkaJS Admin; no Schema Registry usage required. If adding producers/consumers later, reuse the same Schema Registry client and converters and target `schema-registry:8081`.
