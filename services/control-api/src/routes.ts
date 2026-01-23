import express from 'express';
import { makeModels } from '@event-streaming-platform/data-models';
import { getConnection } from './db';
import { componentLogger } from './logger';
import { createTopic, fetchTopicOffsets, listTopics } from './kafka';

const log = componentLogger('routes');

function toId(input: unknown): string {
  return String(input || '').trim();
}

function toNumberOrNull(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function buildRouter() {
  const router = express.Router();

  router.get('/health', (_req, res) => res.json({ status: 'ok' }));

  router.get('/workspaces', async (_req, res) => {
    const conn = await getConnection();
    const { Workspace } = makeModels(conn);
    const items = await Workspace.find({}).lean().exec();
    res.json({ items });
  });

  router.post('/topics', async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const partitions = Number(req.body?.partitions ?? 1);
    const replication = Number(req.body?.replication ?? 1);
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!Number.isInteger(partitions) || partitions < 1) return res.status(400).json({ error: 'partitions must be >=1' });
    if (!Number.isInteger(replication) || replication < 1) return res.status(400).json({ error: 'replication must be >=1' });

    try {
      await createTopic(name, partitions, replication);
      log.info({ name, partitions, replication }, 'topic created');
      res.status(201).json({ name, partitions, replication });
    } catch (err) {
      log.error({ err }, 'failed to create topic');
      res.status(500).json({ error: 'failed to create topic' });
    }
  });

  router.get('/topics', async (_req, res) => {
    try {
      const topics = await listTopics();
      log.info({ count: topics.length }, 'fetched topics');
      res.json({ items: topics });
    } catch (err) {
      log.error({ err }, 'failed to list topics');
      res.status(500).json({ error: 'failed to list topics' });
    }
  });

  router.get('/topics/:name/metrics', async (req, res) => {
    const name = String(req.params.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });
    try {
      const offsets = await fetchTopicOffsets(name);
      log.info({ name, partitions: offsets.length }, 'fetched topic metrics');
      res.json({ topic: name, partitions: offsets });
    } catch (err) {
      log.error({ err }, 'failed to fetch topic metrics');
      res.status(500).json({ error: 'failed to fetch topic metrics' });
    }
  });

  router.post('/workspaces', async (req, res) => {
    const conn = await getConnection();
    const { Workspace } = makeModels(conn);
    const _id = toId(req.body?.id || req.body?._id);
    const name = String(req.body?.name || '').trim();
    if (!_id || !name) return res.status(400).json({ error: 'id and name are required' });
    const created = await Workspace.create({ _id, name, status: 'active', allowedOrigins: req.body?.allowedOrigins || [] });
    log.info({ workspaceId: _id }, 'workspace created');
    res.status(201).json(created);
  });

  router.get('/workspaces/:id/clients', async (req, res) => {
    const conn = await getConnection();
    const { Client } = makeModels(conn);
    const items = await Client.find({ workspaceId: toId(req.params.id) }).lean().exec();
    res.json({ items });
  });

  router.post('/workspaces/:id/clients', async (req, res) => {
    const conn = await getConnection();
    const { Client } = makeModels(conn);
    const _id = toId(req.body?.id || req.body?._id);
    const secretHash = String(req.body?.secretHash || '').trim();
    if (!_id || !secretHash) return res.status(400).json({ error: 'id and secretHash are required' });
    const doc = await Client.create({
      _id,
      workspaceId: toId(req.params.id),
      status: 'active',
      secretHash,
      secretSalt: req.body?.secretSalt ?? null,
      allowedScopes: Array.isArray(req.body?.allowedScopes) ? req.body.allowedScopes : [],
      allowedTopics: Array.isArray(req.body?.allowedTopics) ? req.body.allowedTopics : []
    });
    log.info({ clientId: _id, workspaceId: req.params.id }, 'client created');
    res.status(201).json(doc);
  });

  router.get('/workspaces/:id/users', async (req, res) => {
    const conn = await getConnection();
    const { User } = makeModels(conn);
    const items = await User.find({ workspaceId: toId(req.params.id) }).lean().exec();
    res.json({ items });
  });

  router.post('/workspaces/:id/users', async (req, res) => {
    const conn = await getConnection();
    const { User } = makeModels(conn);
    const _id = toId(req.body?.id || req.body?._id);
    const username = String(req.body?.username || '').trim();
    if (!_id || !username) return res.status(400).json({ error: 'id and username are required' });
    const doc = await User.create({
      _id,
      workspaceId: toId(req.params.id),
      username,
      passwordHash: req.body?.passwordHash ?? null,
      passwordSalt: req.body?.passwordSalt ?? null,
      roles: Array.isArray(req.body?.roles) ? req.body.roles : [],
      status: 'active'
    });
    log.info({ userId: _id, workspaceId: req.params.id }, 'user created');
    res.status(201).json(doc);
  });

  router.get('/workspaces/:id/jsonata-transforms', async (req, res) => {
    const conn = await getConnection();
    const { JsonataTransform } = makeModels(conn);
    const items = await JsonataTransform.find({ workspaceId: toId(req.params.id) }).lean().exec();
    res.json({ items });
  });

  router.post('/workspaces/:id/jsonata-transforms', async (req, res) => {
    const conn = await getConnection();
    const { JsonataTransform } = makeModels(conn);
    const _id = toId(req.body?.id || req.body?._id);
    const name = String(req.body?.name || '').trim();
    const expression = String(req.body?.expression || '').trim();
    const sourceTopic = String(req.body?.sourceTopic || '').trim();
    const targetTopic = String(req.body?.targetTopic || '').trim();
    const version = Number(req.body?.version ?? 1);
    const status = (req.body?.status || 'draft') as unknown;

    if (!_id || !name || !expression || !sourceTopic || !targetTopic) {
      return res.status(400).json({ error: 'id, name, expression, sourceTopic, and targetTopic are required' });
    }

    if (!Number.isInteger(version) || version < 1) {
      return res.status(400).json({ error: 'version must be >=1' });
    }

    if (status !== 'draft' && status !== 'active' && status !== 'deprecated') {
      return res.status(400).json({ error: 'status must be draft|active|deprecated' });
    }

    const doc = await JsonataTransform.create({
      _id,
      workspaceId: toId(req.params.id),
      name,
      expression,
      sourceTopic,
      targetTopic,
      version,
      status,
      description: req.body?.description || undefined,
      sourceSchemaId: toNumberOrNull(req.body?.sourceSchemaId) ?? undefined,
      targetSchemaId: toNumberOrNull(req.body?.targetSchemaId) ?? undefined,
      createdBy: req.body?.createdBy || undefined,
      updatedBy: req.body?.updatedBy || undefined
    });

    log.info({ jsonataTransformId: _id, workspaceId: req.params.id }, 'jsonata transform created');
    res.status(201).json(doc);
  });

  router.put('/workspaces/:id/jsonata-transforms/:transformId', async (req, res) => {
    const conn = await getConnection();
    const { JsonataTransform } = makeModels(conn);
    const _id = toId(req.params.transformId);
    if (!_id) return res.status(400).json({ error: 'transformId is required' });

    const updates: Record<string, unknown> = {};

    if (req.body?.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ error: 'name cannot be empty' });
      updates.name = name;
    }

    if (req.body?.expression !== undefined) {
      const expression = String(req.body.expression || '').trim();
      if (!expression) return res.status(400).json({ error: 'expression cannot be empty' });
      updates.expression = expression;
    }

    if (req.body?.sourceTopic !== undefined) {
      const sourceTopic = String(req.body.sourceTopic || '').trim();
      if (!sourceTopic) return res.status(400).json({ error: 'sourceTopic cannot be empty' });
      updates.sourceTopic = sourceTopic;
    }

    if (req.body?.targetTopic !== undefined) {
      const targetTopic = String(req.body.targetTopic || '').trim();
      if (!targetTopic) return res.status(400).json({ error: 'targetTopic cannot be empty' });
      updates.targetTopic = targetTopic;
    }

    if (req.body?.version !== undefined) {
      const version = Number(req.body.version);
      if (!Number.isInteger(version) || version < 1) return res.status(400).json({ error: 'version must be >=1' });
      updates.version = version;
    }

    if (req.body?.status !== undefined) {
      const status = req.body.status;
      if (status !== 'draft' && status !== 'active' && status !== 'deprecated') {
        return res.status(400).json({ error: 'status must be draft|active|deprecated' });
      }
      updates.status = status;
    }

    if (req.body?.description !== undefined) {
      updates.description = String(req.body.description || '');
    }

    if (req.body?.sourceSchemaId !== undefined) {
      const id = toNumberOrNull(req.body.sourceSchemaId);
      updates.sourceSchemaId = id ?? undefined;
    }

    if (req.body?.targetSchemaId !== undefined) {
      const id = toNumberOrNull(req.body.targetSchemaId);
      updates.targetSchemaId = id ?? undefined;
    }

    if (req.body?.updatedBy !== undefined) {
      updates.updatedBy = String(req.body.updatedBy || '').trim() || undefined;
    }

    const doc = await JsonataTransform.findOneAndUpdate(
      { _id, workspaceId: toId(req.params.id) },
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).lean().exec();

    if (!doc) return res.status(404).json({ error: 'transform not found' });

    log.info({ jsonataTransformId: _id, workspaceId: req.params.id }, 'jsonata transform updated');
    res.json(doc);
  });

  router.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    log.error({ err }, 'unhandled error');
    res.status(500).json({ error: 'internal error' });
  });

  return router;
}
