import mongoose, { Connection, Model, Document } from 'mongoose';
import { getWorkspaceModel } from './workspace';

export interface SessionDocument extends Document<string> {
  _id: string; // sessionId (UUID)
  workspaceId: string;
  principalId: string;
  principalType: 'client' | 'user';
  scopes: string[];
  topics?: string[];
  context?: any;
  status: 'active' | 'revoked';
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export const sessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  workspaceId: { type: String, required: true, ref: 'Workspace', index: true },
  principalId: { type: String, required: true },
  principalType: { type: String, enum: ['client', 'user'], required: true, index: true },
  scopes: { type: [String], default: [] },
  topics: { type: [String], default: [] },
  context: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['active', 'revoked'], default: 'active', index: true },
  expiresAt: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

sessionSchema.virtual('workspace', {
  ref: 'Workspace',
  localField: 'workspaceId',
  foreignField: '_id',
  justOne: true
});

export function getSessionModel(connection: Connection): Model<SessionDocument> {
  getWorkspaceModel(connection);
  return (connection.models.Session as Model<SessionDocument>) ||
    connection.model<SessionDocument>('Session', sessionSchema);
}

export const Session: Model<SessionDocument> = (mongoose.models.Session as Model<SessionDocument>) ||
  mongoose.model<SessionDocument>('Session', sessionSchema);
