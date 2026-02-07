import { randomUUID } from 'crypto';
import { Router } from 'express';
import { makeModels } from '@event-streaming-platform/data-models';
import { getConnection } from '../lib/db.js';
import { log, toId } from './helpers.js';
import { generateUniqueCode } from '../lib/code-generator.js';

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
    const { Pipeline, Workspace, Client, Connection } = makeModels(conn);
    const _id = toId(req.params.pipelineId);
    if (!_id) return res.status(400).json({ error: 'pipelineId is required' });
    
    const doc = await Pipeline.findOne({ _id }).lean().exec();
    if (!doc) return res.status(404).json({ error: 'pipeline not found' });
    
    // Fetch workspace to get its code
    const workspace = await Workspace.findOne({ _id: doc.workspaceId }).lean().exec();
    
    // Fetch client names for sourceClients
    const allClientIds = [
      ...(doc.sourceClients || []).map((c: any) => c.clientId),
    ].filter(Boolean);
    
    const clients = allClientIds.length > 0
      ? await Client.find({ _id: { $in: allClientIds } }).lean().exec()
      : [];
    
    const clientMap = new Map(clients.map((c: any) => [c._id, c.name]));
    
    // Fetch connection names for sinkConnections
    const allConnectionIds = [
      ...(doc.sinkConnections || []).map((c: any) => c.connectionId),
    ].filter(Boolean);
    
    const connections = allConnectionIds.length > 0
      ? await Connection.find({ _id: { $in: allConnectionIds } }).lean().exec()
      : [];
    
    const connectionMap = new Map(connections.map((c: any) => [c._id, c.name]));
    
    // Enrich sourceClients with client names
    const enrichedSourceClients = (doc.sourceClients || []).map((sc: any) => ({
      ...sc,
      clientName: clientMap.get(sc.clientId) || sc.clientId,
    }));
    
    // Enrich sinkConnections with connection names
    const enrichedSinkConnections = (doc.sinkConnections || []).map((sc: any) => ({
      ...sc,
      connectionName: connectionMap.get(sc.connectionId) || sc.connectionId,
    }));
    
    const response = {
      ...doc,
      workspaceCode: workspace?.code || '',
      sourceClients: enrichedSourceClients,
      sinkConnections: enrichedSinkConnections,
      nodePositions: doc.nodePositions || {},
    };
    
    res.json(response);
  });

  router.post('/pipelines', async (req, res) => {
    const conn = await getConnection();
    const { Pipeline } = makeModels(conn);
    const _id = req.body?.id || req.body?._id || randomUUID();
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });
    const workspaceId = toId(req.body?.workspaceId);
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    const code = await generateUniqueCode(Pipeline);
    const doc = await Pipeline.create({
      _id,
      workspaceId,
      name,
      code,
      description: req.body?.description || '',
      status: (req.body?.status || 'draft') as unknown,
      streams: Array.isArray(req.body?.streams) ? req.body.streams : [],
      sourceClients: Array.isArray(req.body?.sourceClients) ? req.body.sourceClients : [],
      sinkConnections: Array.isArray(req.body?.sinkConnections) ? req.body.sinkConnections : [],
      transform: req.body?.transform || null
    });
    log.info({ pipelineId: _id, workspaceId, code }, 'pipeline created');
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
      log.info({ sourceClients: req.body.sourceClients }, 'Updating sourceClients');
      updates.sourceClients = req.body.sourceClients;
    }

    if (req.body?.sinkConnections !== undefined) {
      if (!Array.isArray(req.body.sinkConnections)) return res.status(400).json({ error: 'sinkConnections must be an array' });
      updates.sinkConnections = req.body.sinkConnections;
    }

    if (req.body?.transform !== undefined) {
      updates.transform = req.body.transform || null;
    }

    if (req.body?.nodePositions !== undefined) {
      updates.nodePositions = req.body.nodePositions || {};
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
