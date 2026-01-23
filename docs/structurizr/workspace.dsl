workspace "Event-Based Application Integration Platform" "Kafka-backed streaming platform with replay, serving, and observability." {

    !identifiers hierarchical

    model {
        integrationOperator = person "Integration Operator" "Onboards integrations, monitors runs, triggers replays."
        integrationEngineer = person "Integration Engineer" "Defines sources/destinations, schemas, and mappings."
        oncallSre = person "On-Call SRE" "Handles incidents, replays, and platform reliability."

        sourceSystem = softwareSystem "Source System" "Event/API producer (POS/ERP/partner API)." {
            tags "External"
        }
        destinationSystem = softwareSystem "Destination System" "Event/API consumer (ERP/partner API/data sync)." {
            tags "External"
        }
        identityProvider = softwareSystem "Identity Provider" "SSO and RBAC enforcement." {
            tags "External"
        }
        alerting = softwareSystem "Alerting Channels" "Slack/Email/PagerDuty for incidents." {
            tags "External"
        }

        platform = softwareSystem "Event-Based Application Integration Platform" "Runs Kafka-backed integrations with replayable pipelines, data serving, and transparent transformations." {

            !docs "../../services"
            !adrs "../../decisions"

            ui = container "UI" "React" "Tenant onboarding, integration configuration, mapping editor, run history."
            controlApi = container "Control API" "Node.js" "Integration CRUD, schema registry, data access, secrets brokering, run visibility." {
                schemaRegistry = component "Schema Registry" "Stores ingress/egress schemas; enforces compatibility (JSON Schema; Avro later)."
                integrationDefinition = component "Integration Definition" "Configures sources, destinations, mappings, and connector configs."
                runTracker = component "Run Tracker & Replay API" "Records runs, exposes replay/backfill controls with rate limits."
                secretsBroker = component "Secrets Broker" "Broker for scoped secrets and rotation status."
            }
            connectCluster = container "Kafka Connect" "Kafka Connect" "Self-hosted Connect runtime for HTTP, S3, and file/mock connectors; stateless workers." {
                httpSource = component "HTTP Source Connector" "Source" "Polling/webhook ingestion."
                httpSink = component "HTTP Sink Connector" "Sink" "REST-based API delivery."
                s3Sink = component "S3 Sink Connector" "Sink" "Archive/analytics delivery."
                fileMockSource = component "File/Mock Source Connector" "Source" "Local testing and demos."
            }
            ksqlDb = container "ksqlDB" "ksqlDB" "SQL-based transformation layer with versioned, config-driven definitions."
            messageBus = container "Kafka Cluster" "Apache Kafka (demo: single broker in Docker; prod: dedicated/managed cluster)" "Backbone for ingest, retention, replay, and serving; DLQs via dedicated topics."
            observability = container "Observability Stack" "Metrics/Logs/Traces" "Dashboards for success, throughput, MTTR, and replay time."
            developerSdks = container "Developer SDKs" "Node.js + Python libraries" "Typed producers/consumers and control/data API clients for integrations."

            // Relationships (inside system for clarity)
            ui -> controlApi "Configures integrations; views runs"
            controlApi -> observability "Emits audit + metrics"

            
            controlApi.runTracker -> observability "Emits run metrics"

            connectCluster.httpSource -> sourceSystem "Reads events/APIs/webhooks"
            connectCluster.httpSource -> messageBus "Writes raw ingestion topics"
            connectCluster.fileMockSource -> messageBus "Writes test ingestion topics"
            connectCluster.httpSink -> destinationSystem "Delivers payloads"
            connectCluster -> controlApi.schemaRegistry "Reads validation rules"
            connectCluster -> observability "Emits connector metrics/errors"

            ksqlDb -> messageBus "Reads raw topics and writes enriched topics"
            ksqlDb -> observability "Emits query metrics"

            ksqlDb -> controlApi.schemaRegistry "Reads validation rules"

            messageBus -> observability "Lag/DLQ metrics"
            developerSdks -> messageBus "Produces/consumes events (Kafka)"
            developerSdks -> controlApi "Configures streams, schemas, and data access"

            observability -> alerting "Sends alerts"

            ui -> identityProvider "SSO and RBAC"
            controlApi -> identityProvider "AuthN/AuthZ"
        }

        // External relationships
        sourceSystem -> platform.connectCluster.httpSource "Sends events or polled APIs/webhooks"
        platform.connectCluster.httpSink -> destinationSystem "Delivers events/APIs"
        platform.ksqlDb -> platform.messageBus "Produces enriched topics"
        integrationOperator -> platform.ui "Configures integrations"
        integrationEngineer -> platform.ui "Defines schemas/mappings"
        oncallSre -> platform.observability "Monitors and replays"
    }

    views {
        systemContext platform "platform-context" {
            include *
            autoLayout
        }

        container platform "platform-containers" {
            include *
            autoLayout
        }

        component platform.controlApi "control-api-components" {
            include *
            autoLayout
        }

        theme "default"

        styles {
            element "Person" {
                background "#0B3C5D"
                color "#ffffff"
                shape person
            }
            element "Software System" {
                background "#1D65A6"
                color "#ffffff"
            }
            element "Container" {
                background "#4A90E2"
                color "#ffffff"
            }
            element "Database" {
                shape cylinder
            }
            element "External" {
                background "#999999"
                color "#ffffff"
                border dashed
            }
        }
    }
}
