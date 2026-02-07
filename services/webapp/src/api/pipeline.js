'use client';

import axiosInstance from 'src/lib/axios';

export async function listPipelines(signal) {
  try {
    const res = await axiosInstance.get('/api/pipelines', { signal });
    const items = Array.isArray(res.data?.items) ? res.data.items : [];
    return items.map((p) => ({
      id: p._id ?? p.id,
      code: p.code ?? '',
      name: p.name ?? 'Untitled pipeline',
      status: p.status ?? 'unknown',
      description: p.description ?? '',
      workspaceId: p.workspaceId ?? '',
      sourceTopic: p.sourceTopic ?? '',
      targetTopic: p.targetTopic ?? '',
    }));
  } catch (err) {
    if (err?.response?.status === 404) {
      return [];
    }
    throw err;
  }
}

export async function createPipeline(payload) {
  const res = await axiosInstance.post('/api/pipelines', payload);
  return res.data;
}

export async function updatePipeline(id, payload) {
  if (!id) throw new Error('Pipeline id is required');
  const res = await axiosInstance.put(`/api/pipelines/${id}`, payload);
  return res.data;
}

export async function getPipeline(id, signal) {
  if (!id) throw new Error('Pipeline id is required');
  try {
    const res = await axiosInstance.get(`/api/pipelines/${id}`, { signal });
    const p = res.data ?? {};
    return {
      id: p._id ?? p.id ?? id,
      code: p.code ?? '',
      name: p.name ?? 'Untitled pipeline',
      status: p.status ?? 'unknown',
      description: p.description ?? '',
      workspaceId: p.workspaceId ?? p.workspace ?? '',
      workspaceCode: p.workspaceCode ?? '',
      streams: Array.isArray(p.streams) ? p.streams : [],
      sourceClients: Array.isArray(p.sourceClients) ? p.sourceClients : [],
      sinkConnections: Array.isArray(p.sinkConnections) ? p.sinkConnections : [],
      transform: p.transform || null,
      nodePositions: p.nodePositions || {},
      sourceTopic: p.sourceTopic,
      targetTopic: p.targetTopic,
    };
  } catch (err) {
    if (err?.response?.status === 404) {
      throw new Error('Pipeline not found');
    }
    throw err;
  }
}
