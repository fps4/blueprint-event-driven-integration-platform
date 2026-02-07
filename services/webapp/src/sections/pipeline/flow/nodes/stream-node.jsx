'use client';

import { Handle, Position } from 'reactflow';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { getNodeStyle } from './shared-node-styles';

export function StreamNode({ data }) {
  const { streamName, variant } = data;
  
  // Color mapping for different variants
  const getChipColor = (variantType) => {
    switch (variantType) {
      case 'source':
        return 'success';
      case 'sink':
        return 'info';
      case 'dlq':
        return 'error';
      case 'replay':
        return 'warning';
      default:
        return 'default';
    }
  };

  const chipColor = getChipColor(variant);

  return (
    <Card sx={getNodeStyle('stream')}>
      <Handle type="target" position={Position.Left} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
          Stream
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {streamName}
        </Typography>
        <Chip label={variant} size="small" color={chipColor} />
      </Box>
      <Handle type="source" position={Position.Right} />
    </Card>
  );
}
