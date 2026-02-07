'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

const TRANSFORMATION_TYPES = [
  { value: 'jsonata', label: 'JSONata' },
];

export function AddTransformationDialog({ open, onClose, onAdd, sourceStreams, sinkStreams, dlqStreams }) {
  const [type, setType] = useState('jsonata');
  const [sourceStream, setSourceStream] = useState('');
  const [targetStream, setTargetStream] = useState('');
  const [failureQueue, setFailureQueue] = useState('');
  const [expression, setExpression] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    if (!type) {
      setError('Type is required');
      return;
    }
    if (!sourceStream) {
      setError('Source stream is required');
      return;
    }
    if (!targetStream) {
      setError('Target stream is required');
      return;
    }
    if (!expression.trim()) {
      setError('Expression is required');
      return;
    }

    onAdd({
      type,
      sourceStream,
      targetStream,
      failureQueue: failureQueue || null,
      expression: expression.trim(),
      description: description.trim(),
    });
    handleClose();
  };

  const handleClose = () => {
    setType('jsonata');
    setSourceStream('');
    setTargetStream('');
    setFailureQueue('');
    setExpression('');
    setDescription('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Transformation</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            fullWidth
            required
            helperText="Select the transformation type"
          >
            {TRANSFORMATION_TYPES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Source Stream"
            value={sourceStream}
            onChange={(e) => setSourceStream(e.target.value)}
            fullWidth
            required
            helperText="Select the input stream (source variant)"
          >
            {sourceStreams && sourceStreams.length > 0 ? (
              sourceStreams.map((stream) => (
                <MenuItem key={stream.streamName} value={stream.streamName}>
                  {stream.streamName}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>No source streams available</MenuItem>
            )}
          </TextField>

          <TextField
            select
            label="Target Stream"
            value={targetStream}
            onChange={(e) => setTargetStream(e.target.value)}
            fullWidth
            required
            helperText="Select the output stream (sink variant)"
          >
            {sinkStreams && sinkStreams.length > 0 ? (
              sinkStreams.map((stream) => (
                <MenuItem key={stream.streamName} value={stream.streamName}>
                  {stream.streamName}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>No sink streams available</MenuItem>
            )}
          </TextField>

          <TextField
            select
            label="Failure Queue (optional)"
            value={failureQueue}
            onChange={(e) => setFailureQueue(e.target.value)}
            fullWidth
            helperText="Select the DLQ stream for failed transformations"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {dlqStreams && dlqStreams.length > 0 ? (
              dlqStreams.map((stream) => (
                <MenuItem key={stream.streamName} value={stream.streamName}>
                  {stream.streamName}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>No DLQ streams available</MenuItem>
            )}
          </TextField>

          <TextField
            label="Jsonata Expression"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            fullWidth
            required
            multiline
            rows={6}
            placeholder='{ "result": $.data, "timestamp": $now() }'
            helperText="Enter the Jsonata transformation expression"
          />

          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />

          {error && (
            <Box sx={{ color: 'error.main', fontSize: '0.875rem' }}>
              {error}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained">
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
