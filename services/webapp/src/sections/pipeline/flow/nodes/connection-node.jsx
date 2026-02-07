'use client';

import { Handle, Position } from 'reactflow';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { getNodeStyle } from './shared-node-styles';

export function ConnectionNode({ data }) {
  const { connectionName } = data;

  return (
    <Card sx={getNodeStyle('connection')}>
      <Handle type="target" position={Position.Left} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
          Connection
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {connectionName}
        </Typography>
      </Box>
    </Card>
  );
}
