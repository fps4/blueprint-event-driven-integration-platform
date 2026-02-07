'use client';

import { useState } from 'react';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

const STREAM_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const MAX_STREAM_NAME_LENGTH = 100; // Conservative, considering full topic will be <env>.<workspace_code>.<pipeline_code>.<stream>.<variant>

const STREAM_TYPES = [
  { value: 'source', label: 'Source' },
  { value: 'sink', label: 'Sink' },
  { value: 'dlq', label: 'DLQ (Dead Letter Queue)' },
  { value: 'replay', label: 'Replay' },
];

export function AddStreamDialog({ open, onClose, onAdd, env, workspaceCode, pipelineCode }) {
  const [streamName, setStreamName] = useState('');
  const [streamType, setStreamType] = useState('source');
  const [error, setError] = useState('');

  const validateStreamName = (name) => {
    if (!name || name.trim().length === 0) {
      return 'Stream name is required';
    }
    if (name.length > MAX_STREAM_NAME_LENGTH) {
      return `Stream name must be ${MAX_STREAM_NAME_LENGTH} characters or less`;
    }
    if (!STREAM_NAME_REGEX.test(name)) {
      return 'Stream name can only contain: a-z, A-Z, 0-9, . _ -';
    }
    return '';
  };

  const handleAdd = () => {
    const validationError = validateStreamName(streamName);
    if (validationError) {
      setError(validationError);
      return;
    }

    onAdd(streamName.trim(), streamType);
    setStreamName('');
    setStreamType('source');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setStreamName('');
    setStreamType('source');
    setError('');
    onClose();
  };

  const handleNameChange = (e) => {
    setStreamName(e.target.value);
    if (error) {
      setError('');
    }
  };

  const handleTypeChange = (e) => {
    setStreamType(e.target.value);
  };

  const topic = `${env}.${workspaceCode}.${pipelineCode}.${streamName || '<name>'}.${streamType}`;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Stream</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Stream Name"
          type="text"
          fullWidth
          value={streamName}
          onChange={handleNameChange}
          error={!!error}
          helperText={error || 'Allowed characters: a-z, A-Z, 0-9, . _ -'}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAdd();
            }
          }}
        />
        <TextField
          select
          margin="dense"
          label="Stream Type"
          fullWidth
          value={streamType}
          onChange={handleTypeChange}
          sx={{ mt: 2 }}
        >
          {STREAM_TYPES.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          This will create one topic:
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontFamily: 'monospace' }}>
          • {topic}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained" disabled={!streamName.trim()}>
          Add Stream
        </Button>
      </DialogActions>
    </Dialog>
  );
}
