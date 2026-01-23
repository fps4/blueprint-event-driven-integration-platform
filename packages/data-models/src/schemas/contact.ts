import mongoose, { Connection, Model, Document } from 'mongoose';

export type ContactStatus = 'active' | 'invited' | 'inactive' | 'deleted';
export type ContactRole = 'admin' | 'member' | 'agent' | 'viewer';

export interface ContactDocument extends Document {
  // System _id is kept as the primary identifier (ObjectId)
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  company?: string | null;
  role?: ContactRole;
  status?: ContactStatus;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  tags?: string[];
  attributes?: Record<string, any> | null; // arbitrary user attributes for future use
  source?: string | null; // where this user came from (e.g., 'form', 'import', 'api')
  lastSeenAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export const contactSchema = new mongoose.Schema({
  email: { type: String, required: false, lowercase: true, trim: true },
  phone: { type: String, required: false, trim: true, index: true },
  name: { type: String, required: false, trim: true, maxlength: 256 },
  company: { type: String, required: false, trim: true, maxlength: 256 },
  role: { type: String, enum: ['admin', 'member', 'agent', 'viewer'], default: 'member', index: true },
  status: { type: String, enum: ['active', 'invited', 'inactive', 'deleted'], default: 'active', index: true },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  tags: { type: [String], default: [] },
  attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
  source: { type: String, required: false, trim: true, maxlength: 64 },
  lastSeenAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Enforce unique email per tenant DB; allow multiple docs without email/empty
contactSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string', $ne: '' } } }
);

export function getContactModel(connection: Connection): Model<ContactDocument> {
  if (!connection) throw new Error('connection is required');
  return (connection.models.Contact as Model<ContactDocument>) || connection.model<ContactDocument>('Contact', contactSchema);
}

export const Contact: Model<ContactDocument> =
  (mongoose.models.Contact as Model<ContactDocument>) ||
  mongoose.model<ContactDocument>('Contact', contactSchema);
