'use client';

import 'reactflow/dist/style.css';

import { useMemo, useState, useCallback, useEffect } from 'react';
import ReactFlow, { MiniMap, Controls, Background, useNodesState, useEdgesState } from 'reactflow';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { updatePipeline } from 'src/api/pipeline';

import { StreamNode, AddStreamNode, ClientNode, SourceConnectorNode, AddSourceConnectorNode, ConnectionNode, SinkConnectorNode, AddSinkConnectorNode, TransformationNode, AddTransformationNode } from './nodes';
import { AddStreamDialog } from './add-stream-dialog';
import { AddSourceConnectorDialog } from './add-source-connector-dialog';
import { AddSinkConnectorDialog } from './add-sink-connector-dialog';
import { AddTransformationDialog } from './add-transformation-dialog';

const nodeTypes = {
  addStream: AddStreamNode,
  stream: StreamNode,
  client: ClientNode,
  sourceConnector: SourceConnectorNode,
  addSourceConnector: AddSourceConnectorNode,
  connection: ConnectionNode,
  sinkConnector: SinkConnectorNode,
  addSinkConnector: AddSinkConnectorNode,
  transformation: TransformationNode,
  addTransformation: AddTransformationNode,
};

const NODE_VERTICAL_SPACING = 150;
const BUTTON_ROW_Y = 20; // Y position for top button row
const CONTENT_START_Y = 150; // Y position where actual content starts (after buttons)

// Column X positions aligned with "Add" buttons
const COLUMNS = {
  SOURCE_CONNECTOR: 50,    // Aligned with "Add Source Connector" button at x:50
  STREAM: 280,             // Aligned with "Add Stream" button at x:280
  TRANSFORMATION: 510,     // Aligned with "Add Transformation" button at x:510
  SINK_CONNECTOR: 740,     // Aligned with "Add Sink Connector" button at x:740
  CLIENT: -180,            // Before source connectors (left of SOURCE_CONNECTOR)
  CONNECTION: 970,         // After sink connectors (right of SINK_CONNECTOR)
};

export function PipelineFlow({ pipelineId, pipeline }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [connectorDialogOpen, setConnectorDialogOpen] = useState(false);
  const [sinkDialogOpen, setSinkDialogOpen] = useState(false);
  const [transformDialogOpen, setTransformDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [nodePositions, setNodePositions] = useState({});

  // Extract stream names from pipeline.streams (assuming streams have topic field)
  const existingStreams = useMemo(() => {
    if (!Array.isArray(pipeline?.streams)) return [];
    
    // Return array of { streamName, variant } objects
    return pipeline.streams.map((stream) => {
      if (stream?.topic) {
        const parts = stream.topic.split('.');
        if (parts.length >= 5) {
          // Format: env.workspace_code.pipeline_code.stream.variant
          const variant = parts[parts.length - 1]; // last part is variant (source/sink)
          const streamName = parts.slice(3, -1).join('.'); // everything after pipeline_code and before variant
          return { streamName, variant, type: stream.type };
        }
      }
      return null;
    }).filter(Boolean);
  }, [pipeline]);

  // Extract source connectors from pipeline.sourceClients
  const sourceConnectors = useMemo(() => {
    if (!Array.isArray(pipeline?.sourceClients)) return [];
    return pipeline.sourceClients;
  }, [pipeline]);

  // Extract sink connectors from pipeline.sinkConnections
  const sinkConnectors = useMemo(() => {
    if (!Array.isArray(pipeline?.sinkConnections)) return [];
    return pipeline.sinkConnections;
  }, [pipeline]);

  // Extract transformation from pipeline.transform
  const transformation = useMemo(() => {
    return pipeline?.transform || null;
  }, [pipeline]);

  // Load saved node positions from pipeline
  useEffect(() => {
    console.log('Loading node positions from pipeline:', pipeline?.nodePositions);
    if (pipeline?.nodePositions) {
      setNodePositions(pipeline.nodePositions);
    }
  }, [pipeline]);

  // Helper function to get node position (saved or default)
  const getNodePosition = useCallback((nodeId, defaultPosition) => {
    return nodePositions[nodeId] || defaultPosition;
  }, [nodePositions]);

  // Build initial nodes array
  const initialNodes = useMemo(() => {
    const result = [];
    
    // Check if streams exist to determine if other functions should be disabled
    const hasStreams = existingStreams.length > 0;
    
    // Add action buttons at the top in a row (left to right) - these should NOT be draggable
    // 1. Add Source Connector (left)
    result.push({
      id: 'add-source-connector',
      type: 'addSourceConnector',
      position: { x: 50, y: BUTTON_ROW_Y },
      draggable: false,
      data: {
        onClick: () => setConnectorDialogOpen(true),
        disabled: !hasStreams,
      },
    });

    // 2. Add Stream (center-left)
    result.push({
      id: 'add-stream',
      type: 'addStream',
      position: { x: 280, y: BUTTON_ROW_Y },
      draggable: false,
      data: {
        onClick: () => setDialogOpen(true),
      },
    });

    // 3. Add Transformation (center-right)
    result.push({
      id: 'add-transformation',
      type: 'addTransformation',
      position: { x: 510, y: BUTTON_ROW_Y },
      draggable: false,
      data: {
        onClick: () => setTransformDialogOpen(true),
        disabled: !hasStreams,
      },
    });

    // 4. Add Sink Connector (right)
    result.push({
      id: 'add-sink-connector',
      type: 'addSinkConnector',
      position: { x: 740, y: BUTTON_ROW_Y },
      draggable: false,
      data: {
        onClick: () => setSinkDialogOpen(true),
        disabled: !hasStreams,
      },
    });
    
    // Simple column-based layout
    let clientY = CONTENT_START_Y;
    let sourceConnectorY = CONTENT_START_Y;
    let streamY = CONTENT_START_Y;
    let transformationY = CONTENT_START_Y;
    let sinkConnectorY = CONTENT_START_Y;
    let connectionY = CONTENT_START_Y;
    
    // Add all source connectors with their clients in their columns
    sourceConnectors.forEach((connector) => {
      const uniqueId = `${connector.clientId}-${connector.streamName || connector.clientId}`;
      
      // Client node in CLIENT column
      const clientNodeId = `client-${uniqueId}`;
      result.push({
        id: clientNodeId,
        type: 'client',
        position: getNodePosition(clientNodeId, { x: COLUMNS.CLIENT, y: clientY }),
        data: {
          clientName: connector.clientName || connector.clientId,
        },
      });
      clientY += NODE_VERTICAL_SPACING;
      
      // Source connector node in SOURCE_CONNECTOR column
      const sourceConnectorNodeId = `source-connector-${uniqueId}`;
      result.push({
        id: sourceConnectorNodeId,
        type: 'sourceConnector',
        position: getNodePosition(sourceConnectorNodeId, { x: COLUMNS.SOURCE_CONNECTOR, y: sourceConnectorY }),
        data: {
          connectorType: connector.connectorType,
          description: connector.description,
        },
      });
      sourceConnectorY += NODE_VERTICAL_SPACING;
    });
    
    // Add all streams in STREAM column (under Add Stream button)
    existingStreams.forEach((stream) => {
      const streamNodeId = `stream-${stream.streamName}-${stream.variant}`;
      result.push({
        id: streamNodeId,
        type: 'stream',
        position: getNodePosition(streamNodeId, { x: COLUMNS.STREAM, y: streamY }),
        data: {
          streamName: stream.streamName,
          variant: stream.variant,
        },
      });
      streamY += NODE_VERTICAL_SPACING;
    });
    
    // Add transformation if it exists in TRANSFORMATION column (under Add Transformation button)
    if (transformation) {
      const transformationNodeId = 'transformation';
      result.push({
        id: transformationNodeId,
        type: 'transformation',
        position: getNodePosition(transformationNodeId, { x: COLUMNS.TRANSFORMATION, y: transformationY }),
        data: {
          type: transformation.type,
          sourceStream: transformation.sourceStream,
          targetStream: transformation.targetStream,
          failureQueue: transformation.failureQueue,
          description: transformation.description,
        },
      });
    }
    
    // Add all sink connectors with their connections in their columns
    sinkConnectors.forEach((connector) => {
      const uniqueId = `${connector.connectionId}-${connector.streamName || connector.connectionId}`;
      
      // Sink connector node in SINK_CONNECTOR column
      const sinkConnectorNodeId = `sink-connector-${uniqueId}`;
      result.push({
        id: sinkConnectorNodeId,
        type: 'sinkConnector',
        position: getNodePosition(sinkConnectorNodeId, { x: COLUMNS.SINK_CONNECTOR, y: sinkConnectorY }),
        data: {
          connectorType: connector.connectorType,
          description: connector.description,
        },
      });
      sinkConnectorY += NODE_VERTICAL_SPACING;
      
      // Connection node in CONNECTION column
      const connectionNodeId = `connection-${uniqueId}`;
      result.push({
        id: connectionNodeId,
        type: 'connection',
        position: getNodePosition(connectionNodeId, { x: COLUMNS.CONNECTION, y: connectionY }),
        data: {
          connectionName: connector.connectionName || connector.connectionId,
        },
      });
      connectionY += NODE_VERTICAL_SPACING;
    });

    return result;
  }, [existingStreams, sourceConnectors, sinkConnectors, transformation, getNodePosition]);

  // Use ReactFlow's node state management
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  
  // Update nodes when initialNodes change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Build edges array to connect client -> connector -> stream and stream -> sink connector -> connection
  const edges = useMemo(() => {
    const result = [];
    
    console.log('=== EDGE BUILDING DEBUG ===');
    console.log('transformation object:', transformation);
    console.log('existingStreams:', existingStreams);
    
    // Connect each client to its connector
    sourceConnectors.forEach((connector, index) => {
      // Create unique ID using clientId + streamName
      const uniqueId = `${connector.clientId}-${connector.streamName || index}`;
      
      result.push({
        id: `edge-client-${uniqueId}`,
        source: `client-${uniqueId}`,
        target: `source-connector-${uniqueId}`,
        animated: true,
      });
      
      // Connect connector to its specific source stream (if streamName is specified)
      if (connector.streamName) {
        result.push({
          id: `edge-connector-${uniqueId}-${connector.streamName}`,
          source: `source-connector-${uniqueId}`,
          target: `stream-${connector.streamName}-source`,
          animated: false,
        });
      }
    });
    
    // Connect each sink stream to its sink connector and connection
    sinkConnectors.forEach((connector, index) => {
      // Create unique ID using connectionId + streamName
      const uniqueId = `${connector.connectionId}-${connector.streamName || index}`;
      
      // Connect sink stream to sink connector (if streamName is specified)
      if (connector.streamName) {
        result.push({
          id: `edge-stream-${connector.streamName}-${uniqueId}`,
          source: `stream-${connector.streamName}-sink`,
          target: `sink-connector-${uniqueId}`,
          animated: false,
        });
      }
      
      // Connect sink connector to connection
      result.push({
        id: `edge-sink-${uniqueId}`,
        source: `sink-connector-${uniqueId}`,
        target: `connection-${uniqueId}`,
        animated: true,
      });
    });
    
    // Connect transformation if it exists
    if (transformation && transformation.sourceStream && transformation.targetStream) {
      // Find the actual source and target streams to get their variants
      const sourceStream = existingStreams.find(
        (s) => s.streamName === transformation.sourceStream && s.variant === 'source'
      );
      // For target stream, prefer sink variant, but fallback to any variant if not found
      const targetStream = existingStreams.find(
        (s) => s.streamName === transformation.targetStream && s.variant === 'sink'
      ) || existingStreams.find(
        (s) => s.streamName === transformation.targetStream && s.variant !== 'source'
      );
      
      console.log('Transformation:', transformation);
      console.log('Existing streams:', existingStreams);
      console.log('Found source stream:', sourceStream);
      console.log('Found target stream:', targetStream);
      
      if (sourceStream) {
        // Source stream -> Transformation
        result.push({
          id: 'edge-transform-source',
          source: `stream-${sourceStream.streamName}-${sourceStream.variant}`,
          target: 'transformation',
          animated: true,
        });
        console.log('Added edge from source to transformation');
      }
      
      if (targetStream) {
        // Transformation -> Target stream
        result.push({
          id: 'edge-transform-target',
          source: 'transformation',
          target: `stream-${targetStream.streamName}-${targetStream.variant}`,
          animated: true,
        });
        console.log('Added edge from transformation to target');
      }
      
      // Connect to failure queue if specified
      if (transformation.failureQueue) {
        const failureStream = existingStreams.find(
          (s) => s.streamName === transformation.failureQueue && s.variant === 'dlq'
        );
        if (failureStream) {
          result.push({
            id: 'edge-transform-failure',
            source: 'transformation',
            target: `stream-${failureStream.streamName}-${failureStream.variant}`,
            animated: true,
            style: { stroke: '#ff0000', strokeDasharray: '5,5' },
          });
        }
      }
    }
    
    return result;
  }, [sourceConnectors, sinkConnectors, transformation, existingStreams]);

  const handleAddStream = useCallback(
    async (streamName, streamType) => {
      if (!pipelineId || !pipeline?.workspaceId) {
        setError('Pipeline or workspace ID missing');
        return;
      }

      if (!pipeline?.workspaceCode || !pipeline?.code) {
        setError('Pipeline or workspace code missing');
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const env = 'dev'; // TODO: derive from context
        const workspaceCode = pipeline.workspaceCode;
        const pipelineCode = pipeline.code;

        // Create one topic entry with the selected type
        const newStream = {
          topic: `${env}.${workspaceCode}.${pipelineCode}.${streamName}.${streamType}`,
          type: streamType,
          description: `${streamType.charAt(0).toUpperCase() + streamType.slice(1)} topic for ${streamName}`,
        };

        const updatedStreams = [...(pipeline.streams || []), newStream];

        await updatePipeline(pipelineId, {
          workspaceId: pipeline.workspaceId,
          streams: updatedStreams,
        });

        // Trigger parent to refetch pipeline data
        window.location.reload(); // Simple approach for MVP; ideally use state management
      } catch (err) {
        console.error('Failed to add stream:', err);
        setError(err?.message || 'Failed to add stream');
      } finally {
        setSaving(false);
      }
    },
    [pipelineId, pipeline]
  );

  const handleAddSourceConnector = useCallback(
    async (connectorData) => {
      if (!pipelineId || !pipeline?.workspaceId) {
        setError('Pipeline or workspace ID missing');
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const newSourceClient = {
          clientId: connectorData.clientId,
          role: 'source',
          connectorType: connectorData.connectorType,
          streamName: connectorData.streamName,
          description: connectorData.description || '',
        };

        const updatedSourceClients = [...(pipeline.sourceClients || []), newSourceClient];

        await updatePipeline(pipelineId, {
          workspaceId: pipeline.workspaceId,
          sourceClients: updatedSourceClients,
        });

        // Trigger parent to refetch pipeline data
        window.location.reload(); // Simple approach for MVP; ideally use state management
      } catch (err) {
        console.error('Failed to add source connector:', err);
        setError(err?.message || 'Failed to add source connector');
      } finally {
        setSaving(false);
      }
    },
    [pipelineId, pipeline]
  );

  const handleAddSinkConnector = useCallback(
    async (connectorData) => {
      if (!pipelineId || !pipeline?.workspaceId) {
        setError('Pipeline or workspace ID missing');
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const newSinkConnection = {
          connectionId: connectorData.connectionId,
          connectorType: connectorData.connectorType,
          streamName: connectorData.streamName,
          description: connectorData.description || '',
        };

        const updatedSinkConnections = [...(pipeline.sinkConnections || []), newSinkConnection];

        await updatePipeline(pipelineId, {
          workspaceId: pipeline.workspaceId,
          sinkConnections: updatedSinkConnections,
        });

        // Trigger parent to refetch pipeline data
        window.location.reload(); // Simple approach for MVP; ideally use state management
      } catch (err) {
        console.error('Failed to add sink connector:', err);
        setError(err?.message || 'Failed to add sink connector');
      } finally {
        setSaving(false);
      }
    },
    [pipelineId, pipeline]
  );

  const handleAddTransformation = useCallback(
    async (transformData) => {
      if (!pipelineId || !pipeline?.workspaceId) {
        setError('Pipeline or workspace ID missing');
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const newTransform = {
          type: transformData.type,
          sourceStream: transformData.sourceStream,
          targetStream: transformData.targetStream,
          failureQueue: transformData.failureQueue || null,
          expression: transformData.expression,
          description: transformData.description || '',
        };

        await updatePipeline(pipelineId, {
          workspaceId: pipeline.workspaceId,
          transform: newTransform,
        });

        // Trigger parent to refetch pipeline data
        window.location.reload(); // Simple approach for MVP; ideally use state management
      } catch (err) {
        console.error('Failed to add transformation:', err);
        setError(err?.message || 'Failed to add transformation');
      } finally {
        setSaving(false);
      }
    },
    [pipelineId, pipeline]
  );

  // Handle node drag end - save positions to backend
  const handleNodeDragStop = useCallback(
    (event, node) => {
      if (pipelineId && pipeline?.workspaceId) {
        const updatedPositions = { ...nodePositions, [node.id]: node.position };
        
        console.log('Saving node position:', node.id, node.position);
        console.log('All positions:', updatedPositions);
        
        // Update local state immediately
        setNodePositions(updatedPositions);
        
        // Save to backend immediately (no debounce for now to debug)
        updatePipeline(pipelineId, {
          workspaceId: pipeline.workspaceId,
          nodePositions: updatedPositions,
        }).then(() => {
          console.log('Position saved successfully!');
        }).catch((err) => {
          console.error('Failed to save node positions:', err);
        });
      }
    },
    [pipelineId, pipeline, nodePositions]
  );

  if (!pipeline) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 600, position: 'relative' }}>
      {error && (
        <Alert severity="error" sx={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10 }}>
          {error}
        </Alert>
      )}
      {saving && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.7)',
            zIndex: 20,
          }}
        >
          <CircularProgress />
        </Box>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={handleNodeDragStop}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
        nodesDraggable={true}
        nodesConnectable={false}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      <AddStreamDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={handleAddStream}
        env="dev"
        workspaceCode={pipeline?.workspaceCode || ''}
        pipelineCode={pipeline?.code || ''}
      />
      <AddSourceConnectorDialog
        open={connectorDialogOpen}
        onClose={() => setConnectorDialogOpen(false)}
        onAdd={handleAddSourceConnector}
        sourceStreams={existingStreams.filter((s) => s.variant === 'source')}
      />
      <AddSinkConnectorDialog
        open={sinkDialogOpen}
        onClose={() => setSinkDialogOpen(false)}
        onAdd={handleAddSinkConnector}
        sinkStreams={existingStreams.filter((s) => s.variant === 'sink')}
      />
      <AddTransformationDialog
        open={transformDialogOpen}
        onClose={() => setTransformDialogOpen(false)}
        onAdd={handleAddTransformation}
        sourceStreams={existingStreams.filter((s) => s.variant === 'source')}
        sinkStreams={existingStreams.filter((s) => s.variant === 'sink')}
        dlqStreams={existingStreams.filter((s) => s.variant === 'dlq')}
      />
    </Box>
  );
}
