'use client';

import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { RouterLink } from 'src/routes/components';

import { listWorkspaces } from 'src/api/workspace';
import { DashboardContent } from 'src/layouts/dashboard';
import { paths } from 'src/routes/paths';

export function WorkspaceListView() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listWorkspaces(controller.signal)
      .then((items) => setWorkspaces(items))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        setError(err?.message || 'Failed to load workspaces');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const renderCard = (ws) => (
    <Grid item key={ws.id} xs={12} sm={6} md={4}>
      <Card>
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="subtitle1">{ws.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              Status: {ws.status || 'unknown'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {ws.allowedOrigins?.length
                ? `${ws.allowedOrigins.length} allowed origin(s)`
                : 'No allowed origins'}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                component={RouterLink}
                href={paths.dashboard.workspace.edit(ws.id)}
              >
                Edit
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );

  const empty = !loading && !workspaces.length;

  return (
    <DashboardContent>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: { xs: 3, md: 5 } }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h4">Workspaces</Typography>
          <Typography variant="body2" color="text.secondary">
            Browse and manage workspaces. Actions coming soon.
          </Typography>
        </Stack>
        <Button component={RouterLink} href={paths.dashboard.workspace.new} variant="contained">
          Create workspace
        </Button>
      </Stack>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Grid container spacing={3}>
        {workspaces.map(renderCard)}
        {empty && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  No workspaces yet.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </DashboardContent>
  );
}
