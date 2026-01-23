import mongoose, { Connection, Model, Document } from 'mongoose';

export type NotificationChannel = 'slack' | 'email';
export type NotificationStatus = 'queued' | 'sent' | 'failed';

export interface NotificationTargetSlack { channelId: string }
export interface NotificationTargetEmail { to: string[]; cc?: string[]; bcc?: string[] }

export interface NotificationDocument extends Document {
  channel: NotificationChannel;
  type: string; // e.g., 'form.submitted'
  correlationId: string;
  tenantId?: string | null; // optional; tenant is implied by DB
  contactId?: string | null;
  target?: { slack?: NotificationTargetSlack; email?: NotificationTargetEmail };
  payload?: any; // provider-agnostic snapshot (minimal; avoid PII where possible)
  status: NotificationStatus;
  error?: { code?: string; message?: string } | null;
  createdAt?: Date;
  updatedAt?: Date;
  deliveredAt?: Date | null;
}

export const notificationSchema = new mongoose.Schema({
  channel: { type: String, enum: ['slack', 'email'], required: true, index: true },
  type: { type: String, required: true, maxlength: 64, index: true },
  correlationId: { type: String, required: true, index: true },
  tenantId: { type: String, required: false, index: true },
  contactId: { type: String, required: false, index: true, default: null },
  target: {
    slack: { channelId: { type: String, required: false } },
    email: {
      to: { type: [String], default: [] },
      cc: { type: [String], default: [] },
      bcc: { type: [String], default: [] }
    }
  },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued', index: true },
  error: { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date, default: null }
});

export function getNotificationModel(connection: Connection): Model<NotificationDocument> {
  if (!connection) throw new Error('connection is required');
  return (
    connection.models.Notification as Model<NotificationDocument>
  ) || connection.model<NotificationDocument>('Notification', notificationSchema);
}

export const Notification: Model<NotificationDocument> =
  (mongoose.models.Notification as Model<NotificationDocument>) ||
  mongoose.model<NotificationDocument>('Notification', notificationSchema);
