import mongoose, { Connection, Model, Document } from 'mongoose';

export type PipelineStatus = 'draft' | 'active' | 'paused' | 'failed';

export interface StreamDefinition {
  topic: string;
  type: 'source' | 'sink' | 'dlq' | 'replay';
  description?: string;
}

export interface ClientConfigRef {
  clientId: string;
  role: 'source' | 'sink';
  connectorType?: 'S3' | 'HTTP';
  streamName?: string;
  description?: string;
}

export interface ConnectionConfigRef {
  connectionId: string;
  connectorType: 'S3' | 'HTTP';
  streamName?: string;
  description?: string;
}

export interface TransformConfig {
  type: 'JSONata';
  sourceStream: string;
  targetStream: string;
  failureQueue?: string;
  expression: string;
  description?: string;
}

export interface NodePositions {
  [nodeId: string]: { x: number; y: number };
}

export interface PipelineDocument extends Document<string> {
  _id: string;
  workspaceId: string;
  name: string;
  code: string;
  description?: string;
  status: PipelineStatus;
  streams: StreamDefinition[];
  sourceClients: ClientConfigRef[];
  sinkConnections: ConnectionConfigRef[];
  transform?: TransformConfig;
  nodePositions?: NodePositions;
  createdAt?: Date;
  updatedAt?: Date;
}

const streamDefinitionSchema = new mongoose.Schema({
  topic: { type: String, required: true, trim: true },
  type: { type: String, enum: ['source', 'sink', 'dlq', 'replay'], required: true },
  description: { type: String }
}, { _id: false });

const clientConfigRefSchema = new mongoose.Schema({
  clientId: { type: String, required: true, trim: true },
  role: { type: String, enum: ['source', 'sink'], required: true },
  connectorType: { type: String, enum: ['S3', 'HTTP'] },
  streamName: { type: String, trim: true },
  description: { type: String }
}, { _id: false });

const connectionConfigRefSchema = new mongoose.Schema({
  connectionId: { type: String, required: true, trim: true },
  connectorType: { type: String, enum: ['S3', 'HTTP'], required: true },
  streamName: { type: String, trim: true },
  description: { type: String }
}, { _id: false });

const transformConfigSchema = new mongoose.Schema({
  type: { type: String, enum: ['JSONata'], required: true },
  sourceStream: { type: String, required: true, trim: true },
  targetStream: { type: String, required: true, trim: true },
  failureQueue: { type: String, trim: true },
  expression: { type: String, required: true, trim: true },
  description: { type: String }
}, { _id: false });

export const pipelineSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  workspaceId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, length: 4 },
  description: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'active', 'paused', 'failed'], default: 'draft', index: true },
  streams: { type: [streamDefinitionSchema], default: [] },
  sourceClients: { type: [clientConfigRefSchema], default: [] },
  sinkConnections: { type: [connectionConfigRefSchema], default: [] },
  transform: { type: transformConfigSchema, default: null },
  nodePositions: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export function getPipelineModel(connection: Connection): Model<PipelineDocument> {
  return (connection.models.Pipeline as Model<PipelineDocument>) ||
    connection.model<PipelineDocument>('Pipeline', pipelineSchema);
}

export const Pipeline: Model<PipelineDocument> = (mongoose.models.Pipeline as Model<PipelineDocument>) ||
  mongoose.model<PipelineDocument>('Pipeline', pipelineSchema);
