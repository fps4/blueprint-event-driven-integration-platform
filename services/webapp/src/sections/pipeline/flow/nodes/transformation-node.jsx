'use client';

import { Handle, Position } from 'reactflow';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

import { getNodeStyle } from './shared-node-styles';

export function TransformationNode({ data }) {
  const { type, sourceStream, targetStream, description } = data;

  return (
    <Card sx={getNodeStyle('transformation')}>
      <Handle type="target" position={Position.Left} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
          Transformation
        </Typography>
        <Chip label={type?.toUpperCase() || 'JSONATA'} size="small" color="warning" />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            {sourceStream} → {targetStream}
          </Typography>
        </Box>
        {description && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.65rem' }}>
            {description}
          </Typography>
        )}
      </Box>
      <Handle type="source" position={Position.Right} />
    </Card>
  );
}
