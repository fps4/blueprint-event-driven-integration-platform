'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

import { listConnections } from 'src/api/connection';

const CONNECTOR_TYPES = ['HTTP', 'S3'];

export function AddSinkConnectorDialog({ open, onClose, onAdd, sinkStreams }) {
  const [connectionId, setConnectionId] = useState('');
  const [streamName, setStreamName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  useEffect(() => {
    if (open) {
      const controller = new AbortController();
      setLoadingConnections(true);
      listConnections(controller.signal)
        .then((items) => setConnections(items))
        .catch((err) => {
          if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
          console.error('Failed to load connections:', err);
        })
        .finally(() => setLoadingConnections(false));
      return () => controller.abort();
    }
  }, [open]);

  const handleAdd = () => {
    if (!streamName) {
      setError('Stream is required');
      return;
    }
    if (!connectionId) {
      setError('Connection is required');
      return;
    }

    const selectedConnection = connections.find((c) => c.id === connectionId);

    onAdd({
      connectionId,
      connectionName: selectedConnection?.name || connectionId,
      connectorType: selectedConnection?.type || 'HTTP',
      streamName,
      description: description.trim(),
    });
    handleClose();
  };

  const handleClose = () => {
    setConnectionId('');
    setStreamName('');
    setDescription('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Sink Connector</DialogTitle>
      <DialogContent>
        {loadingConnections ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              select
              label="Stream (Sink)"
              value={streamName}
              onChange={(e) => setStreamName(e.target.value)}
              fullWidth
              required
              helperText="Select a sink stream to deliver data to this connection"
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
              label="Connection"
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              fullWidth
              required
            >
              {connections.map((connection) => (
                <MenuItem key={connection.id} value={connection.id}>
                  {connection.name} ({connection.type})
                </MenuItem>
              ))}
            </TextField>

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
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained" disabled={loadingConnections}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
