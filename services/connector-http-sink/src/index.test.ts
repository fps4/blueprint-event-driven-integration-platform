import assert from "node:assert/strict";
import test from "node:test";
import { loadConfigForTest } from "./test-helpers.js";

test("loadConfigForTest validates topics and brokers", () => {
  const cfg = loadConfigForTest({
    HTTP_SINK_TOPICS: "topic1, topic2",
    KAFKA_BROKERS: "broker:9092"
  });
  assert.deepEqual(cfg.topics, ["topic1", "topic2"]);
  assert.equal(cfg.brokers[0], "broker:9092");
});

test("loadConfigForTest throws without topics", () => {
  assert.throws(() => loadConfigForTest({ HTTP_SINK_TOPICS: "", KAFKA_BROKERS: "broker:9092" }));
});

test("loadConfigForTest throws without brokers", () => {
  assert.throws(() => loadConfigForTest({ HTTP_SINK_TOPICS: "topic1", KAFKA_BROKERS: "" }));
});
