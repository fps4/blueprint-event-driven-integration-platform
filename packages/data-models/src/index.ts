export { workspaceSchema, getWorkspaceModel, Workspace, type WorkspaceDocument } from './schemas/workspace';
export { clientSchema, getClientModel, Client, type ClientDocument } from './schemas/client';
export { userSchema, getUserModel, User, type UserDocument } from './schemas/user';
export { sessionSchema, getSessionModel, Session, type SessionDocument } from './schemas/session';
export { notificationSchema, getNotificationModel, Notification, type NotificationDocument, type NotificationChannel, type NotificationStatus } from './schemas/notification';
export { contactSchema, getContactModel, Contact, type ContactDocument, type ContactRole, type ContactStatus } from './schemas/contact';
export { jsonataTransformSchema, getJsonataTransformModel, JsonataTransform, type JsonataTransformDocument, type JsonataTransformStatus } from './schemas/jsonata-transform';

import type { Connection } from 'mongoose';
import { getWorkspaceModel } from './schemas/workspace';
import { getClientModel } from './schemas/client';
import { getUserModel } from './schemas/user';
import { getSessionModel } from './schemas/session';
import { getNotificationModel } from './schemas/notification';
import { getContactModel } from './schemas/contact';
import { getJsonataTransformModel } from './schemas/jsonata-transform';

export const makeModels = (conn: Connection) => ({
  Workspace: getWorkspaceModel(conn),
  Client: getClientModel(conn),
  User: getUserModel(conn),
  Session: getSessionModel(conn),
  Notification: getNotificationModel(conn),
  Contact: getContactModel(conn),
  JsonataTransform: getJsonataTransformModel(conn)
});

export type Models = {
  Workspace: ReturnType<typeof getWorkspaceModel>;
  Client: ReturnType<typeof getClientModel>;
  User: ReturnType<typeof getUserModel>;
  Session: ReturnType<typeof getSessionModel>;
  Notification: ReturnType<typeof getNotificationModel>;
  Contact: ReturnType<typeof getContactModel>;
  JsonataTransform: ReturnType<typeof getJsonataTransformModel>;
};
