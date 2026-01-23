import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from './index';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as kafka from './kafka';

test('health check', async () => {
  const app = createApp();
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('workspace CRUD basic happy path', async () => {
  const mem = await MongoMemoryServer.create();
  process.env.MONGO_URI = mem.getUri().replace(/\/+$/, '');
  process.env.MONGO_DB = 'testdb';

  const app = createApp();

  const createRes = await request(app).post('/api/workspaces').send({ id: 'ws1', name: 'Acme' });
  assert.equal(createRes.status, 201);

  const listRes = await request(app).get('/api/workspaces');
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.items.length, 1);

  await mongoose.disconnect();
  await mem.stop();
});

test('topic create/list/metrics', async () => {
  const createTopicSpy = test.mock.method(kafka, 'createTopic', async () => {});
  const listTopicsSpy = test.mock.method(kafka, 'listTopics', async () => ['a', 'b']);
  const fetchTopicOffsetsSpy = test.mock.method(kafka, 'fetchTopicOffsets', async () => [
    { topic: 'a', partition: 0, startOffset: '0', endOffset: '10', offsetLag: '10' }
  ]);

  const app = createApp();

  const createRes = await request(app).post('/api/topics').send({ name: 'a', partitions: 1, replication: 1 });
  assert.equal(createRes.status, 201);
  assert.deepEqual(createRes.body, { name: 'a', partitions: 1, replication: 1 });
  assert.equal(createTopicSpy.mock.callCount(), 1);

  const listRes = await request(app).get('/api/topics');
  assert.equal(listRes.status, 200);
  assert.deepEqual(listRes.body, { items: ['a', 'b'] });
  assert.equal(listTopicsSpy.mock.callCount(), 1);

  const metricsRes = await request(app).get('/api/topics/a/metrics');
  assert.equal(metricsRes.status, 200);
  assert.deepEqual(metricsRes.body, { topic: 'a', partitions: [
    { topic: 'a', partition: 0, startOffset: '0', endOffset: '10', offsetLag: '10' }
  ] });
  assert.equal(fetchTopicOffsetsSpy.mock.callCount(), 1);
});

test('jsonata transform create/list', async () => {
  const mem = await MongoMemoryServer.create();
  process.env.MONGO_URI = mem.getUri().replace(/\/+$/, '');
  process.env.MONGO_DB = 'testdb-jsonata';

  const app = createApp();

  const createRes = await request(app)
    .post('/api/workspaces/ws-jsonata/jsonata-transforms')
    .send({
      id: 'jt-1',
      name: 'orders to enriched',
      expression: '$merge([$, {status: \"processed\"}])',
      sourceTopic: 'dev.ws.orders.raw',
      targetTopic: 'dev.ws.orders.enriched',
      version: 1,
      status: 'draft'
    });

  assert.equal(createRes.status, 201);
  assert.equal(createRes.body._id, 'jt-1');

  const listRes = await request(app).get('/api/workspaces/ws-jsonata/jsonata-transforms');
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.items.length, 1);
  assert.equal(listRes.body.items[0].name, 'orders to enriched');

  await mongoose.disconnect();
  await mem.stop();
});

test('jsonata transform update', async () => {
  const mem = await MongoMemoryServer.create();
  process.env.MONGO_URI = mem.getUri().replace(/\/+$/, '');
  process.env.MONGO_DB = 'testdb-jsonata-update';

  const app = createApp();

  const createRes = await request(app)
    .post('/api/workspaces/ws-jsonata/jsonata-transforms')
    .send({
      id: 'jt-2',
      name: 'orders to enriched',
      expression: '$merge([$, {status: \"processed\"}])',
      sourceTopic: 'dev.ws.orders.raw',
      targetTopic: 'dev.ws.orders.enriched',
      version: 1,
      status: 'draft'
    });
  assert.equal(createRes.status, 201);

  const updateRes = await request(app)
    .put('/api/workspaces/ws-jsonata/jsonata-transforms/jt-2')
    .send({ status: 'active', version: 2, description: 'v2' });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.status, 'active');
  assert.equal(updateRes.body.version, 2);
  assert.equal(updateRes.body.description, 'v2');

  await mongoose.disconnect();
  await mem.stop();
});
