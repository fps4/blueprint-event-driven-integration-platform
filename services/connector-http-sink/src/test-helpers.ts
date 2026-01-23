import { InvalidTopicNameError, validateTopicName } from "@event-streaming-platform/connector-core";

export type EnvLike = NodeJS.ProcessEnv & {
  HTTP_SINK_TOPICS?: string;
  KAFKA_BROKERS?: string;
  KAFKA_CLIENT_ID?: string;
  KAFKA_GROUP_ID?: string;
};

export type SinkConfig = {
  topics: string[];
  groupId: string;
  clientId: string;
  brokers: string[];
};

export function loadConfigForTest(env: EnvLike): SinkConfig {
  const rawTopics = env.HTTP_SINK_TOPICS ?? "";
  const topics = rawTopics
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => validateTopicName(t));

  if (!topics.length) {
    throw new InvalidTopicNameError("HTTP_SINK_TOPICS is required (comma-separated)");
  }

  const brokers = (env.KAFKA_BROKERS ?? "")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  if (!brokers.length) {
    throw new Error("KAFKA_BROKERS is required (comma-separated)");
  }

  const clientId = env.KAFKA_CLIENT_ID?.trim() || "connector-http-sink";
  const groupId = env.KAFKA_GROUP_ID?.trim() || "connector-http-sink";

  return { topics, groupId, clientId, brokers };
}
