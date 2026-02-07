// Shared style configuration for all pipeline nodes

export const NODE_DIMENSIONS = {
  width: 220,
  height: 100,
  borderRadius: 2,
  borderWidth: 2,
  padding: 2,
};

export const NODE_COLORS = {
  client: {
    border: 'success.main',
    background: 'background.paper',
  },
  sourceConnector: {
    border: 'success.light',
    background: 'background.paper',
  },
  stream: {
    border: 'primary.main',
    background: 'background.paper',
  },
  transformation: {
    border: 'warning.main',
    background: 'background.paper',
  },
  sinkConnector: {
    border: 'info.light',
    background: 'background.paper',
  },
  connection: {
    border: 'info.main',
    background: 'background.paper',
  },
};

export const getNodeStyle = (nodeType) => ({
  minWidth: NODE_DIMENSIONS.width,
  minHeight: NODE_DIMENSIONS.height,
  padding: NODE_DIMENSIONS.padding,
  borderRadius: NODE_DIMENSIONS.borderRadius,
  border: NODE_DIMENSIONS.borderWidth,
  borderColor: NODE_COLORS[nodeType]?.border || 'divider',
  bgcolor: NODE_COLORS[nodeType]?.background || 'background.paper',
});
