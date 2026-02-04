'use client';

import { useMemo, useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { DataGrid, gridClasses, GridToolbarQuickFilter } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { listPipelines } from 'src/api/pipeline';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export function PipelineListView() {
  const router = useRouter();
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listPipelines(controller.signal)
      .then((items) => setPipelines(items))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        setError(err?.message || 'Failed to load pipelines');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const columns = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
      },
      {
        field: 'sourceTopic',
        headerName: 'Source',
        flex: 1,
        minWidth: 160,
      },
      {
        field: 'targetTopic',
        headerName: 'Target',
        flex: 1,
        minWidth: 160,
      },
    ],
    []
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Pipelines"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Pipelines', href: paths.dashboard.pipeline.root },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.pipeline.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            Add Pipeline
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Card>
        <DataGrid
          autoHeight
          rows={pipelines}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          onRowDoubleClick={(params) => router.push(paths.dashboard.pipeline.flow(params.row.id))}
          pageSizeOptions={[5, 10, 20, { value: -1, label: 'All' }]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          slots={{
            toolbar: GridToolbarQuickFilter,
            noRowsOverlay: () => <EmptyContent title="No pipelines" />,
            noResultsOverlay: () => <EmptyContent title="No results found" />,
          }}
          sx={{ [`& .${gridClasses.cell}`]: { alignItems: 'center' } }}
        />
      </Card>
    </DashboardContent>
  );
}
