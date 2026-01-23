import mongoose, { Connection, Model, Document } from 'mongoose';

export interface WorkspaceDocument extends Document<string> {
  _id: string;
  name: string;
  status: 'active' | 'inactive';
  allowedOrigins?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export const workspaceSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  allowedOrigins: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export function getWorkspaceModel(connection: Connection): Model<WorkspaceDocument> {
  return (connection.models.Workspace as Model<WorkspaceDocument>) ||
    connection.model<WorkspaceDocument>('Workspace', workspaceSchema);
}

export const Workspace: Model<WorkspaceDocument> = (mongoose.models.Workspace as Model<WorkspaceDocument>) ||
  mongoose.model<WorkspaceDocument>('Workspace', workspaceSchema);
