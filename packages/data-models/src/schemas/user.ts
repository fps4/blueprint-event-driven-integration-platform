import mongoose, { Connection, Model, Document } from 'mongoose';
import { getWorkspaceModel } from './workspace';

export interface UserDocument extends Document<string> {
  _id: string;
  workspaceId: string;
  username: string;
  passwordHash?: string | null;
  passwordSalt?: string | null;
  roles: string[];
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  workspaceId: { type: String, required: true, ref: 'Workspace', index: true },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, default: null },
  passwordSalt: { type: String, default: null },
  roles: { type: [String], default: [] },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.virtual('workspace', {
  ref: 'Workspace',
  localField: 'workspaceId',
  foreignField: '_id',
  justOne: true
});

export function getUserModel(connection: Connection): Model<UserDocument> {
  getWorkspaceModel(connection);
  return (connection.models.User as Model<UserDocument>) ||
    connection.model<UserDocument>('User', userSchema);
}

export const User: Model<UserDocument> = (mongoose.models.User as Model<UserDocument>) ||
  mongoose.model<UserDocument>('User', userSchema);
