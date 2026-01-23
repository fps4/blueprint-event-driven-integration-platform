import test from 'node:test';
import assert from 'node:assert/strict';
import jsonata from 'jsonata';
import { handleMessage } from './index.js';
import type { Producer, EachMessagePayload } from 'kafkajs';

function makePayload(value: unknown, headers?: Record<string, string>): EachMessagePayload {
  return {
    topic: 'dev.ws.orders.raw',
    partition: 0,
    message: {
      offset: '1',
      timestamp: Date.now().toString(),
      attributes: 0,
      size: 0,
      key: Buffer.from('key1'),
      value: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)),
      headers: Object.fromEntries(
        Object.entries(headers || {}).map(([k, v]) => [k, Buffer.from(v)])
      )
    }
  } as unknown as EachMessagePayload;
}

test('handleMessage sends transformed payload to target topic', async () => {
  const sent: any[] = [];
  const producer = {
    send: async (payload: any) => {
      sent.push(payload);
      return [];
    },
    sendBatch: async () => []
  } as unknown as Producer;

  const transform = {
    id: 't1',
    sourceTopic: 'dev.ws.orders.raw',
    targetTopic: 'dev.ws.orders.enriched',
    version: 1,
    expression: '$.amount * 2',
    compiled: jsonata('$.amount * 2')
  };

  const result = await handleMessage(producer, transform, makePayload({ amount: 2 }, { 'x-request-id': 'req-1' }));
  assert.equal(result, 'ok');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].topic, 'dev.ws.orders.enriched');
  assert.equal(JSON.parse(sent[0].messages[0].value as string), 4);
  assert.equal((sent[0].messages[0].headers as any)['x-request-id'].toString(), 'req-1');
});

test('handleMessage routes failures to DLQ with context headers', async () => {
  const sent: any[] = [];
  const producer = {
    send: async (payload: any) => {
      sent.push(payload);
      return [];
    },
    sendBatch: async () => []
  } as unknown as Producer;

  const transform = {
    id: 't1',
    sourceTopic: 'dev.ws.orders.raw',
    targetTopic: 'dev.ws.orders.enriched',
    version: 1,
    expression: '$.amount * 2',
    compiled: jsonata('$.amount * 2')
  };

  const result = await handleMessage(producer, transform, makePayload('{not-json'), 'custom.dlq');
  assert.equal(result, 'dlq');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].topic, 'custom.dlq');
  const dlqMsg = sent[0].messages[0];
  assert.equal((dlqMsg.headers as any)['x-dlq-reason'].toString(), 'jsonata-transform-failed');
  const parsed = JSON.parse(dlqMsg.value as string);
  assert.equal(parsed.targetTopic, 'dev.ws.orders.enriched');
});
