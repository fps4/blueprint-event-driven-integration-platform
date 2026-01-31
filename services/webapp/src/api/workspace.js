'use client';

import axiosInstance from 'src/lib/axios';

export async function listWorkspaces(signal) {
  const res = await axiosInstance.get('/api/workspaces', { signal });
  const items = Array.isArray(res.data?.items) ? res.data.items : [];
  return items.map((ws) => ({
    id: ws._id ?? ws.id,
    name: ws.name ?? 'Untitled workspace',
    status: ws.status ?? 'unknown',
    allowedOrigins: Array.isArray(ws.allowedOrigins) ? ws.allowedOrigins : [],
  }));
}

export async function getWorkspace(id, signal) {
  if (!id) throw new Error('Workspace id is required');
  const res = await axiosInstance.get(`/api/workspaces/${id}`, { signal });
  const ws = res.data;
  return {
    id: ws._id ?? ws.id,
    name: ws.name ?? 'Untitled workspace',
    status: ws.status ?? 'unknown',
    allowedOrigins: Array.isArray(ws.allowedOrigins) ? ws.allowedOrigins : [],
  };
}

export async function createWorkspace(payload) {
  const res = await axiosInstance.post('/api/workspaces', payload);
  return res.data;
}

export async function updateWorkspace(id, payload) {
  if (!id) throw new Error('Workspace id is required');
  const res = await axiosInstance.put(`/api/workspaces/${id}`, payload);
  return res.data;
}
