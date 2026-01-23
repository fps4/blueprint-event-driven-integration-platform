import mongoose, { Connection, Model, Document } from 'mongoose';
import { getWorkspaceModel } from './workspace';

export interface ClientDocument extends Document<string> {
  _id: string;
  workspaceId: string;
  name?: string;
  status: 'active' | 'inactive';
  secretHash: string;
  secretSalt?: string | null;
  allowedScopes: string[];
  allowedTopics?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export const clientSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  workspaceId: { type: String, required: true, ref: 'Workspace', index: true },
  name: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  secretHash: { type: String, required: true },
  secretSalt: { type: String, default: null },
  allowedScopes: { type: [String], default: [] },
  allowedTopics: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

clientSchema.virtual('workspace', {
  ref: 'Workspace',
  localField: 'workspaceId',
  foreignField: '_id',
  justOne: true
});

export function getClientModel(connection: Connection): Model<ClientDocument> {
  // Ensure Workspace model is registered for population
  getWorkspaceModel(connection);
  return (connection.models.Client as Model<ClientDocument>) ||
    connection.model<ClientDocument>('Client', clientSchema);
}

export const Client: Model<ClientDocument> = (mongoose.models.Client as Model<ClientDocument>) ||
  mongoose.model<ClientDocument>('Client', clientSchema);
