'use client';

import { Handle, Position } from 'reactflow';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

import { getNodeStyle } from './shared-node-styles';

export function SinkConnectorNode({ data }) {
  const { connectorType, description } = data;

  return (
    <Card sx={getNodeStyle('sinkConnector')}>
      <Handle type="target" position={Position.Left} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
          Sink Connector
        </Typography>
        <Chip label={connectorType} size="small" color="info" />
        {description && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.7rem' }}>
            {description}
          </Typography>
        )}
      </Box>
      <Handle type="source" position={Position.Right} />
    </Card>
  );
}
