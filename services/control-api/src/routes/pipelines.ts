import { randomUUID } from 'crypto';
import { Router } from 'express';
import { makeModels } from '@event-streaming-platform/data-models';
import { getConnection } from '../lib/db.js';
import { log, toId } from './helpers.js';

export function pipelineRoutes() {
  const router = Router({ mergeParams: true });

  router.get('/pipelines', async (_req, res) => {
    const conn = await getConnection();
    const { Pipeline } = makeModels(conn);
    const items = await Pipeline.find({}).lean().exec();
    res.json({ items });
  });

  router.get('/pipelines/:pipelineId', async (req, res) => {
    const conn = await getConnection();
    const { Pipeline } = makeModels(conn);
    const _id = toId(req.params.pipelineId);
    if (!_id) return res.status(400).json({ error: 'pipelineId is required' });
    
    const doc = await Pipeline.findOne({ _id }).lean().exec();
    if (!doc) return res.status(404).json({ error: 'pipeline not found' });
    
    res.json(doc);
  });

  router.post('/pipelines', async (req, res) => {
    const conn = await getConnection();
    const { Pipeline } = makeModels(conn);
    const _id = req.body?.id || req.body?._id || randomUUID();
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });
    const workspaceId = toId(req.body?.workspaceId);
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    const doc = await Pipeline.create({
      _id,
      workspaceId,
      name,
      description: req.body?.description || '',
      status: (req.body?.status || 'draft') as unknown,
      streams: Array.isArray(req.body?.streams) ? req.body.streams : [],
      sourceClients: Array.isArray(req.body?.sourceClients) ? req.body.sourceClients : [],
      sinkClients: Array.isArray(req.body?.sinkClients) ? req.body.sinkClients : [],
      transform: req.body?.transform || null
    });
    log.info({ pipelineId: _id, workspaceId }, 'pipeline created');
    res.status(201).json(doc);
  });

  router.put('/pipelines/:pipelineId', async (req, res) => {
    const conn = await getConnection();
    const { Pipeline } = makeModels(conn);
    const _id = toId(req.params.pipelineId);
    if (!_id) return res.status(400).json({ error: 'pipelineId is required' });
    const workspaceId = toId(req.body?.workspaceId);
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    const updates: Record<string, unknown> = {};

    if (req.body?.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ error: 'name cannot be empty' });
      updates.name = name;
    }

    if (req.body?.description !== undefined) {
      updates.description = String(req.body.description || '');
    }

    if (req.body?.status !== undefined) {
      const status = req.body.status;
      if (status !== 'draft' && status !== 'active' && status !== 'paused' && status !== 'failed') {
        return res.status(400).json({ error: 'status must be draft|active|paused|failed' });
      }
      updates.status = status;
    }

    if (req.body?.streams !== undefined) {
      if (!Array.isArray(req.body.streams)) return res.status(400).json({ error: 'streams must be an array' });
      updates.streams = req.body.streams;
    }

    if (req.body?.sourceClients !== undefined) {
      if (!Array.isArray(req.body.sourceClients)) return res.status(400).json({ error: 'sourceClients must be an array' });
      updates.sourceClients = req.body.sourceClients;
    }

    if (req.body?.sinkClients !== undefined) {
      if (!Array.isArray(req.body.sinkClients)) return res.status(400).json({ error: 'sinkClients must be an array' });
      updates.sinkClients = req.body.sinkClients;
    }

    if (req.body?.transform !== undefined) {
      updates.transform = req.body.transform || null;
    }

    const doc = await Pipeline.findOneAndUpdate(
      { _id, workspaceId },
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).lean().exec();

    if (!doc) return res.status(404).json({ error: 'pipeline not found' });

    log.info({ pipelineId: _id, workspaceId }, 'pipeline updated');
    res.json(doc);
  });

  return router;
}
