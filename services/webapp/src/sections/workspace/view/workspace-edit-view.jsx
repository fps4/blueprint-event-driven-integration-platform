'use client';

import { useEffect, useState } from 'react';

import { useParams } from 'src/routes/hooks';
import { DashboardContent } from 'src/layouts/dashboard';

import { WorkspaceForm } from '../components/workspace-form';
import { getWorkspace } from 'src/api/workspace';

// ----------------------------------------------------------------------

export function WorkspaceEditView() {
  const params = useParams();
  const { id } = params || {};

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    if (!id) return;
    setLoading(true);
    setError('');
    getWorkspace(id, controller.signal)
      .then((res) => setWorkspace(res))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        setError(err?.message || 'Failed to load workspace');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id]);

  if (loading) {
    return (
      <DashboardContent>
        <p>Loading workspace...</p>
      </DashboardContent>
    );
  }

  if (error) {
    return (
      <DashboardContent>
        <p>{error}</p>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <h2>Edit workspace</h2>
      <WorkspaceForm currentWorkspace={workspace} />
    </DashboardContent>
  );
}
