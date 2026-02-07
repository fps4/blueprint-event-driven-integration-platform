'use client';

import { Handle, Position } from 'reactflow';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import Typography from '@mui/material/Typography';

export function AddSinkConnectorNode({ data }) {
  const isDisabled = data?.disabled || false;

  const handleClick = (e) => {
    e.stopPropagation();
    if (!isDisabled && data?.onClick) {
      data.onClick();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        minWidth: 220,
        borderRadius: 2,
        border: '2px dashed',
        borderColor: isDisabled ? 'action.disabledBackground' : 'divider',
        bgcolor: isDisabled ? 'action.disabledBackground' : 'background.paper',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        '&:hover': isDisabled ? {} : {
          borderColor: 'info.main',
          bgcolor: 'action.hover',
        },
      }}
      onClick={handleClick}
    >
      <IconButton 
        color="info" 
        size="large" 
        onClick={handleClick}
        disabled={isDisabled}
      >
        <AddCircleOutlineIcon fontSize="large" />
      </IconButton>
      <Typography variant="body2" color={isDisabled ? 'text.disabled' : 'text.secondary'} onClick={handleClick}>
        Add Sink Connector
      </Typography>
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </Box>
  );
}
