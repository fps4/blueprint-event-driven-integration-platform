import mongoose, { Connection, Model, Document } from 'mongoose';

export type JsonataTransformStatus = 'draft' | 'active' | 'deprecated';

export interface JsonataTransformDocument extends Document<string> {
  _id: string;
  workspaceId: string;
  name: string;
  description?: string;
  version: number;
  expression: string;
  sourceTopic: string;
  targetTopic: string;
  sourceSchemaId?: number;
  targetSchemaId?: number;
  status: JsonataTransformStatus;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const jsonataTransformSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  workspaceId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  version: { type: Number, required: true, min: 1 },
  expression: { type: String, required: true },
  sourceTopic: { type: String, required: true },
  targetTopic: { type: String, required: true },
  sourceSchemaId: { type: Number },
  targetSchemaId: { type: Number },
  status: { type: String, enum: ['draft', 'active', 'deprecated'], default: 'draft', index: true },
  createdBy: { type: String },
  updatedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export function getJsonataTransformModel(connection: Connection): Model<JsonataTransformDocument> {
  return (connection.models.JsonataTransform as Model<JsonataTransformDocument>) ||
    connection.model<JsonataTransformDocument>('JsonataTransform', jsonataTransformSchema);
}

export const JsonataTransform: Model<JsonataTransformDocument> =
  (mongoose.models.JsonataTransform as Model<JsonataTransformDocument>) ||
  mongoose.model<JsonataTransformDocument>('JsonataTransform', jsonataTransformSchema);
