ARG CP_VERSION=7.7.7
FROM confluentinc/cp-kafka-connect:${CP_VERSION}

ENV CONNECT_PLUGIN_PATH: "/usr/share/java,/usr/share/confluent-hub-components"

ARG CONNECT_HTTP_SOURCE_VERSION=1.0.1
ARG CONNECT_HTTP_VERSION=1.7.11
ARG CONNECT_TRANSFORMS_VERSION=1.4.3

# Confluent Hub plugins for Kafka Connect
# https://www.confluent.io/hub/plugins?connector_category=data_transformation_smts&license=free

# RUN confluent-hub install --no-prompt confluentinc/kafka-connect-http-source:${CONNECT_HTTP_SOURCE_VERSION}
# RUN confluent-hub install --no-prompt confluentinc/kafka-connect-http:${CONNECT_HTTP_VERSION}
# RUN confluent-hub install --no-prompt confluentinc/connect-transforms:${CONNECT_TRANSFORMS_VERSION}
