'use client';

import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { getPipeline } from 'src/api/pipeline';
import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { PipelineFlow } from '../flow';

export function PipelineDetailsView({ pipelineId }) {
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getPipeline(pipelineId, controller.signal)
      .then((item) => setPipeline(item))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        setError(err?.message || 'Failed to load pipeline');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [pipelineId]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={pipeline?.name ? `${pipeline.name}` : 'Pipeline'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Pipelines', href: paths.dashboard.pipeline.root },
          { name: pipeline?.name ? `${pipeline.name} ${pipeline.code ? `(${pipeline.code})` : ''}` : 'Details' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Card sx={{ minHeight: 400, p: 0, overflow: 'hidden' }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            Loading pipeline...
          </Typography>
        ) : (
          <PipelineFlow pipelineId={pipelineId} pipeline={pipeline} />
        )}
      </Card>
    </DashboardContent>
  );
}
