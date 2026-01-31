'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { listWorkspaces } from 'src/api/workspace';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export function WorkspaceListView() {
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
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
    <Card key={ws.id} sx={{ minWidth: 240 }}>
      <CardActionArea
        onClick={() => setSelectedId(ws.id)}
        data-active={selectedId === ws.id ? '' : undefined}
        sx={{
          height: '100%',
          '&[data-active]': {
            backgroundColor: 'action.selected',
            '&:hover': {
              backgroundColor: 'action.selectedHover',
            },
          },
        }}
      >
        <CardContent sx={{ height: '100%' }}>
          <Stack spacing={1}>
            <Typography variant="h4">{ws.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              Status: {ws.status || 'unknown'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {ws.allowedOrigins?.length
                ? `${ws.allowedOrigins.length} allowed origin(s)`
                : 'No allowed origins'}
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );

  const empty = !loading && !workspaces.length;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Workspaces"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Workspaces', href: paths.dashboard.workspace.root },
        ]}
        action={
          <Button 
            component={RouterLink} 
            href={paths.dashboard.workspace.new} 
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            >
            Add Workspace
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Box
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
          gap: 3,
        }}
      >
        {workspaces.map(renderCard)}
        {empty && (
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                No workspaces yet.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </DashboardContent>
  );
}
