import { randomUUID } from 'node:crypto';
import jsonata from 'jsonata';
import { type Producer, type EachMessagePayload } from 'kafkajs';
import { logger } from './config.js';
import { type TransformRuntime } from './transforms.js';

export async function handleMessage(
  producer: Producer,
  transform: TransformRuntime,
  payload: EachMessagePayload,
  dlqTopic?: string
): Promise<'ok' | 'dlq'> {
  const { topic, partition, message } = payload;
  const requestId = (message.headers?.['x-request-id']?.toString() || randomUUID()).trim();
  const key = message.key?.toString() || requestId;
  const valueString = message.value?.toString() ?? '';

  try {
    const parsed = valueString ? JSON.parse(valueString) : null;
    const result = await transform.compiled.evaluate(parsed);

    await producer.send({
      topic: transform.targetTopic,
      messages: [
        {
          key,
          value: JSON.stringify(result),
          headers: {
            ...(message.headers || {}),
            'x-request-id': requestId
          }
        }
      ]
    });

    logger.info(
      {
        requestId,
        sourceTopic: topic,
        targetTopic: transform.targetTopic,
        partition,
        offset: message.offset,
        transformId: transform.id,
        version: transform.version,
        key
      },
      'transformed message'
    );
    return 'ok';
  } catch (err) {
    const dlq = dlqTopic || `${topic}.dlq`;
    logger.error(
      {
        err,
        requestId,
        sourceTopic: topic,
        targetTopic: transform.targetTopic,
        partition,
        offset: message.offset,
        transformId: transform.id,
        dlqTopic: dlq,
        key
      },
      'transform failed; writing to DLQ'
    );

    const errorPayload = {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      sourceTopic: topic,
      targetTopic: transform.targetTopic,
      partition,
      offset: message.offset,
      transformId: transform.id,
      version: transform.version,
      value: valueString
    };

    await producer.send({
      topic: dlq,
      messages: [
        {
          key,
          value: JSON.stringify(errorPayload),
          headers: {
            ...(message.headers || {}),
            'x-request-id': requestId,
            'x-dlq-reason': 'jsonata-transform-failed'
          }
        }
      ]
    });
    return 'dlq';
  }
}
