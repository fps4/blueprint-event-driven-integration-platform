'use client';

import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { getPipeline } from 'src/api/pipeline';
import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

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
        heading={pipeline?.name || 'Pipeline'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Pipelines', href: paths.dashboard.pipeline.root },
          { name: pipeline?.name || 'Details' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Card sx={{ minHeight: 400, p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading pipeline...
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Pipeline form placeholder
          </Typography>
        )}
      </Card>
    </DashboardContent>
  );
}
